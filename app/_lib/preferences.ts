"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";

export interface UserPreferences {
  username: string;
  particlesEnabled: boolean;
  wandCursorEnabled: boolean;
  pokemonThemesEnabled?: boolean;
  customKeysPath?: string;
  e2eEncryptionOnTransfer?: boolean;
}

const _getPreferencesFile = (): string => {
  return path.join(process.cwd(), "data", "config", "preferences.json");
}

const _readPreferences = async (): Promise<UserPreferences[]> => {
  try {
    const content = await fs.readFile(_getPreferencesFile(), "utf-8");
    if (!content) return [];
    return JSON.parse(content) as UserPreferences[];
  } catch {
    return [];
  }
}

const _writePreferences = async (preferences: UserPreferences[]): Promise<void> => {
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
}

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
    }
  );
}

export const updateUserPreferences = async (
  username: string,
  updates: Partial<Omit<UserPreferences, "username">>
): Promise<{ success: boolean; error?: string }> => {
  try {
    const allPreferences = await _readPreferences();
    const existingIndex = allPreferences.findIndex(
      (p) => p.username === username
    );

    const updatedPref: UserPreferences = {
      username,
      particlesEnabled:
        updates.particlesEnabled ??
        (existingIndex >= 0
          ? allPreferences[existingIndex].particlesEnabled
          : true),
      wandCursorEnabled:
        updates.wandCursorEnabled ??
        (existingIndex >= 0
          ? allPreferences[existingIndex].wandCursorEnabled
          : true),
      pokemonThemesEnabled:
        updates.pokemonThemesEnabled ??
        (existingIndex >= 0
          ? allPreferences[existingIndex].pokemonThemesEnabled
          : false),
      customKeysPath:
        updates.customKeysPath ??
        (existingIndex >= 0
          ? allPreferences[existingIndex].customKeysPath
          : undefined),
      e2eEncryptionOnTransfer:
        updates.e2eEncryptionOnTransfer ??
        (existingIndex >= 0
          ? allPreferences[existingIndex].e2eEncryptionOnTransfer
          : true),
    };

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
}
