import "server-only";

import path from "path";
import { UPLOAD_CONFIG } from "@/app/_lib/constants";
import { CONFIG_DIR } from "@/app/_lib/auth-utils";
import { readJson, writeJson } from "@/app/_lib/json-store";
import type { AppSettings } from "@/app/_types/app-settings";

const APP_SETTINGS_FILE = path.join(CONFIG_DIR, "app-settings.json");

export const DEFAULT_APP_SETTINGS: AppSettings = {
  upload: {
    maxChunkSize: UPLOAD_CONFIG.MAX_CHUNK_SIZE,
    parallelUploads: UPLOAD_CONFIG.PARALLEL_UPLOADS,
    maxFileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
  },
};

export const readAppSettings = async (): Promise<AppSettings> => {
  const stored = await readJson<AppSettings | null>(APP_SETTINGS_FILE, null);
  return {
    upload: { ...DEFAULT_APP_SETTINGS.upload, ...stored?.upload },
  };
};

export const writeAppSettings = (settings: AppSettings): Promise<void> =>
  writeJson(APP_SETTINGS_FILE, settings);
