"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { UPLOAD_CONFIG } from "@/app/_lib/constants";

export interface AppSettings {
  upload: {
    maxChunkSize: number;
    parallelUploads: number;
    maxFileSize: number;
  };
}

const _getAppSettingsFile = (): string => {
  return path.join(process.cwd(), "data", "config", "app-settings.json");
};

const _readAppSettings = async (): Promise<AppSettings | null> => {
  try {
    const content = await fs.readFile(_getAppSettingsFile(), "utf-8");
    if (!content) return null;
    return JSON.parse(content) as AppSettings;
  } catch {
    return null;
  }
};

const _writeAppSettings = async (settings: AppSettings): Promise<void> => {
  const file = _getAppSettingsFile();
  try {
    await fs.access(file);
  } catch {
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, JSON.stringify(getDefaultAppSettings(), null, 2));
  }
  await lock(file);
  try {
    await fs.writeFile(file, JSON.stringify(settings, null, 2));
  } finally {
    await unlock(file);
  }
};

const getDefaultAppSettings = (): AppSettings => ({
  upload: {
    maxChunkSize: UPLOAD_CONFIG.MAX_CHUNK_SIZE,
    parallelUploads: UPLOAD_CONFIG.PARALLEL_UPLOADS,
    maxFileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
  },
});

export const getAppSettings = async (): Promise<AppSettings> => {
  const settings = await _readAppSettings();
  return settings || getDefaultAppSettings();
};

export const updateAppSettings = async (
  updates: Partial<AppSettings>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const current = await getAppSettings();
    const updated: AppSettings = {
      upload: {
        ...current.upload,
        ...(updates.upload || {}),
      },
    };
    await _writeAppSettings(updated);
    return { success: true };
  } catch (error) {
    console.error("Failed to update app settings:", error);
    return { success: false, error: "Failed to update app settings" };
  }
};
