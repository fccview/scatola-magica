import "server-only";

import fs from "fs/promises";
import { createReadStream, createWriteStream, WriteStream } from "fs";
import path from "path";
import crypto from "crypto";
import { pipeline } from "stream/promises";
import type { StorageOwner } from "@/app/_lib/storage";
import { isValidName, scopedPath, userRoot } from "@/app/_lib/storage";
import { readAppSettings } from "@/app/_lib/app-settings-store";
import { bustFileCache } from "@/app/_lib/cache/bust";
import { logger } from "@/app/_lib/logger";
import { promoteFile, vaultKey, writeAt } from "@/app/_lib/chunk-writer";
import {
  ASSEMBLY_IN_PROGRESS,
  ChunkLayout,
  chunkPath,
  createUploadSession,
  dataPath,
  deleteUploadSession,
  isValidUploadId,
  listSessionDirs,
  loadUploadSession,
  PersistedUploadSession,
  readSessionAt,
  sessionDir,
  setSessionFileId,
  tryStartAssembly,
  writtenChunks,
} from "@/app/_lib/upload-sessions";

const SCOPE = "uploads";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const MAX_TOTAL_CHUNKS = 1_000_000;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const FINALIZE_POLL_MS = 200;
const FINALIZE_MAX_POLLS = 300;

export interface UploadResult<T = undefined> {
  success: boolean;
  error?: string;
  data?: T;
  status?: number;
}

export interface InitUploadInput {
  uploadId: unknown;
  fileName: unknown;
  fileSize: unknown;
  totalChunks: unknown;
  chunkSize?: unknown;
  folderPath?: unknown;
  e2eEncrypted?: unknown;
  e2ePassword?: unknown;
  e2eSalt?: unknown;
}

const _fail = <T>(error: string, status = 400): UploadResult<T> => ({
  success: false,
  error,
  status,
});

const _isPositiveInt = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) > 0;

const _isSalt = (value: unknown): value is number[] =>
  Array.isArray(value) &&
  value.length === SALT_LENGTH &&
  value.every((byte) => Number.isInteger(byte) && byte >= 0 && byte <= 255);

export const initUpload = async (
  owner: StorageOwner,
  input: InitUploadInput
): Promise<UploadResult> => {
  const { uploadId, fileName, fileSize, totalChunks } = input;

  if (!isValidUploadId(uploadId)) return _fail("Invalid uploadId");
  if (!isValidName(fileName)) return _fail("Invalid file name");
  if (!Number.isInteger(fileSize) || (fileSize as number) < 0) {
    return _fail("Invalid file size");
  }
  if (!_isPositiveInt(totalChunks) || totalChunks > MAX_TOTAL_CHUNKS) {
    return _fail("Invalid chunk count");
  }

  const { upload } = await readAppSettings();
  if (upload.maxFileSize > 0 && (fileSize as number) > upload.maxFileSize) {
    return _fail("File exceeds the maximum allowed size", 413);
  }

  const e2eEncrypted = input.e2eEncrypted === true;
  if (e2eEncrypted && (typeof input.e2ePassword !== "string" || !_isSalt(input.e2eSalt))) {
    return _fail("Invalid encryption parameters");
  }

  const folder = scopedPath(owner, typeof input.folderPath === "string" ? input.folderPath : "");

  const existing = await loadUploadSession(owner.username, uploadId);
  if (existing) return { success: true };

  await createUploadSession({
    uploadId,
    owner: owner.username,
    fileName: fileName.trim(),
    fileSize: fileSize as number,
    totalChunks,
    createdAt: Date.now(),
    chunkSize: _isPositiveInt(input.chunkSize) ? input.chunkSize : undefined,
    layout: _isPositiveInt(input.chunkSize) ? ChunkLayout.DIRECT : ChunkLayout.FILES,
    folderPath: path.relative(userRoot(owner), folder.absolute),
    e2eEncrypted,
    e2ePassword: e2eEncrypted ? (input.e2ePassword as string) : undefined,
    e2eSalt: e2eEncrypted ? (input.e2eSalt as number[]) : undefined,
  });

  return { success: true };
};

