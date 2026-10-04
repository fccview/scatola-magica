"use server";

import path from "path";
import {
  PartialUserPreferences,
  RemovablePreference,
} from "@/app/_types/preferences";
import { getCurrentUser } from "@/app/_lib/current-user";
import { savePreferences } from "@/app/_lib/preferences-store";
import { logger } from "@/app/_lib/logger";

export type {
  UserPreferences,
  PartialUserPreferences,
} from "@/app/_types/preferences";

const SCOPE = "preferences";

const _validRemovals = (keys: string[] = []): RemovablePreference[] =>
  keys.filter((key): key is RemovablePreference =>
    Object.values(RemovablePreference).includes(key as RemovablePreference)
  );

export const updateUserPreferences = async (
  updates: PartialUserPreferences,
  keysToRemove?: string[]
): Promise<{ success: boolean; error?: string }> => {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (updates.customKeysPath !== undefined) {
    if (!user.isAdmin) {
      return { success: false, error: "Only admins can set a custom keys path" };
    }
    if (updates.customKeysPath && !path.isAbsolute(updates.customKeysPath)) {
      return { success: false, error: "Custom keys path must be absolute" };
    }
  }

  try {
    await savePreferences(user.username, updates, _validRemovals(keysToRemove));
    return { success: true };
  } catch (error) {
    logger.error(SCOPE, "Failed to update preferences", error);
    return { success: false, error: "Failed to update preferences" };
  }
};
