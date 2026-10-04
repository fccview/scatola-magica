import "server-only";

import { NextRequest } from "next/server";

const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_MS = 15 * 60 * 1000;
const MAX_TRACKED = 10_000;

interface Attempt {
  count: number;
  until: number;
}

const _attempts = new Map<string, Attempt>();

export const isBruteForceEnabled = (): boolean =>
  process.env.BRUTEFORCE_PROTECTION === "true";

export const clientIp = (request: NextRequest): string =>
  request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
  request.headers.get("x-real-ip") ||
  "unknown";

const _prune = (now: number): void => {
  if (_attempts.size < MAX_TRACKED) return;

  for (const [key, entry] of _attempts) {
    if (entry.until && entry.until < now) _attempts.delete(key);
  }
};

export const isLockedOut = (key: string): boolean => {
  const entry = _attempts.get(key);
  if (!entry?.until) return false;
  if (Date.now() < entry.until) return true;

  _attempts.delete(key);
  return false;
};

export const recordFailure = (key: string): void => {
  const now = Date.now();
  _prune(now);

  const entry = _attempts.get(key) ?? { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= LOCKOUT_THRESHOLD) entry.until = now + LOCKOUT_MS;

  _attempts.set(key, entry);
};

export const clearFailures = (key: string): void => {
  _attempts.delete(key);
};
