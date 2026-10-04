import "server-only";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { logger } from "@/app/_lib/logger";

const SCOPE = "chunk-writer";
const PBKDF2_ITERATIONS = 600000;
const KEY_LENGTH = 32;
const MAX_CACHED_KEYS = 16;
const CROSS_DEVICE = "EXDEV";

const keyCache = new Map<string, Promise<Buffer>>();

const _derive = (password: string, salt: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha256", (err, key) =>
      err ? reject(err) : resolve(key)
    );
  });

const _trimCache = (): void => {
  while (keyCache.size > MAX_CACHED_KEYS) {
    const oldest = keyCache.keys().next().value;
    if (oldest === undefined) return;
    keyCache.delete(oldest);
  }
};

export const vaultKey = (password: string, salt: Buffer): Promise<Buffer> => {
  const id = crypto
    .createHash("sha256")
    .update(password)
    .update(salt)
    .digest("hex");

  const cached = keyCache.get(id);
  if (cached) return cached;

  const pending = _derive(password, salt).catch((error) => {
    logger.error(SCOPE, "Key derivation failed", error);
    keyCache.delete(id);
    throw error;
  });

  keyCache.set(id, pending);
  _trimCache();
  return pending;
};

export const writeAt = async (
  file: string,
  data: Buffer,
  offset: number
): Promise<void> => {
  const handle = await fs.open(file, "r+");
  try {
    let written = 0;
    while (written < data.length) {
      const { bytesWritten } = await handle.write(
        data,
        written,
        data.length - written,
        offset + written
      );
      written += bytesWritten;
    }
  } finally {
    await handle.close();
  }
};

const _copyAcross = async (source: string, target: string): Promise<void> => {
  const temp = `${target}.${crypto.randomBytes(4).toString("hex")}.part`;
  try {
    await fs.copyFile(source, temp);
    await fs.rename(temp, target);
    await fs.rm(source, { force: true });
  } catch (error) {
    logger.error(SCOPE, `Cross-device move failed for ${target}`, error);
    await fs.rm(temp, { force: true });
    throw error;
  }
};

export const promoteFile = async (source: string, target: string): Promise<void> => {
  await fs.mkdir(path.dirname(target), { recursive: true });

  try {
    await fs.rename(source, target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== CROSS_DEVICE) throw error;
    logger.info(SCOPE, `Rename crossed devices, copying ${path.basename(target)}`);
    await _copyAcross(source, target);
  }
};
