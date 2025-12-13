import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { getUserPreferences } from "@/app/_lib/preferences";
import { encryptJsonData, decryptJsonData } from "@/app/_server/actions/pgp";

const TORRENTS_DATA_DIR =
  process.env.TORRENTS_DATA_DIR || "./data/config/torrents";

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

const _ensureDir = async (): Promise<void> => {
  await fs.mkdir(TORRENTS_DATA_DIR, { recursive: true });
};

export const saveCreatedTorrent = async (
  username: string,
  torrent: CreatedTorrent
): Promise<void> => {
  await _ensureDir();
  const file = _getCreatedTorrentsFile(username);

  const preferences = await getUserPreferences(username);
  const encryptMetadata =
    preferences.torrentPreferences?.encryptMetadata ?? true;

  let torrents: CreatedTorrent[] = [];
  try {
    const content = await fs.readFile(file, "utf-8");
    if (content.trim().startsWith("-----BEGIN PGP MESSAGE-----")) {
      return;
    }
    torrents = JSON.parse(content);
  } catch {}

  const existingIndex = torrents.findIndex(
    (t) => t.infoHash === torrent.infoHash
  );

  if (existingIndex >= 0) {
    torrents[existingIndex] = torrent;
  } else {
    torrents.push(torrent);
  }

  const jsonData = JSON.stringify(torrents, null, 2);
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

  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(
      file,
      encryptMetadata ? "" : JSON.stringify([], null, 2)
    );
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
        console.warn(
          "Lock file busy, skipping save (will retry on next update)"
        );
        return;
      }
      throw lockError;
    }
  }
};

export const isCreatedTorrentsEncrypted = async (
  username: string
): Promise<boolean> => {
  try {
    const file = _getCreatedTorrentsFile(username);
    const content = await fs.readFile(file, "utf-8");
    return content.trim().startsWith("-----BEGIN PGP MESSAGE-----");
  } catch {
    return false;
  }
};

export const loadCreatedTorrents = async (
  username: string,
  password?: string
): Promise<CreatedTorrent[]> => {
  const file = _getCreatedTorrentsFile(username);
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
    return JSON.parse(decryptResult.decryptedData);
  }

  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
};

export const migrateCreatedTorrentsEncryption = async (
  username: string,
  encrypt: boolean,
  password?: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const file = _getCreatedTorrentsFile(username);
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

export const deleteCreatedTorrent = async (
  username: string,
  infoHash: string,
  password?: string
): Promise<void> => {
  const file = _getCreatedTorrentsFile(username);

  try {
    const torrents = await loadCreatedTorrents(username, password);
    const filtered = torrents.filter((t) => t.infoHash !== infoHash);

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
          break;
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
          console.warn(
            "Lock file busy, skipping delete (will retry on next operation)"
          );
          return;
        }
        throw lockError;
      }
    }

    const torrent = torrents.find((t) => t.infoHash === infoHash);
    if (torrent?.torrentFilePath) {
      try {
        await fs.unlink(torrent.torrentFilePath);
      } catch {
        // File might not exist, that's okay
      }
    }
  } catch (error) {
    console.error("Failed to delete created torrent:", error);
  }
};
