import "server-only";

import { FSWatcher, mkdirSync, watch } from "fs";
import { TEMP_DIR_NAME, UPLOAD_DIR } from "@/app/_lib/storage";
import { cacheBackend } from "@/app/_lib/cache";
import { ALL_SCOPE, scopesFor } from "@/app/_lib/cache/scopes";
import { logger } from "@/app/_lib/logger";

const SCOPE = "disk-watch";
const FLUSH_DELAY_MS = 250;
const RETRY_DELAY_MS = 5_000;
const MAX_BATCH_PATHS = 500;

interface WatchState {
  watcher: FSWatcher | null;
  failed: boolean;
  pending: Set<string>;
  overflow: boolean;
  timer: NodeJS.Timeout | null;
}

const globalStore = globalThis as typeof globalThis & {
  __diskWatch?: WatchState;
};

const _state = (): WatchState => {
  globalStore.__diskWatch ??= {
    watcher: null,
    failed: false,
    pending: new Set(),
    overflow: false,
    timer: null,
  };
  return globalStore.__diskWatch;
};

const _isTempEntry = (relative: string): boolean =>
  relative === TEMP_DIR_NAME || relative.startsWith(`${TEMP_DIR_NAME}/`);

const _schedule = (delayMs: number): void => {
  const state = _state();

  state.timer ??= setTimeout(() => {
    flushChanges().catch((error) =>
      logger.error(SCOPE, "Change flush crashed", error)
    );
  }, delayMs);
};

const _requeue = (paths: string[], everything: boolean): void => {
  const state = _state();

  if (everything) state.overflow = true;
  for (const relative of paths) state.pending.add(relative);

  if (state.pending.size > MAX_BATCH_PATHS) {
    state.pending.clear();
    state.overflow = true;
  }

  _schedule(RETRY_DELAY_MS);
};

export const flushChanges = async (): Promise<void> => {
  const state = _state();
  if (state.timer) clearTimeout(state.timer);
  state.timer = null;

  const paths = [...state.pending];
  const everything = state.overflow;
  state.pending.clear();
  state.overflow = false;

  if (paths.length === 0 && !everything) return;

  const scopes = everything ? [ALL_SCOPE] : [...new Set(paths.flatMap(scopesFor))];
  const backend = cacheBackend();

  try {
    await backend.bump(scopes);
  } catch (error) {
    logger.warn(SCOPE, "Failed to invalidate cached listings, retrying", error);
    _requeue(paths, everything);
  }

  await backend.announce({ paths: everything ? [] : paths, everything });
};

export const recordChange = (relatives: string[]): void => {
  const state = _state();

  for (const relative of relatives) {
    if (_isTempEntry(relative)) continue;
    state.pending.add(relative);
  }

  if (state.pending.size > MAX_BATCH_PATHS) {
    state.pending.clear();
    state.overflow = true;
  }

  if (state.pending.size === 0 && !state.overflow) return;

  _schedule(FLUSH_DELAY_MS);
};

const _onEvent = (_event: string, filename: string | null): void => {
  if (filename === null) {
    _state().overflow = true;
    recordChange([]);
    return;
  }

  recordChange([filename.split("\\").join("/")]);
};

const _reset = (error: unknown): void => {
  const state = _state();
  logger.warn(SCOPE, "Upload dir watcher stopped, falling back to TTL", error);
  state.watcher?.close();
  state.watcher = null;
  state.failed = true;
};

const heimdall = (state: WatchState): void => {
  try {
    mkdirSync(UPLOAD_DIR, { recursive: true });
    state.watcher = watch(UPLOAD_DIR, { recursive: true }, _onEvent);
    state.watcher.on("error", _reset);
    logger.info(SCOPE, `Watching ${UPLOAD_DIR} for outside changes`);
  } catch (error) {
    _reset(error);
  }
};

export const isWatching = (): boolean => {
  const state = _state();
  if (!state.watcher && !state.failed) heimdall(state);
  return !!state.watcher;
};
