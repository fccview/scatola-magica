"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const TEMP_DIR = `${UPLOAD_DIR}/temp`;
const ASSEMBLY_IN_PROGRESS = "__ASSEMBLING__";

export interface PersistedUploadSession {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: number[];
  writtenChunks: number[];
  createdAt: number;
  chunkSize?: number;
  folderPath?: string;
  e2eEncrypted?: boolean;
  e2ePassword?: string;
  e2eSalt?: number[];
  fileId?: string;
}

const _getSessionFile = (uploadId: string): string => {
  if (!/^[a-zA-Z0-9-_]+$/.test(uploadId)) {
    throw new Error("Invalid uploadId format");
  }
  const sessionFile = path.join(TEMP_DIR, uploadId, "session.json");
  const resolvedSessionFile = path.resolve(sessionFile);
  const resolvedBaseDir = path.resolve(TEMP_DIR);
  if (!resolvedSessionFile.startsWith(resolvedBaseDir + path.sep)) {
    throw new Error("Path traversal detected");
  }
  return sessionFile;
};

const _getTempDir = (uploadId: string): string => {
  if (!/^[a-zA-Z0-9-_]+$/.test(uploadId)) {
    throw new Error("Invalid uploadId format");
  }
  const tempDir = path.join(TEMP_DIR, uploadId);
  const resolvedTempDir = path.resolve(tempDir);
  const resolvedBaseDir = path.resolve(TEMP_DIR);
  if (!resolvedTempDir.startsWith(resolvedBaseDir + path.sep)) {
    throw new Error("Path traversal detected");
  }
  return tempDir;
};

const _ensureSessionFile = async (
  uploadId: string,
  session: PersistedUploadSession
): Promise<void> => {
  const sessionFile = _getSessionFile(uploadId);
  try {
    await fs.access(sessionFile);
  } catch {
    await fs.writeFile(
      sessionFile,
      JSON.stringify(session, null, 2),
      "utf-8"
    );
  }
};

const _writeSessionWithLock = async (
  uploadId: string,
  session: PersistedUploadSession
): Promise<void> => {
  const sessionFile = _getSessionFile(uploadId);
  const jsonData = JSON.stringify(session, null, 2);

  try {
    await fs.access(sessionFile);
  } catch {
    await fs.writeFile(sessionFile, jsonData, "utf-8");
    return;
  }

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await lock(sessionFile, { retries: 0 });
      try {
        await fs.writeFile(sessionFile, jsonData, "utf-8");
        await unlock(sessionFile);
        return;
      } catch (writeError) {
        await unlock(sessionFile).catch(() => {});
        throw writeError;
      }
    } catch (lockError: any) {
      if (lockError.code === "ELOCKED" && retries < maxRetries - 1) {
        retries++;
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retries - 1))
        );
        continue;
      }
      if (lockError.code === "ELOCKED") {
        throw new Error(
          `Failed to save upload session: file is locked after ${maxRetries} retries`
        );
      }
      throw lockError;
    }
  }
};

export const createUploadSession = async (
  session: PersistedUploadSession
): Promise<void> => {
  const tempDir = _getTempDir(session.uploadId);
  await fs.mkdir(tempDir, { recursive: true });
  await _ensureSessionFile(session.uploadId, session);
};

export const loadUploadSession = async (
  uploadId: string
): Promise<PersistedUploadSession | null> => {
  try {
    const sessionFile = _getSessionFile(uploadId);
    const content = await fs.readFile(sessionFile, "utf-8");

    if (!content || content.trim().length === 0) {
      console.warn(`[Session] Empty session file: ${uploadId}`);
      return null;
    }

    const session = JSON.parse(content) as PersistedUploadSession;

    if (!session.uploadId || !session.fileName || !session.totalChunks) {
      console.warn(`[Session] Invalid session structure: ${uploadId}`);
      return null;
    }

    return session;
  } catch (error: any) {
    if (error.code === "ENOENT") {
      return null;
    }

    console.error(`[Session] Failed to load session ${uploadId}:`, error);

    try {
      await deleteUploadSession(uploadId);
    } catch {}

    return null;
  }
};

export const markChunkWritten = async (
  uploadId: string,
  chunkIndex: number
): Promise<void> => {
  const session = await loadUploadSession(uploadId);
  if (!session) {
    throw new Error(`Upload session not found: ${uploadId}`);
  }

  if (session.writtenChunks.includes(chunkIndex)) {
    return;
  }

  session.writtenChunks.push(chunkIndex);
  session.writtenChunks.sort((a, b) => a - b);

  await _writeSessionWithLock(uploadId, session);
};

export const markChunkReceived = async (
  uploadId: string,
  chunkIndex: number
): Promise<void> => {
  const session = await loadUploadSession(uploadId);
  if (!session) {
    throw new Error(`Upload session not found: ${uploadId}`);
  }

  if (session.receivedChunks.includes(chunkIndex)) {
    return;
  }

  session.receivedChunks.push(chunkIndex);
  session.receivedChunks.sort((a, b) => a - b);

  await _writeSessionWithLock(uploadId, session);
};

export const isUploadComplete = async (uploadId: string): Promise<boolean> => {
  const session = await loadUploadSession(uploadId);
  if (!session) {
    return false;
  }

  return session.writtenChunks.length === session.totalChunks;
};

export const setSessionFileId = async (
  uploadId: string,
  fileId: string
): Promise<void> => {
  const session = await loadUploadSession(uploadId);
  if (!session) {
    throw new Error(`Upload session not found: ${uploadId}`);
  }

  session.fileId = fileId;
  await _writeSessionWithLock(uploadId, session);
};

export const tryStartAssembly = async (uploadId: string): Promise<boolean> => {
  const sessionFile = _getSessionFile(uploadId);

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await lock(sessionFile, { retries: 0 });
      try {
        const content = await fs.readFile(sessionFile, "utf-8");
        const session = JSON.parse(content) as PersistedUploadSession;

        if (session.fileId) {
          await unlock(sessionFile);
          return false;
        }

        session.fileId = ASSEMBLY_IN_PROGRESS;
        await fs.writeFile(sessionFile, JSON.stringify(session, null, 2));
        await unlock(sessionFile);
        return true;
      } catch (writeError) {
        await unlock(sessionFile).catch(() => {});
        throw writeError;
      }
    } catch (lockError: any) {
      if (lockError.code === "ELOCKED" && retries < maxRetries - 1) {
        retries++;
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, retries - 1))
        );
        continue;
      }
      throw lockError;
    }
  }

  return false;
};

export const deleteUploadSession = async (uploadId: string): Promise<void> => {
  const tempDir = _getTempDir(uploadId);

  try {
    await fs.rm(tempDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`[Session] Failed to delete session ${uploadId}:`, error);
  }
};

export const listUploadSessions = async (): Promise<string[]> => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
    const entries = await fs.readdir(TEMP_DIR, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch (error) {
    console.error("[Session] Failed to list upload sessions:", error);
    return [];
  }
};
