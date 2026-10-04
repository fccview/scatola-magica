"use server";

import type { AppSettings } from "@/app/_types/app-settings";
import { getCurrentUser } from "@/app/_lib/current-user";
import {
  DEFAULT_APP_SETTINGS,
  readAppSettings,
  writeAppSettings,
} from "@/app/_lib/app-settings-store";
import { auditLog } from "@/app/_lib/audit-log";
import { logger } from "@/app/_lib/logger";

export type { AppSettings } from "@/app/_types/app-settings";

const SCOPE = "app-settings";

const _positiveInt = (value: unknown, fallback: number): number => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const getAppSettings = async (): Promise<AppSettings> => {
  if (!(await getCurrentUser())) return DEFAULT_APP_SETTINGS;
  return readAppSettings();
};

export const updateAppSettings = async (
  updates: Partial<AppSettings>
): Promise<{ success: boolean; error?: string }> => {
  const user = await getCurrentUser();
  if (!user?.isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const current = await readAppSettings();
    const upload = { ...current.upload, ...updates.upload };

    await writeAppSettings({
      upload: {
        maxChunkSize: _positiveInt(upload.maxChunkSize, current.upload.maxChunkSize),
        parallelUploads: _positiveInt(upload.parallelUploads, current.upload.parallelUploads),
        maxFileSize: _positiveInt(upload.maxFileSize, current.upload.maxFileSize),
      },
    });

    await auditLog("settings:update", { details: { upload }, success: true });
    return { success: true };
  } catch (error) {
    logger.error(SCOPE, "Failed to update app settings", error);
    return { success: false, error: "Failed to update app settings" };
  }
};
