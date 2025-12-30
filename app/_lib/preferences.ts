"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { TorrentPreferences } from "@/app/_types/torrent";

export interface UserPreferences {
  username: string;
  particlesEnabled: boolean;
  wandCursorEnabled: boolean;
  pokemonThemesEnabled?: boolean;
  customKeysPath?: string;
  e2eEncryptionOnTransfer?: boolean;
  torrentPreferences?: TorrentPreferences;
}

export type PartialUserPreferences = Partial<
  Omit<UserPreferences, "username" | "torrentPreferences">
> & {
  torrentPreferences?: Partial<TorrentPreferences>;
};

const _getPreferencesFile = (): string => {
  return path.join(process.cwd(), "data", "config", "preferences.json");
};

const _readPreferences = async (): Promise<UserPreferences[]> => {
  try {
    const content = await fs.readFile(_getPreferencesFile(), "utf-8");
    if (!content) return [];
    return JSON.parse(content) as UserPreferences[];
  } catch {
    return [];
  }
};

const _writePreferences = async (
  preferences: UserPreferences[]
): Promise<void> => {
  const file = _getPreferencesFile();
  try {
    await fs.access(file);
  } catch {
    await fs.writeFile(file, JSON.stringify([], null, 2));
  }
  await lock(file);
  try {
    await fs.writeFile(file, JSON.stringify(preferences, null, 2));
  } finally {
    await unlock(file);
  }
};

export const getUserPreferences = async (
  username: string
): Promise<UserPreferences> => {
  const allPreferences = await _readPreferences();
  const userPref = allPreferences.find((p) => p.username === username);
  return (
    userPref || {
      username,
      particlesEnabled: true,
      wandCursorEnabled: true,
      pokemonThemesEnabled: false,
      customKeysPath: undefined,
      e2eEncryptionOnTransfer: true,
      torrentPreferences: {
        seedRatio: 1.0,
        autoStartTorrents: true,
        maxActiveTorrents: 5,
        maxTorrentFileSize: 10 * 1024 * 1024,
        maxSingleFileSize: 50 * 1024 * 1024 * 1024,
        maxTotalTorrentSize: 100 * 1024 * 1024 * 1024,
        maxFolderFileCount: 10000,
        maxPathDepth: 10,
        maxDownloadSpeed: -1,
        maxUploadSpeed: -1,
        trackers: [
          "udp://tracker.opentrackr.org:1337/announce",
          "udp://open.demonii.com:1337/announce",
          "udp://tracker.openbittorrent.com:6969/announce",
          "udp://exodus.desync.com:6969/announce",
          "udp://tracker.torrent.eu.org:451/announce",
        ],
        allowCustomTrackers: false,
      },
    }
  );
};

export const updateUserPreferences = async (
  username: string,
  updates: PartialUserPreferences,
  keysToRemove?: string[]
): Promise<{ success: boolean; error?: string }> => {
  try {
    const allPreferences = await _readPreferences();
    const existingIndex = allPreferences.findIndex(
      (p) => p.username === username
    );

    const existing = existingIndex >= 0 ? allPreferences[existingIndex] : null;
    const defaultTorrentPrefs = {
      seedRatio: 1.0,
      autoStartTorrents: true,
      maxActiveTorrents: 5,
      maxTorrentFileSize: 10 * 1024 * 1024,
      maxSingleFileSize: 50 * 1024 * 1024 * 1024,
      maxTotalTorrentSize: 100 * 1024 * 1024 * 1024,
      maxFolderFileCount: 10000,
      maxPathDepth: 10,
      maxDownloadSpeed: -1,
      maxUploadSpeed: -1,
      trackers: [
        "udp://tracker.opentrackr.org:1337/announce",
        "udp://open.demonii.com:1337/announce",
        "udp://tracker.openbittorrent.com:6969/announce",
        "udp://exodus.desync.com:6969/announce",
        "udp://tracker.torrent.eu.org:451/announce",
      ],
      allowCustomTrackers: false,
      encryptMetadata: true,
    };

    const updatedPref: UserPreferences = {
      username,
      particlesEnabled:
        updates.particlesEnabled ?? existing?.particlesEnabled ?? true,
      wandCursorEnabled:
        updates.wandCursorEnabled ?? existing?.wandCursorEnabled ?? true,
      pokemonThemesEnabled:
        updates.pokemonThemesEnabled ?? existing?.pokemonThemesEnabled ?? false,
      e2eEncryptionOnTransfer:
        updates.e2eEncryptionOnTransfer ??
        existing?.e2eEncryptionOnTransfer ??
        true,
      torrentPreferences: updates.torrentPreferences
        ? {
          ...defaultTorrentPrefs,
          ...(existing?.torrentPreferences || {}),
          ...updates.torrentPreferences,
        }
        : existing?.torrentPreferences ?? defaultTorrentPrefs,
    };

    if ("customKeysPath" in updates && updates.customKeysPath) {
      updatedPref.customKeysPath = updates.customKeysPath;
    } else if (
      existingIndex >= 0 &&
      allPreferences[existingIndex].customKeysPath &&
      !keysToRemove?.includes("customKeysPath")
    ) {
      updatedPref.customKeysPath = allPreferences[existingIndex].customKeysPath;
    }

    if (keysToRemove) {
      keysToRemove.forEach((key) => {
        delete (updatedPref as any)[key];
      });
    }

    if (existingIndex >= 0) {
      allPreferences[existingIndex] = updatedPref;
    } else {
      allPreferences.push(updatedPref);
    }

    await _writePreferences(allPreferences);
    return { success: true };
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return { success: false, error: "Failed to update preferences" };
  }
};
