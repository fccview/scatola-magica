"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { TorrentMetadata } from "@/app/_types/torrent";

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

export const saveTorrentSession = async (
  username: string,
  metadata: TorrentMetadata
): Promise<void> => {
  await _ensureDir();
  const file = _getSessionsFile(username);

  let sessions: StoredTorrentSession[] = [];
  try {
    const content = await fs.readFile(file, "utf-8");
    sessions = JSON.parse(content);
  } catch {
    // File doesn't exist yet, that's okay
  }

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

  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await lock(file, { retries: 0 });
      try {
        await fs.writeFile(file, JSON.stringify(sessions, null, 2));
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

export const loadTorrentSessions = async (
  username: string
): Promise<Array<{ metadata: TorrentMetadata; addedAt: number }>> => {
  try {
    const file = _getSessionsFile(username);
    const content = await fs.readFile(file, "utf-8");
    const sessions: StoredTorrentSession[] = JSON.parse(content);
    return sessions.map((s) => ({ metadata: s.metadata, addedAt: s.addedAt }));
  } catch {
    return [];
  }
};

export const deleteTorrentSession = async (
  username: string,
  infoHash: string
): Promise<void> => {
  const file = _getSessionsFile(username);

  try {
    let sessions: StoredTorrentSession[] = [];
    try {
      const content = await fs.readFile(file, "utf-8");
      sessions = JSON.parse(content);
    } catch {
      return;
    }

    const filtered = sessions.filter((s) => s.metadata.infoHash !== infoHash);

    const maxRetries = 5;
    let retries = 0;

    while (retries < maxRetries) {
      try {
        await lock(file, { retries: 0 });
        try {
          await fs.writeFile(file, JSON.stringify(filtered, null, 2));
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
