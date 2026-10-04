import "server-only";

import type { CacheBackend } from "@/app/_lib/cache/types";
import { memoryBackend } from "@/app/_lib/cache/memory";
import { valkeyBackend } from "@/app/_lib/cache/valkey";
import { envOrFile } from "@/app/_lib/env";
import { logger } from "@/app/_lib/logger";

const SCOPE = "cache";
const DEFAULT_PREFIX = "scatola:";

const globalStore = globalThis as typeof globalThis & {
  __cacheBackend?: CacheBackend;
};

const _create = (): CacheBackend => {
  const url = envOrFile("VALKEY_URL");

  if (!url) {
    logger.info(SCOPE, "Using in-memory cache");
    return memoryBackend();
  }

  logger.info(SCOPE, "Using Valkey cache");
  return valkeyBackend(url, process.env.VALKEY_PREFIX || DEFAULT_PREFIX);
};

export const cacheBackend = (): CacheBackend => {
  globalStore.__cacheBackend ??= _create();
  return globalStore.__cacheBackend;
};
