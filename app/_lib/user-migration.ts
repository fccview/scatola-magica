import "server-only";

import path from "path";
import {
  AUDIT_LOG_DIR,
  KEYS_DIR,
  TORRENT_FILE_SUFFIXES,
  TORRENTS_DATA_DIR,
} from "@/app/_lib/data-paths";
import {
  deletePreferences,
  getUserPreferences,
  renamePreferences,
} from "@/app/_lib/preferences-store";
import { renameIfExists, userFolder } from "@/app/_lib/user-files";
import { readJson } from "@/app/_lib/json-store";
import { isInside } from "@/app/_lib/storage";
import fs from "fs/promises";
import { logger } from "@/app/_lib/logger";

export const migrateUserData = async (
  from: string,
  to: string,
  isAdmin: boolean
): Promise<void> => {
  const { customKeysPath } = await getUserPreferences(from);
  const keysBase = customKeysPath || KEYS_DIR;

  await renamePreferences(from, to);
  await renameIfExists(path.join(keysBase, from), path.join(keysBase, to));
  await renameIfExists(
    path.join(AUDIT_LOG_DIR, `${from}.jsonl`),
    path.join(AUDIT_LOG_DIR, `${to}.jsonl`)
  );

  for (const suffix of TORRENT_FILE_SUFFIXES) {
    await renameIfExists(
      path.join(TORRENTS_DATA_DIR, `${from}${suffix}`),
      path.join(TORRENTS_DATA_DIR, `${to}${suffix}`)
    );
  }

  if (!isAdmin) await renameIfExists(userFolder(from), userFolder(to));
};

const _remove = async (target: string): Promise<void> => {
  try {
    await fs.rm(target, { recursive: true, force: true });
  } catch (error) {
    logger.error("user-migration", `Failed to remove ${target}`, error);
  }
};

const _torrentFiles = async (username: string): Promise<string[]> => {
  const created = await readJson<{ torrentFilePath?: string }[]>(
    path.join(TORRENTS_DATA_DIR, `${username}-created.json`),
    []
  ).catch(() => []);

  return created
    .map((torrent) => path.resolve(torrent.torrentFilePath ?? ""))
    .filter((file) => isInside(TORRENTS_DATA_DIR, file) && file !== TORRENTS_DATA_DIR);
};

export const purgeUserData = async (username: string): Promise<void> => {
  const { customKeysPath } = await getUserPreferences(username);

  await _remove(path.join(customKeysPath || KEYS_DIR, username));

  for (const file of await _torrentFiles(username)) {
    await _remove(file);
  }

  for (const suffix of TORRENT_FILE_SUFFIXES) {
    await _remove(path.join(TORRENTS_DATA_DIR, `${username}${suffix}`));
  }

  await deletePreferences(username);
};
