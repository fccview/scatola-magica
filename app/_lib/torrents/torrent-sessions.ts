"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { TorrentMetadata } from "@/app/_types/torrent";
import { encryptJsonData, decryptJsonData } from "@/app/_server/actions/pgp";

const TORRENTS_DATA_DIR =
  process.env.TORRENTS_DATA_DIR || "./data/config/torrents";

interface StoredTorrentSession {
  metadata: TorrentMetadata;
  username: string;
  addedAt: number;
}

const _getSessionsFile = (username: string): string => {
  return path.join(TORRENTS_DATA_DIR, `${username}-sessions.json`);
};

const _getSessionsEncryptedFile = (username: string): string => {
  return path.join(TORRENTS_DATA_DIR, `${username}-sessions.json.pgp`);
};

const _ensureDir = async (): Promise<void> => {
  await fs.mkdir(TORRENTS_DATA_DIR, { recursive: true });
};

const _ensureSessionsFile = async (username: string): Promise<void> => {
  const file = _getSessionsFile(username);
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify([], null, 2));
  }
};

export const saveTorrentSession = async (
  username: string,
  metadata: TorrentMetadata
): Promise<void> => {
  await _ensureDir();
  await _ensureSessionsFile(username);

  const file = _getSessionsFile(username);

  const isEncrypted = await isTorrentSessionsEncrypted(username);
  if (isEncrypted) {
    return;
  }

  let sessions: StoredTorrentSession[] = [];
  try {
    const content = await fs.readFile(file, "utf-8");
    sessions = JSON.parse(content);
  } catch { }

  const existingIndex = sessions.findIndex(
    (s) => s.metadata.infoHash === metadata.infoHash
  );

  const session: StoredTorrentSession = {
    metadata,
    username,
    addedAt: Date.now(),
  };

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  const jsonData = JSON.stringify(sessions, null, 2);

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await lock(file, { retries: 0 });
      try {
        await fs.writeFile(file, jsonData);
        await unlock(file);
        return;
      } catch (writeError) {
        await unlock(file).catch(() => { });
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
        throw new Error("Failed to save torrent session: file is locked");
      }
      throw lockError;
    }
  }
};

export const isTorrentSessionsEncrypted = async (
  username: string
): Promise<boolean> => {
  try {
    const encryptedFile = _getSessionsEncryptedFile(username);
    await fs.access(encryptedFile);
    return true;
  } catch {
    return false;
  }
};

export const loadTorrentSessions = async (
  username: string
): Promise<Array<{ metadata: TorrentMetadata; addedAt: number }>> => {
  await _ensureSessionsFile(username);
  const file = _getSessionsFile(username);

  const isEncrypted = await isTorrentSessionsEncrypted(username);
  if (isEncrypted) {
    return [];
  }

  let content: string;

  try {
    content = await fs.readFile(file, "utf-8");
  } catch {
    return [];
  }

  if (!content || content.trim().length === 0) {
    return [];
  }

  try {
    const sessions: StoredTorrentSession[] = JSON.parse(content);
    return sessions.map((s) => ({ metadata: s.metadata, addedAt: s.addedAt }));
  } catch {
    return [];
  }
};

export const encryptTorrentSessions = async (
  username: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await _ensureSessionsFile(username);
    const file = _getSessionsFile(username);
    const encryptedFile = _getSessionsEncryptedFile(username);

    const isEncrypted = await isTorrentSessionsEncrypted(username);
    if (isEncrypted) {
      return { success: true };
    }

    let content: string;
    try {
      content = await fs.readFile(file, "utf-8");
    } catch {
      return { success: true };
    }

    if (!content || content.trim().length === 0) {
      return { success: true };
    }

    const encryptResult = await encryptJsonData(content);
    if (!encryptResult.success || !encryptResult.encryptedData) {
      return {
        success: false,
        error: encryptResult.message || "Failed to encrypt",
      };
    }

    await fs.writeFile(encryptedFile, encryptResult.encryptedData);
    await fs.unlink(file).catch(() => { });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Encryption failed" };
  }
};

export const decryptTorrentSessions = async (
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await _ensureSessionsFile(username);
    const file = _getSessionsFile(username);
    const encryptedFile = _getSessionsEncryptedFile(username);

    const isEncrypted = await isTorrentSessionsEncrypted(username);
    if (!isEncrypted) {
      return { success: true };
    }

    let encryptedContent: string;
    try {
      encryptedContent = await fs.readFile(encryptedFile, "utf-8");
    } catch {
      return { success: true };
    }

    if (!encryptedContent || encryptedContent.trim().length === 0) {
      return { success: true };
    }

    const decryptResult = await decryptJsonData(encryptedContent, password);
    if (!decryptResult.success || !decryptResult.decryptedData) {
      return {
        success: false,
        error: decryptResult.message || "Failed to decrypt",
      };
    }

    await fs.writeFile(file, decryptResult.decryptedData);
    await fs.unlink(encryptedFile).catch(() => { });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Decryption failed" };
  }
};

export const deleteTorrentSession = async (
  username: string,
  infoHash: string
): Promise<void> => {
  await _ensureSessionsFile(username);
  const file = _getSessionsFile(username);

  const isEncrypted = await isTorrentSessionsEncrypted(username);
  if (isEncrypted) {
    return;
  }

  try {
    let sessions: StoredTorrentSession[] = [];
    try {
      const content = await fs.readFile(file, "utf-8");
      sessions = JSON.parse(content);
    } catch {
      return;
    }

    const filtered = sessions.filter((s) => s.metadata.infoHash !== infoHash);
    const jsonData = JSON.stringify(filtered, null, 2);

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await lock(file, { retries: 0 });
        try {
          await fs.writeFile(file, jsonData);
          await unlock(file);
          return;
        } catch (writeError) {
          await unlock(file).catch(() => { });
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
          throw new Error("Failed to delete torrent session: file is locked");
        }
        throw lockError;
      }
    }
  } catch (error) {
    console.error("Failed to delete torrent session:", error);
  }
};