const _decryptChunk = (encrypted: Buffer, key: Buffer): Buffer => {
  const iv = encrypted.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const body = encrypted.subarray(SALT_LENGTH + IV_LENGTH);
  const authTag = body.subarray(body.length - AUTH_TAG_LENGTH);
  const content = body.subarray(0, body.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(content), decipher.final()]);
};

const _write = (stream: WriteStream, data: Buffer): Promise<void> =>
  new Promise((resolve, reject) =>
    stream.write(data, (err) => (err ? reject(err) : resolve()))
  );

const _appendChunk = async (
  out: WriteStream,
  file: string,
  key: Buffer | undefined
): Promise<void> => {
  if (key) {
    await _write(out, _decryptChunk(await fs.readFile(file), key));
    return;
  }

  await pipeline(createReadStream(file), out, { end: false });
};

const _sessionKey = (
  session: PersistedUploadSession
): Promise<Buffer> | undefined =>
  session.e2eEncrypted && session.e2ePassword && session.e2eSalt
    ? vaultKey(session.e2ePassword, Buffer.from(session.e2eSalt))
    : undefined;

const _targetId = (owner: StorageOwner, absolute: string): string =>
  path.relative(userRoot(owner), absolute).split(path.sep).join("/");

const _promote = async (
  owner: StorageOwner,
  session: PersistedUploadSession
): Promise<string> => {
  const dir = sessionDir(owner.username, session.uploadId);
  const target = scopedPath(owner, path.join(session.folderPath, session.fileName));

  await promoteFile(dataPath(dir), target.absolute);
  await bustFileCache(target.absolute);
  return _targetId(owner, target.absolute);
};

const _assemble = async (
  owner: StorageOwner,
  session: PersistedUploadSession
): Promise<string> => {
  if (session.layout === ChunkLayout.DIRECT) return _promote(owner, session);

  const dir = sessionDir(owner.username, session.uploadId);
  const target = scopedPath(owner, path.join(session.folderPath, session.fileName));
  const tempTarget = `${target.absolute}.${crypto.randomBytes(4).toString("hex")}.part`;

  const key = await _sessionKey(session);

  await fs.mkdir(path.dirname(target.absolute), { recursive: true });
  const out = createWriteStream(tempTarget, { flags: "wx" });

  try {
    for (let i = 0; i < session.totalChunks; i++) {
      await _appendChunk(out, chunkPath(dir, i), key);
    }

    await new Promise<void>((resolve, reject) => {
      out.on("error", reject);
      out.end(resolve);
    });
    await fs.rename(tempTarget, target.absolute);
  } catch (error) {
    out.destroy();
    await fs.rm(tempTarget, { force: true });
    throw error;
  }

  await bustFileCache(target.absolute);
  return _targetId(owner, target.absolute);
};

const _looksEncrypted = (chunk: Buffer): boolean =>
  chunk.length >= SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;

const _expectedLength = (session: PersistedUploadSession, index: number): number => {
  const size = session.chunkSize ?? 0;
  return Math.max(0, Math.min(size, session.fileSize - index * size));
};

const _plainChunk = async (
  session: PersistedUploadSession,
  buffer: Buffer
): Promise<Buffer> => {
  const key = await _sessionKey(session);
  return key ? _decryptChunk(buffer, key) : buffer;
};

const _storeDirect = async (
  session: PersistedUploadSession,
  dir: string,
  index: number,
  buffer: Buffer
): Promise<UploadResult> => {
  let plain: Buffer;
  try {
    plain = await _plainChunk(session, buffer);
  } catch (error) {
    logger.warn(SCOPE, `Chunk ${index} of ${session.uploadId} failed to decrypt`, error);
    return _fail("Chunk could not be decrypted");
  }

  if (plain.length !== _expectedLength(session, index)) {
    logger.warn(SCOPE, `Chunk ${index} of ${session.uploadId} has an unexpected size`);
    return _fail("Unexpected chunk size");
  }

  await writeAt(dataPath(dir), plain, index * (session.chunkSize ?? 0));
  await fs.writeFile(chunkPath(dir, index), "");
  return { success: true };
};

