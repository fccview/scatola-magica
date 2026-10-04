import "server-only";

import path from "path";
import type { TorrentPreferences } from "@/app/_types/torrent";
import {
  DropzonePreferences,
  PartialUserPreferences,
  RemovablePreference,
  UserPreferences,
} from "@/app/_types/preferences";
import { CONFIG_DIR } from "@/app/_lib/auth-utils";
import { readJson, updateJson } from "@/app/_lib/json-store";

const PREFERENCES_FILE = path.join(CONFIG_DIR, "preferences.json");

export const DEFAULT_TRACKERS = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.demonii.com:1337/announce",
  "udp://tracker.openbittorrent.com:6969/announce",
  "udp://exodus.desync.com:6969/announce",
  "udp://tracker.torrent.eu.org:451/announce",
];

export const DEFAULT_TORRENT_PREFERENCES: TorrentPreferences = {
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
  trackers: DEFAULT_TRACKERS,
  allowCustomTrackers: false,
};

const DEFAULT_DROPZONES: DropzonePreferences = {
  enabled: false,
  zone1: "",
  zone2: "",
  zone3: "",
  zone4: "",
};

const _defaults = (username: string): UserPreferences => ({
  username,
  particlesEnabled: true,
  wandCursorEnabled: true,
  pokemonThemesEnabled: false,
  e2eEncryptionOnTransfer: true,
  showThumbnails: false,
  torrentPreferences: { ...DEFAULT_TORRENT_PREFERENCES },
  dropzones: { ...DEFAULT_DROPZONES },
});

const _readAll = (): Promise<UserPreferences[]> =>
  readJson<UserPreferences[]>(PREFERENCES_FILE, []);

export const getUserPreferences = async (
  username: string
): Promise<UserPreferences> => {
  const all = await _readAll();
  return all.find((p) => p.username === username) ?? _defaults(username);
};

const _merge = (
  username: string,
  existing: UserPreferences | undefined,
  updates: PartialUserPreferences
): UserPreferences => {
  const base = existing ?? _defaults(username);
  const { torrentPreferences, dropzones, ...flat } = updates;

  return {
    ...base,
    ...flat,
    username,
    torrentPreferences: {
      ...DEFAULT_TORRENT_PREFERENCES,
      ...base.torrentPreferences,
      ...torrentPreferences,
    },
    dropzones: { ...DEFAULT_DROPZONES, ...base.dropzones, ...dropzones },
  };
};

export const savePreferences = (
  username: string,
  updates: PartialUserPreferences,
  keysToRemove: RemovablePreference[] = []
): Promise<void> =>
  updateJson<UserPreferences[]>(PREFERENCES_FILE, [], (all) => {
    const index = all.findIndex((p) => p.username === username);
    const merged = _merge(username, all[index], updates);

    for (const key of keysToRemove) {
      delete merged[key];
    }

    if (index >= 0) {
      all[index] = merged;
    } else {
      all.push(merged);
    }
  });

export const renamePreferences = (from: string, to: string): Promise<void> =>
  updateJson<UserPreferences[]>(PREFERENCES_FILE, [], (all) => {
    const entry = all.find((p) => p.username === from);
    if (entry) entry.username = to;
  });

export const deletePreferences = (username: string): Promise<void> =>
  updateJson<UserPreferences[]>(PREFERENCES_FILE, [], (all) => {
    const index = all.findIndex((p) => p.username === username);
    if (index >= 0) all.splice(index, 1);
  });
