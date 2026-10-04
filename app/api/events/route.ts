import { NextRequest } from "next/server";
import { validateRequest } from "@/app/_lib/request-auth";
import { cacheBackend } from "@/app/_lib/cache";
import { isWithin, toRelative } from "@/app/_lib/cache/scopes";
import type { DiskChange } from "@/app/_lib/cache/types";
import { isWatching } from "@/app/_lib/disk-watch";
import { LiveEvent } from "@/app/_lib/live-events";
import { userRoot } from "@/app/_lib/storage";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

const SCOPE = "live-events";
const HEARTBEAT_MS = 25_000;
const RETRY_MS = 5_000;
const MAX_STREAMS_PER_USER = 10;

const globalStore = globalThis as typeof globalThis & {
  __liveStreams?: Map<string, number>;
};

const _streams = (): Map<string, number> => {
  globalStore.__liveStreams ??= new Map();
  return globalStore.__liveStreams;
};

const _claimSlot = (username: string): boolean => {
  const open = _streams().get(username) ?? 0;
  if (open >= MAX_STREAMS_PER_USER) return false;

  _streams().set(username, open + 1);
  return true;
};

const _freeSlot = (username: string): void => {
  const remaining = (_streams().get(username) ?? 1) - 1;
  if (remaining > 0) _streams().set(username, remaining);
  else _streams().delete(username);
};

const STREAM_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
  "X-Accel-Buffering": "no",
};

const _frame = (event: LiveEvent): string => `event: ${event}\ndata: {}\n\n`;

const _concerns = (change: DiskChange, rootRelative: string): boolean =>
  change.everything ||
  change.paths.some((entry) => isWithin(entry, rootRelative));

export const GET = async (request: NextRequest) => {
  const user = await validateRequest(request);
  if (!user) return new Response("Unauthorized", { status: 401 });

  if (!_claimSlot(user.username)) {
    logger.warn(SCOPE, `Too many live streams for ${user.username}`);
    return new Response("Too many open streams", { status: 429 });
  }

  isWatching();

  const rootRelative = toRelative(userRoot(user));
  const encoder = new TextEncoder();
  let hangUp = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start: (controller) => {
      let isClosed = false;

      const send = (chunk: string) => {
        if (isClosed) return;

        try {
          controller.enqueue(encoder.encode(chunk));
        } catch (error) {
          logger.debug(SCOPE, "Stream already closed", error);
          hangUp();
        }
      };

      const unlisten = cacheBackend().listen((change) => {
        if (_concerns(change, rootRelative)) send(_frame(LiveEvent.CHANGE));
      });

      const recheck = async () => {
        try {
          const current = await validateRequest(request);
          const isSameScope =
            current?.username === user.username &&
            toRelative(userRoot(current)) === rootRelative;

          if (isSameScope) return send(": ping\n\n");
          hangUp();
        } catch (error) {
          logger.warn(SCOPE, "Session recheck failed, closing stream", error);
          hangUp();
        }
      };

      const heartbeat = setInterval(recheck, HEARTBEAT_MS);

      hangUp = () => {
        if (isClosed) return;
        isClosed = true;
        _freeSlot(user.username);
        clearInterval(heartbeat);
        unlisten();

        try {
          controller.close();
        } catch (error) {
          logger.debug(SCOPE, "Stream close skipped", error);
        }
      };

      request.signal.addEventListener("abort", () => hangUp(), { once: true });
      send(`retry: ${RETRY_MS}\n${_frame(LiveEvent.READY)}`);
    },

    cancel: () => hangUp(),
  });

  return new Response(stream, { headers: STREAM_HEADERS });
};
