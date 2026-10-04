import "server-only";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { lock } from "proper-lockfile";

const LOCK_OPTIONS = {
  retries: { retries: 20, minTimeout: 25, maxTimeout: 500 },
  stale: 10_000,
};

const _queues = new Map<string, Promise<unknown>>();

const _isMissing = (error: unknown): boolean =>
  (error as NodeJS.ErrnoException)?.code === "ENOENT";

export const readJson = async <T>(file: string, fallback: T): Promise<T> => {
  let content: string;

  try {
    content = await fs.readFile(file, "utf-8");
  } catch (error) {
    if (_isMissing(error)) return fallback;
    throw error;
  }

  if (!content.trim()) return fallback;

  return JSON.parse(content) as T;
};

export const writeJson = async <T>(file: string, data: T): Promise<void> => {
  await fs.mkdir(path.dirname(file), { recursive: true });

  const tmpFile = `${file}.${crypto.randomBytes(6).toString("hex")}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmpFile, file);
};

const _ensureFile = async <T>(file: string, fallback: T): Promise<void> => {
  try {
    await fs.access(file);
  } catch {
    await writeJson(file, fallback);
  }
};

const _serialize = <R>(file: string, task: () => Promise<R>): Promise<R> => {
  const previous = _queues.get(file) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  _queues.set(file, next);

  return next.finally(() => {
    if (_queues.get(file) === next) _queues.delete(file);
  });
};

export const updateJson = <T, R = void>(
  file: string,
  fallback: T,
  mutate: (data: T) => R | Promise<R>
): Promise<R> =>
  _serialize(file, async () => {
    await _ensureFile(file, fallback);
    const release = await lock(file, LOCK_OPTIONS);

    try {
      const data = await readJson<T>(file, fallback);
      const result = await mutate(data);
      await writeJson(file, data);
      return result;
    } finally {
      await release();
    }
  });
