import "server-only";

import { createHash } from "crypto";
import { cacheBackend } from "@/app/_lib/cache";
import { ALL_SCOPE } from "@/app/_lib/cache/scopes";
import { isWatching } from "@/app/_lib/disk-watch";
import { logger } from "@/app/_lib/logger";

const SCOPE = "pensieve";
const WATCHED_TTL_SECONDS = 15 * 60;
const FALLBACK_TTL_SECONDS = 60;

const _keyFor = (name: string, args: unknown[], epochs: string[]): string =>
  `${name}:${createHash("sha256")
    .update(JSON.stringify([args, epochs]))
    .digest("base64url")}`;

const _ttl = (): number =>
  isWatching() ? WATCHED_TTL_SECONDS : FALLBACK_TTL_SECONDS;

export const pensieve = async <T>(
  name: string,
  args: unknown[],
  scopes: string[],
  compute: () => Promise<T>
): Promise<T> => {
  const backend = cacheBackend();
  let key: string;

  try {
    key = _keyFor(name, args, await backend.epochs([ALL_SCOPE, ...scopes]));
    const hit = await backend.read(key);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch (error) {
    logger.warn(SCOPE, `Cache read failed for ${name}`, error);
    return compute();
  }

  const value = await compute();

  backend.write(key, JSON.stringify(value), _ttl()).catch((error) => {
    logger.warn(SCOPE, `Cache write failed for ${name}`, error);
  });

  return value;
};