export const storeChunk = async (
  owner: StorageOwner,
  uploadId: unknown,
  chunkIndex: unknown,
  chunk: unknown
): Promise<UploadResult<{ progress: number; fileId?: string }>> => {
  if (!isValidUploadId(uploadId)) return _fail("Invalid uploadId");
  if (!(chunk instanceof Blob)) return _fail("Missing chunk data");

  const session = await loadUploadSession(owner.username, uploadId);
  if (!session) return _fail("Upload session not found", 404);

  const index = Number(chunkIndex);
  if (!Number.isInteger(index) || index < 0 || index >= session.totalChunks) {
    return _fail("Invalid chunk index");
  }

  const buffer = Buffer.from(await chunk.arrayBuffer());
  if (session.e2eEncrypted && !_looksEncrypted(buffer)) {
    logger.warn(SCOPE, `Chunk ${index} of ${uploadId} is not encrypted`);
    return _fail("E2E encryption enabled but chunk is not encrypted");
  }

  const dir = sessionDir(owner.username, uploadId);
  if (session.layout === ChunkLayout.DIRECT) {
    const stored = await _storeDirect(session, dir, index, buffer);
    if (!stored.success) return _fail(stored.error ?? "Failed to store chunk", stored.status);
  } else {
    await fs.writeFile(chunkPath(dir, index), buffer);
  }

  const chunks = await writtenChunks(dir);
  const progress = (chunks.length / session.totalChunks) * 100;

  if (chunks.length < session.totalChunks) {
    return { success: true, data: { progress } };
  }

  if (!(await tryStartAssembly(owner.username, uploadId))) {
    return { success: true, data: { progress } };
  }

  try {
    const fileId = await _assemble(owner, session);
    await setSessionFileId(owner.username, uploadId, fileId);
    return { success: true, data: { progress: 100, fileId } };
  } catch (error) {
    logger.error(SCOPE, `Assembly failed for ${uploadId}`, error);
    await setSessionFileId(owner.username, uploadId, undefined);
    return _fail("Failed to assemble file", 500);
  }
};

export const finalizeUpload = async (
  owner: StorageOwner,
  uploadId: unknown
): Promise<UploadResult<{ fileId: string }>> => {
  if (!isValidUploadId(uploadId)) return _fail("Invalid uploadId");

  for (let poll = 0; poll < FINALIZE_MAX_POLLS; poll++) {
    const session = await loadUploadSession(owner.username, uploadId);
    if (!session) return _fail("Upload session not found", 404);

    if (session.fileId && session.fileId !== ASSEMBLY_IN_PROGRESS) {
      await deleteUploadSession(owner.username, uploadId);
      return { success: true, data: { fileId: session.fileId } };
    }

    await new Promise((resolve) => setTimeout(resolve, FINALIZE_POLL_MS));
  }

  return _fail("File assembly did not complete in time", 504);
};

export const uploadStatus = async (owner: StorageOwner, uploadId: unknown) => {
  if (!isValidUploadId(uploadId)) return { exists: false };

  const session = await loadUploadSession(owner.username, uploadId);
  if (!session) return { exists: false };

  const uploadedChunks = await writtenChunks(sessionDir(owner.username, uploadId));

  return {
    exists: true,
    fileName: session.fileName,
    fileSize: session.fileSize,
    totalChunks: session.totalChunks,
    uploadedChunks,
    progress: (uploadedChunks.length / session.totalChunks) * 100,
    createdAt: session.createdAt,
    e2eEncrypted: session.e2eEncrypted,
    chunkSize: session.chunkSize,
  };
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  const now = Date.now();

  for (const dir of await listSessionDirs()) {
    try {
      const session = await readSessionAt(dir).catch(() => null);
      const stats = await fs.stat(dir);
      const createdAt = session?.createdAt ?? stats.mtimeMs;

      if (now - createdAt > SESSION_TTL_MS) {
        logger.info(SCOPE, `Removing expired upload session ${path.basename(dir)}`);
        await fs.rm(dir, { recursive: true, force: true });
      }
    } catch (error) {
      logger.error(SCOPE, `Cleanup failed for ${dir}`, error);
    }
  }
};
