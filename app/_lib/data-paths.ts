import "server-only";

import path from "path";

export const KEYS_DIR = path.resolve(
  process.env.KEYS_DIR || path.join(process.cwd(), "data", "config", "keys")
);

export const TORRENTS_DATA_DIR = path.resolve(
  process.env.TORRENTS_DATA_DIR || "./data/config/torrents"
);

export const AUDIT_LOG_DIR = path.resolve(
  process.env.AUDIT_LOG_DIR || path.join(process.cwd(), "data", "audit-logs")
);

export const TORRENT_FILE_SUFFIXES = [
  "-sessions.json",
  "-sessions.json.pgp",
  "-created.json",
  "-created.json.pgp",
];
