import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";

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

  let torrents: CreatedTorrent[] = [];
  try {
    const content = await fs.readFile(file, "utf-8");
    torrents = JSON.parse(content);
  } catch {
    // File doesn't exist yet
  }

  const existingIndex = torrents.findIndex(
    (t) => t.infoHash === torrent.infoHash
  );

  if (existingIndex >= 0) {
    torrents[existingIndex] = torrent;
  } else {
    torrents.push(torrent);
  }

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
        await fs.writeFile(file, JSON.stringify(torrents, null, 2));
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

export const loadCreatedTorrents = async (
  username: string
): Promise<CreatedTorrent[]> => {
  try {
    const file = _getCreatedTorrentsFile(username);
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
};

export const deleteCreatedTorrent = async (
  username: string,
  infoHash: string
): Promise<void> => {
  const file = _getCreatedTorrentsFile(username);

  try {
    const torrents = await loadCreatedTorrents(username);
    const filtered = torrents.filter((t) => t.infoHash !== infoHash);

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await lock(file, { retries: 0 });
        try {
          await fs.writeFile(file, JSON.stringify(filtered, null, 2));
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
