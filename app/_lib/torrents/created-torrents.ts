import "server-only";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { getUserPreferences } from "@/app/_lib/preferences-store";
import { encryptJsonFor, decryptJsonFor } from "@/app/_lib/pgp";
import { TORRENTS_DATA_DIR } from "@/app/_lib/data-paths";
import { logger } from "@/app/_lib/logger";

const SCOPE = "created-torrents";

export interface CreatedTorrent {
  infoHash: string;
  name: string;
  magnetURI: string;
  torrentFilePath: string;
  sourcePath: string;
  size: number;
  fileCount: number;
  createdAt: number;
  createdBy: string;
}

const _getCreatedTorrentsFile = (username: string): string => {
  return path.join(TORRENTS_DATA_DIR, `${username}-created.json`);
};

const _getCreatedTorrentsEncryptedFile = (username: string): string => {
  return path.join(TORRENTS_DATA_DIR, `${username}-created.json.pgp`);
};

const _ensureDir = async (): Promise<void> => {
  await fs.mkdir(TORRENTS_DATA_DIR, { recursive: true });
};

export const saveCreatedTorrent = async (
  username: string,
  torrent: CreatedTorrent
): Promise<void> => {
  await _ensureDir();
  const file = _getCreatedTorrentsFile(username);

  const isEncrypted = await isCreatedTorrentsEncrypted(username);
  if (isEncrypted) {
    return;
  }

  let torrents: CreatedTorrent[] = [];
  try {
    const content = await fs.readFile(file, "utf-8");
    torrents = JSON.parse(content);
  } catch (error) {
    logger.warn(SCOPE, `Could not parse torrent data for ${username}`, error);
  }

  const existingIndex = torrents.findIndex(
    (t) => t.infoHash === torrent.infoHash
  );

  if (existingIndex >= 0) {
    torrents[existingIndex] = torrent;
  } else {
    torrents.push(torrent);
  }

  const jsonData = JSON.stringify(torrents, null, 2);

  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify([], null, 2));
  }

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
        throw new Error("Failed to save created torrent: file is locked", { cause: lockError });
      }
      throw lockError;
    }
  }
};

export const isCreatedTorrentsEncrypted = async (
  username: string
): Promise<boolean> => {
  try {
    const encryptedFile = _getCreatedTorrentsEncryptedFile(username);
    await fs.access(encryptedFile);
    return true;
  } catch {
    return false;
  }
};

export const loadCreatedTorrents = async (
  username: string
): Promise<CreatedTorrent[]> => {
  const file = _getCreatedTorrentsFile(username);

  const isEncrypted = await isCreatedTorrentsEncrypted(username);
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
    return JSON.parse(content);
  } catch {
    return [];
  }
};

export const encryptCreatedTorrents = async (
  username: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const file = _getCreatedTorrentsFile(username);
    const encryptedFile = _getCreatedTorrentsEncryptedFile(username);

    const isEncrypted = await isCreatedTorrentsEncrypted(username);
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

    const encryptResult = await encryptJsonFor(username, content);
    if (!encryptResult.success || !encryptResult.data) {
      return {
        success: false,
        error: encryptResult.message || "Failed to encrypt",
      };
    }

    await fs.writeFile(encryptedFile, encryptResult.data);
    await fs.unlink(file).catch(() => { });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Encryption failed" };
  }
};

export const decryptCreatedTorrents = async (
  username: string,
  password: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const file = _getCreatedTorrentsFile(username);
    const encryptedFile = _getCreatedTorrentsEncryptedFile(username);

    const isEncrypted = await isCreatedTorrentsEncrypted(username);
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

    const decryptResult = await decryptJsonFor(username, encryptedContent, password);
    if (!decryptResult.success || !decryptResult.data) {
      return {
        success: false,
        error: decryptResult.message || "Failed to decrypt",
      };
    }

    await fs.writeFile(file, decryptResult.data);
    await fs.unlink(encryptedFile).catch(() => { });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Decryption failed" };
  }
};

export const deleteCreatedTorrent = async (
  username: string,
  infoHash: string
): Promise<void> => {
  const file = _getCreatedTorrentsFile(username);

  const isEncrypted = await isCreatedTorrentsEncrypted(username);
  if (isEncrypted) {
    return;
  }

  try {
    const torrents = await loadCreatedTorrents(username);
    const filtered = torrents.filter((t) => t.infoHash !== infoHash);

    const jsonData = JSON.stringify(filtered, null, 2);

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await lock(file, { retries: 0 });
        try {
          await fs.writeFile(file, jsonData);
          await unlock(file);
          break;
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
          throw new Error("Failed to delete created torrent: file is locked", { cause: lockError });
        }
        throw lockError;
      }
    }

    const torrent = torrents.find((t) => t.infoHash === infoHash);
    if (torrent?.torrentFilePath) {
      try {
        await fs.unlink(torrent.torrentFilePath);
      } catch (error) {
        logger.warn(SCOPE, `Could not remove ${torrent.torrentFilePath}`, error);
      }
    }
  } catch (error) {
    console.error("Failed to delete created torrent:", error);
  }
};
