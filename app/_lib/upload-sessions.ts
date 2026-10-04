import "server-only";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { TEMP_DIR, isInside } from "@/app/_lib/storage";
import { readJson, updateJson, writeJson } from "@/app/_lib/json-store";
import { logger } from "@/app/_lib/logger";

const SCOPE = "upload-sessions";
const UPLOAD_ID_PATTERN = /^[a-zA-Z0-9_-]{1,200}$/;
const OWNER_SEPARATOR = "__";
const SESSION_FILE = "session.json";

export const ASSEMBLY_IN_PROGRESS = "__ASSEMBLING__";

export interface PersistedUploadSession {
  uploadId: string;
  owner: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  createdAt: number;
  chunkSize?: number;
  folderPath: string;
  e2eEncrypted?: boolean;
  e2ePassword?: string;
  e2eSalt?: number[];
  fileId?: string;
}

const _ownerKey = (owner: string): string =>
  crypto.createHash("sha256").update(owner).digest("hex").slice(0, 16);

export const isValidUploadId = (uploadId: unknown): uploadId is string =>
  typeof uploadId === "string" && UPLOAD_ID_PATTERN.test(uploadId);

export const sessionDir = (owner: string, uploadId: string): string => {
  if (!isValidUploadId(uploadId)) throw new Error("Invalid uploadId format");

  const dir = path.join(TEMP_DIR, `${_ownerKey(owner)}${OWNER_SEPARATOR}${uploadId}`);
  if (!isInside(TEMP_DIR, dir) || dir === TEMP_DIR) {
    throw new Error("Invalid upload session path");
  }

  return dir;
};

export const chunkPath = (dir: string, index: number): string =>
  path.join(dir, `chunk-${index}`);

const _sessionFile = (owner: string, uploadId: string): string =>
  path.join(sessionDir(owner, uploadId), SESSION_FILE);

export const createUploadSession = async (
  session: PersistedUploadSession
): Promise<void> => {
  await fs.mkdir(sessionDir(session.owner, session.uploadId), {
    recursive: true,
    mode: 0o700,
  });
  await writeJson(_sessionFile(session.owner, session.uploadId), session);
};

export const loadUploadSession = async (
  owner: string,
  uploadId: string
): Promise<PersistedUploadSession | null> => {
  if (!isValidUploadId(uploadId)) return null;

  try {
    const session = await readJson<PersistedUploadSession | null>(
      _sessionFile(owner, uploadId),
      null
    );
    return session?.owner === owner ? session : null;
  } catch (error) {
    logger.error(SCOPE, `Failed to load session ${uploadId}`, error);
    return null;
  }
};

export const writtenChunks = async (dir: string): Promise<number[]> => {
  try {
    const files = await fs.readdir(dir);
    return files
      .filter((file) => file.startsWith("chunk-"))
      .map((file) => Number(file.slice("chunk-".length)))
      .filter(Number.isInteger)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
};

export const tryStartAssembly = (
  owner: string,
  uploadId: string
): Promise<boolean> =>
  updateJson<PersistedUploadSession | null, boolean>(
    _sessionFile(owner, uploadId),
    null,
    (session) => {
      if (!session || session.fileId) return false;
      session.fileId = ASSEMBLY_IN_PROGRESS;
      return true;
    }
  );

export const setSessionFileId = (
  owner: string,
  uploadId: string,
  fileId: string | undefined
): Promise<void> =>
  updateJson<PersistedUploadSession | null>(
    _sessionFile(owner, uploadId),
    null,
    (session) => {
      if (session) session.fileId = fileId;
    }
  );

export const deleteUploadSession = async (
  owner: string,
  uploadId: string
): Promise<void> => {
  try {
    await fs.rm(sessionDir(owner, uploadId), { recursive: true, force: true });
  } catch (error) {
    logger.error(SCOPE, `Failed to delete session ${uploadId}`, error);
  }
};

export const listSessionDirs = async (): Promise<string[]> => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const entries = await fs.readdir(TEMP_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(TEMP_DIR, entry.name));
  } catch (error) {
    logger.error(SCOPE, "Failed to list upload sessions", error);
    return [];
  }
};

export const listOwnerSessions = async (
  owner: string
): Promise<PersistedUploadSession[]> => {
  const prefix = `${_ownerKey(owner)}${OWNER_SEPARATOR}`;
  const sessions: PersistedUploadSession[] = [];

  for (const dir of await listSessionDirs()) {
    if (!path.basename(dir).startsWith(prefix)) continue;

    const session = await readJson<PersistedUploadSession | null>(
      path.join(dir, SESSION_FILE),
      null
    ).catch(() => null);

    if (session?.owner === owner) sessions.push(session);
  }

  return sessions;
};

export const readSessionAt = (
  dir: string
): Promise<PersistedUploadSession | null> =>
  readJson<PersistedUploadSession | null>(path.join(dir, SESSION_FILE), null);
