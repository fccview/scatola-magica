"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { TorrentMetadata } from "@/app/_types/torrent";
import { getUserPreferences } from "@/app/_lib/preferences";
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
  const preferences = await getUserPreferences(username);
  const encryptMetadata =
    preferences.torrentPreferences?.encryptMetadata ?? true;

  let sessions: StoredTorrentSession[] = [];
  try {
    const content = await fs.readFile(file, "utf-8");
    if (content.trim().startsWith("-----BEGIN PGP MESSAGE-----")) {
      return;
    }
    sessions = JSON.parse(content);
  } catch {}

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
  let contentToWrite: string;

  if (encryptMetadata) {
    const encryptResult = await encryptJsonData(jsonData);
    if (!encryptResult.success || !encryptResult.encryptedData) {
      throw new Error(encryptResult.message || "Failed to encrypt metadata");
    }
    contentToWrite = encryptResult.encryptedData;
  } else {
    contentToWrite = jsonData;
  }

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await lock(file, { retries: 0 });
      try {
        await fs.writeFile(file, contentToWrite);
        await unlock(file);
        return;
      } catch (writeError) {
        await unlock(file).catch(() => {});
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
        console.warn("Lock file busy, skipping save");
        return;
      }
      throw lockError;
    }
  }
};

export const isTorrentSessionsEncrypted = async (
  username: string
): Promise<boolean> => {
  try {
    await _ensureSessionsFile(username);
    const file = _getSessionsFile(username);
    const content = await fs.readFile(file, "utf-8");
    return content.trim().startsWith("-----BEGIN PGP MESSAGE-----");
  } catch {
    return false;
  }
};

export const loadTorrentSessions = async (
  username: string,
  password?: string
): Promise<Array<{ metadata: TorrentMetadata; addedAt: number }>> => {
  await _ensureSessionsFile(username);
  const file = _getSessionsFile(username);
  let content: string;

  try {
    content = await fs.readFile(file, "utf-8");
  } catch {
    return [];
  }

  if (!content || content.trim().length === 0) {
    return [];
  }

  if (content.trim().startsWith("-----BEGIN PGP MESSAGE-----")) {
    if (!password) {
      throw new Error("PASSWORD_REQUIRED");
    }
    const decryptResult = await decryptJsonData(content, password);
    if (!decryptResult.success || !decryptResult.decryptedData) {
      throw new Error("INVALID_PASSWORD");
    }
    const sessions: StoredTorrentSession[] = JSON.parse(
      decryptResult.decryptedData
    );
    return sessions.map((s) => ({
      metadata: s.metadata,
      addedAt: s.addedAt,
    }));
  }

  try {
    const sessions: StoredTorrentSession[] = JSON.parse(content);
    return sessions.map((s) => ({ metadata: s.metadata, addedAt: s.addedAt }));
  } catch {
    return [];
  }
};

export const migrateTorrentSessionsEncryption = async (
  username: string,
  encrypt: boolean,
  password?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    await _ensureSessionsFile(username);
    const file = _getSessionsFile(username);
    let content: string;

    try {
      content = await fs.readFile(file, "utf-8");
    } catch {
      return { success: true };
    }

    const isEncrypted = content
      .trim()
      .startsWith("-----BEGIN PGP MESSAGE-----");

    if (encrypt && !isEncrypted) {
      if (!password) {
        return { success: false, error: "Password required to encrypt" };
      }
      const encryptResult = await encryptJsonData(content);
      if (!encryptResult.success || !encryptResult.encryptedData) {
        return {
          success: false,
          error: encryptResult.message || "Failed to encrypt",
        };
      }
      await fs.writeFile(file, encryptResult.encryptedData);
    } else if (!encrypt && isEncrypted) {
      if (!password) {
        return { success: false, error: "Password required to decrypt" };
      }
      const decryptResult = await decryptJsonData(content, password);
      if (!decryptResult.success || !decryptResult.decryptedData) {
        return {
          success: false,
          error: decryptResult.message || "Failed to decrypt",
        };
      }
      await fs.writeFile(file, decryptResult.decryptedData);
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Migration failed" };
  }
};

export const deleteTorrentSession = async (
  username: string,
  infoHash: string,
  password?: string
): Promise<void> => {
  await _ensureSessionsFile(username);
  const file = _getSessionsFile(username);

  try {
    let sessions: StoredTorrentSession[] = [];
    try {
      const content = await fs.readFile(file, "utf-8");
      if (content.trim().startsWith("-----BEGIN PGP MESSAGE-----")) {
        if (!password) {
          return;
        }
        const decryptResult = await decryptJsonData(content, password);
        if (!decryptResult.success || !decryptResult.decryptedData) {
          return;
        }
        sessions = JSON.parse(decryptResult.decryptedData);
      } else {
        sessions = JSON.parse(content);
      }
    } catch {
      return;
    }

    const filtered = sessions.filter((s) => s.metadata.infoHash !== infoHash);

    const preferences = await getUserPreferences(username);
    const encryptMetadata =
      preferences.torrentPreferences?.encryptMetadata ?? true;

    const jsonData = JSON.stringify(filtered, null, 2);
    let contentToWrite: string;

    if (encryptMetadata) {
      const encryptResult = await encryptJsonData(jsonData);
      if (!encryptResult.success || !encryptResult.encryptedData) {
        throw new Error(encryptResult.message || "Failed to encrypt metadata");
      }
      contentToWrite = encryptResult.encryptedData;
    } else {
      contentToWrite = jsonData;
    }

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await lock(file, { retries: 0 });
        try {
          await fs.writeFile(file, contentToWrite);
          await unlock(file);
          return;
        } catch (writeError) {
          await unlock(file).catch(() => {});
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
          console.warn("Lock file busy, skipping delete");
          return;
        }
        throw lockError;
      }
    }
  } catch (error) {
    console.error("Failed to delete torrent session:", error);
  }
};
