"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";

export interface UserPreferences {
  username: string;
  particlesEnabled: boolean;
  wandCursorEnabled: boolean;
}

function getPreferencesFile(): string {
  return path.join(process.cwd(), "data", "config", "preferences.json");
}

async function readPreferences(): Promise<UserPreferences[]> {
  try {
    const content = await fs.readFile(getPreferencesFile(), "utf-8");
    if (!content) return [];
    return JSON.parse(content) as UserPreferences[];
  } catch {
    return [];
  }
}

async function writePreferences(
  preferences: UserPreferences[]
): Promise<void> {
  const file = getPreferencesFile();
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

export async function getUserPreferences(
  username: string
): Promise<UserPreferences> {
  const allPreferences = await readPreferences();
  const userPref = allPreferences.find((p) => p.username === username);
  return (
    userPref || {
      username,
      particlesEnabled: true,
      wandCursorEnabled: true,
    }
  );
}

export async function updateUserPreferences(
  username: string,
  updates: Partial<Omit<UserPreferences, "username">>
): Promise<{ success: boolean; error?: string }> {
  try {
    const allPreferences = await readPreferences();
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
    };

    if (existingIndex >= 0) {
      allPreferences[existingIndex] = updatedPref;
    } else {
      allPreferences.push(updatedPref);
    }

    await writePreferences(allPreferences);
    return { success: true };
  } catch (error) {
    console.error("Failed to update preferences:", error);
    return { success: false, error: "Failed to update preferences" };
  }
}
