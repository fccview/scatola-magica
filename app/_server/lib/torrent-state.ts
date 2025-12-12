"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { TorrentSession } from "@/app/_types/torrent";

const STATE_DIR = process.env.TORRENT_STATE_DIR || "./data/config/torrent-state";

const _getStateFile = (username: string): string => {
  return path.join(STATE_DIR, `${username}-torrents.json`);
};

const _ensureStateDir = async (): Promise<void> => {
  await fs.mkdir(STATE_DIR, { recursive: true });
};

export const saveTorrentSession = async (
  username: string,
  session: TorrentSession
): Promise<void> => {
  await _ensureStateDir();
  const file = _getStateFile(username);

  let sessions: TorrentSession[] = [];
  try {
    const content = await fs.readFile(file, "utf-8");
    sessions = JSON.parse(content);
  } catch {
    // File doesn't exist yet
  }

  const existingIndex = sessions.findIndex(
    (s) => s.metadata.infoHash === session.metadata.infoHash
  );

  if (existingIndex >= 0) {
    sessions[existingIndex] = session;
  } else {
    sessions.push(session);
  }

  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify([], null, 2));
  }

  await lock(file);
  try {
    await fs.writeFile(file, JSON.stringify(sessions, null, 2));
  } finally {
    await unlock(file);
  }
};

export const loadTorrentSessions = async (
  username: string
): Promise<TorrentSession[]> => {
  try {
    const file = _getStateFile(username);
    const content = await fs.readFile(file, "utf-8");
    return JSON.parse(content);
  } catch {
    return [];
  }
};

export const deleteTorrentSession = async (
  username: string,
  infoHash: string
): Promise<void> => {
  const file = _getStateFile(username);

  try {
    const sessions = await loadTorrentSessions(username);
    const filtered = sessions.filter(
      (s) => s.metadata.infoHash !== infoHash
    );

    await lock(file);
    try {
      await fs.writeFile(file, JSON.stringify(filtered, null, 2));
    } finally {
      await unlock(file);
    }
  } catch (error) {
    console.error("Failed to delete torrent session:", error);
  }
};
