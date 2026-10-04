"use server";

import fs from "fs/promises";
import path from "path";
import bcrypt from "bcryptjs";
import type { PublicUser } from "@/app/_types";
import {
  generateApiKey,
  isValidUsername,
  readUsers,
  toPublicUser,
  updateSessions,
  updateUsers,
  AVATARS_DIR,
} from "@/app/_lib/auth-utils";
import { getCurrentUser, getUserRecord } from "@/app/_lib/current-user";
import {
  AVATAR_EXTENSIONS,
  MAX_AVATAR_BYTES,
  removeAvatarFile,
} from "@/app/_lib/user-files";
import { migrateUserData } from "@/app/_lib/user-migration";
import { auditLog } from "@/app/_lib/audit-log";
import { logger } from "@/app/_lib/logger";
import {
  ActionResult,
  BCRYPT_ROUNDS,
  COLOR_MODES,
  ColorMode,
  MIN_PASSWORD_LENGTH,
  POKEMON_THEMES,
} from "@/app/_server/actions/user/constants";

const SCOPE = "user-actions";
const UNAUTHORIZED: ActionResult = { success: false, error: "Unauthorized" };

export const listUsers = async (): Promise<PublicUser[]> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return [];

  const users = await readUsers();
  const visible = currentUser.isAdmin
    ? users
    : users.filter((u) => u.username === currentUser.username);

  return visible.map(toPublicUser);
};

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ActionResult> => {
  const record = await getUserRecord();
  if (!record) return UNAUTHORIZED;

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  const isValid =
    !!record.passwordHash &&
    (await bcrypt.compare(currentPassword, record.passwordHash));

  if (!isValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await updateUsers((users) => {
    const user = users.find((u) => u.username === record.username);
    if (user) user.passwordHash = passwordHash;
  });

  await auditLog("auth:password_change", { success: true });
  return { success: true };
};

export const changeUsername = async (
  newUsername: string
): Promise<ActionResult> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  const target = typeof newUsername === "string" ? newUsername.trim() : "";
  if (!isValidUsername(target)) {
    return { success: false, error: "Invalid username" };
  }

  const renamed = await updateUsers((users) => {
    if (users.some((u) => u.username === target)) return false;

    const user = users.find((u) => u.username === currentUser.username);
    if (!user) return false;

    user.username = target;
    return true;
  });

  if (!renamed) {
    return { success: false, error: "Username already exists" };
  }

  await updateSessions((sessions) => {
    for (const [id, owner] of Object.entries(sessions)) {
      if (owner === currentUser.username) sessions[id] = target;
    }
  });

  await migrateUserData(currentUser.username, target, currentUser.isAdmin);
  return { success: true };
};

export const updateAvatar = async (
  base64Data: string,
  filename: string
): Promise<ActionResult> => {
  const record = await getUserRecord();
  if (!record) return UNAUTHORIZED;

  const extension = path.extname(String(filename)).toLowerCase();
  if (!AVATAR_EXTENSIONS.includes(extension)) {
    return { success: false, error: "Unsupported image type" };
  }

  const buffer = Buffer.from(String(base64Data), "base64");
  if (buffer.length === 0 || buffer.length > MAX_AVATAR_BYTES) {
    return { success: false, error: "Image must be smaller than 2MB" };
  }

  try {
    await fs.mkdir(AVATARS_DIR, { recursive: true });
    await removeAvatarFile(record.avatar);

    const avatarFilename = `${record.username}-${Date.now()}${extension}`;
    await fs.writeFile(path.join(AVATARS_DIR, avatarFilename), buffer);

    await updateUsers((users) => {
      const user = users.find((u) => u.username === record.username);
      if (user) user.avatar = avatarFilename;
    });

    return { success: true };
  } catch (error) {
    logger.error(SCOPE, "Failed to update avatar", error);
    return { success: false, error: "Failed to update avatar" };
  }
};

export const removeAvatar = async (): Promise<ActionResult> => {
  const record = await getUserRecord();
  if (!record) return UNAUTHORIZED;

  await removeAvatarFile(record.avatar);
  await updateUsers((users) => {
    const user = users.find((u) => u.username === record.username);
    if (user) user.avatar = undefined;
  });

  return { success: true };
};

const _setApiKey = async (
  username: string,
  apiKey: string | undefined
): Promise<void> =>
  updateUsers((users) => {
    const user = users.find((u) => u.username === username);
    if (user) user.apiKey = apiKey;
  });

export const createApiKey = async (): Promise<
  ActionResult & { apiKey?: string }
> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  const apiKey = generateApiKey();
  await _setApiKey(currentUser.username, apiKey);
  await auditLog("auth:api_key_generate", { success: true });

  return { success: true, apiKey };
};

export const regenerateApiKey = async (): Promise<
  ActionResult & { apiKey?: string }
> => createApiKey();

export const deleteApiKey = async (): Promise<ActionResult> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  await _setApiKey(currentUser.username, undefined);
  await auditLog("auth:api_key_delete", { success: true });

  return { success: true };
};

export const getApiKey = async (): Promise<{
  hasApiKey: boolean;
  apiKey?: string;
}> => {
  const record = await getUserRecord();
  return { hasApiKey: !!record?.apiKey, apiKey: record?.apiKey };
};

export const getEncryptionKey = async (): Promise<{
  hasEncryptionKey: boolean;
  encryptionKey?: string;
}> => {
  const record = await getUserRecord();
  return {
    hasEncryptionKey: !!record?.encryptionKey,
    encryptionKey: record?.encryptionKey,
  };
};

export const regenerateEncryptionKey = async (): Promise<
  ActionResult & { encryptionKey?: string }
> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  const crypto = await import("crypto");
  const encryptionKey = crypto.randomBytes(32).toString("hex");

  await updateUsers((users) => {
    const user = users.find((u) => u.username === currentUser.username);
    if (user) user.encryptionKey = encryptionKey;
  });

  return { success: true, encryptionKey };
};

export const updateThemePreferences = async (
  persistentTheme?: boolean,
  pokemonTheme?: string | null,
  colorMode?: ColorMode
): Promise<ActionResult> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  if (pokemonTheme && !POKEMON_THEMES.includes(pokemonTheme)) {
    return { success: false, error: "Unknown theme" };
  }

  if (colorMode !== undefined && !COLOR_MODES.includes(colorMode)) {
    return { success: false, error: "Unknown color mode" };
  }

  await updateUsers((users) => {
    const user = users.find((u) => u.username === currentUser.username);
    if (!user) return;

    if (persistentTheme !== undefined) user.persistentTheme = !!persistentTheme;
    if (pokemonTheme !== undefined) user.pokemonTheme = pokemonTheme;
    if (colorMode !== undefined) user.colorMode = colorMode;
  });

  return { success: true };
};
