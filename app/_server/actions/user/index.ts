"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { cookies } from "next/headers";
import type { User } from "@/app/_types";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import { generateApiKey } from "@/app/_lib/auth-utils";

const _getAuthConfigDir = (): string => {
  return path.join(process.cwd(), "data", "config");
}

const _getUsersFile = (): string => {
  return path.join(_getAuthConfigDir(), "users.json");
}

const _getSessionsFile = (): string => {
  return path.join(_getAuthConfigDir(), "sessions.json");
}

const _readJsonFile = async <T>(filePath: string): Promise<T | null> => {
  try {
    const content = await fs.readFile(filePath, "utf-8");
    if (!content) {
      return null;
    }
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

const _writeJsonFile = async <T>(filePath: string, data: T): Promise<void> => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export const ensureAuthDir = async (): Promise<void> => {
  const configDir = _getAuthConfigDir();
  await fs.mkdir(configDir, { recursive: true });
  await fs.mkdir(path.join(configDir, "avatars"), { recursive: true });
}

export const readUsers = async (): Promise<User[]> => {
  await ensureAuthDir();
  const users = await _readJsonFile<User[]>(_getUsersFile());
  return users || [];
}

export const writeUsers = async (users: User[]): Promise<void> => {
  await ensureAuthDir();
  const usersFile = _getUsersFile();
  try {
    await fs.access(usersFile);
  } catch {
    await _writeJsonFile(usersFile, []);
  }
  await lock(usersFile);
  try {
    await _writeJsonFile(usersFile, users);
  } finally {
    await unlock(usersFile);
  }
}

export const readSessions = async (): Promise<Record<string, string>> => {
  await ensureAuthDir();
  const sessions = await _readJsonFile<Record<string, string>>(
    _getSessionsFile()
  );
  return sessions || {};
}

export const writeSessions = async (
  sessions: Record<string, string>
): Promise<void> => {
  await ensureAuthDir();
  const sessionsFile = _getSessionsFile();
  try {
    await fs.access(sessionsFile);
  } catch {
    await _writeJsonFile(sessionsFile, {});
  }
  await lock(sessionsFile);
  try {
    await _writeJsonFile(sessionsFile, sessions);
  } finally {
    await unlock(sessionsFile);
  }
}

export const getSessionUsername = async (
  sessionId: string
): Promise<string | null> => {
  const sessions = await readSessions();
  return sessions[sessionId] || null;
}

export const createSession = async (
  sessionId: string,
  username: string
): Promise<void> => {
  const sessions = await readSessions();
  sessions[sessionId] = username;
  await writeSessions(sessions);
}

export const deleteSession = async (sessionId: string): Promise<void> => {
  const sessions = await readSessions();
  delete sessions[sessionId];
  await writeSessions(sessions);
}

export const hasUsers = async (): Promise<boolean> => {
  const users = await readUsers();
  return users.length > 0;
}

export const isOidcAvailable = async (): Promise<boolean> => {
  const issuer = process.env.OIDC_ISSUER || "";
  const clientId = process.env.OIDC_CLIENT_ID || "";
  return !!(issuer && clientId);
}

export const isPasswordLoginDisabled = async (): Promise<boolean> => {
  return process.env.DISABLE_PASSWORD_LOGIN === "true";
}

export const getCurrentUser = async (): Promise<{
  username: string;
  isAdmin: boolean;
  avatar?: string;
} | null> => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(COOKIE_NAME)?.value;
  if (!sessionId) {
    return null;
  }
  const username = await getSessionUsername(sessionId);
  if (!username) {
    return null;
  }
  const users = await readUsers();
  const user = users.find((u) => u.username === username);
  if (!user) {
    return null;
  }
  return {
    username: user.username,
    isAdmin: user.isAdmin || false,
    avatar: user.avatar,
  };
}

export const createUser = async (
  username: string,
  password: string,
  isAdmin: boolean
): Promise<{ success: boolean; error?: string }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await readUsers();
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return { success: false, error: "User already exists" };
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 10);

  let encryptionKey: string;
  if (process.env.ENCRYPTION_KEY) {
    encryptionKey = process.env.ENCRYPTION_KEY;
  } else {
    const crypto = await import("crypto");
    encryptionKey = crypto.randomUUID().slice(0, 13);
  }

  users.push({
    username,
    passwordHash,
    isAdmin,
    createdAt: new Date().toISOString(),
    encryptionKey,
  });

  await writeUsers(users);

  if (!isAdmin) {
    try {
      const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
      const userFolderPath = path.isAbsolute(uploadDir)
        ? path.join(uploadDir, username)
        : path.join(process.cwd(), uploadDir, username);
      await fs.mkdir(userFolderPath, { recursive: true });
    } catch (error) {
      console.error("Failed to create user folder:", error);
    }
  }

  return { success: true };
}

export const changePassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  if (newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const bcrypt = await import("bcryptjs");
  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Current password is incorrect" };
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 10);
  user.passwordHash = newPasswordHash;

  await writeUsers(users);
  return { success: true };
}

export const changeUsername = async (
  newUsername: string
): Promise<{ success: boolean; error?: string }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  if (!newUsername || newUsername.trim().length === 0) {
    return { success: false, error: "Username is required" };
  }

  const users = await readUsers();
  const existingUser = users.find((u) => u.username === newUsername.trim());
  if (existingUser) {
    return { success: false, error: "Username already exists" };
  }

  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (!user.isAdmin) {
    try {
      const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
      const baseDir = path.isAbsolute(uploadDir)
        ? uploadDir
        : path.join(process.cwd(), uploadDir);
      const oldFolderPath = path.join(baseDir, currentUser.username);
      const newFolderPath = path.join(baseDir, newUsername.trim());

      try {
        await fs.access(oldFolderPath);
        await fs.rename(oldFolderPath, newFolderPath);
      } catch (error) {
        console.error("Failed to rename user folder:", error);
      }
    } catch (error) {
      console.error("Error handling user folder:", error);
    }
  }

  const sessions = await readSessions();
  const sessionEntries = Object.entries(sessions);
  for (const [sessionId, username] of sessionEntries) {
    if (username === currentUser.username) {
      sessions[sessionId] = newUsername.trim();
    }
  }
  await writeSessions(sessions);

  user.username = newUsername.trim();
  await writeUsers(users);

  return { success: true };
}

export const updateAvatar = async (
  base64Data: string,
  filename: string
): Promise<{ success: boolean; error?: string }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const avatarsDir = path.join(process.cwd(), "data", "config", "avatars");
  await fs.mkdir(avatarsDir, { recursive: true });

  const ext = path.extname(filename);
  const avatarFilename = `${currentUser.username}${ext}`;
  const avatarPath = path.join(avatarsDir, avatarFilename);

  if (user.avatar) {
    const oldAvatarPath = path.join(avatarsDir, user.avatar);
    try {
      await fs.unlink(oldAvatarPath);
    } catch (error) {
      console.error("Failed to delete old avatar:", error);
    }
  }

  const buffer = Buffer.from(base64Data, "base64");
  await fs.writeFile(avatarPath, buffer);

  user.avatar = avatarFilename;
  await writeUsers(users);

  return { success: true };
}

export const removeAvatar = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (user.avatar) {
    const avatarsDir = path.join(process.cwd(), "data", "config", "avatars");
    const avatarPath = path.join(avatarsDir, user.avatar);
    try {
      await fs.unlink(avatarPath);
    } catch (error) {
      console.error("Failed to delete avatar:", error);
    }
  }

  user.avatar = undefined;
  await writeUsers(users);

  return { success: true };
}

export const deleteUser = async (
  username: string
): Promise<{ success: boolean; error?: string }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  if (currentUser.username === username) {
    return { success: false, error: "Cannot delete your own account" };
  }

  const users = await readUsers();
  const userToDelete = users.find((u) => u.username === username);
  if (!userToDelete) {
    return { success: false, error: "User not found" };
  }

  if (userToDelete.isSuperAdmin) {
    return { success: false, error: "Cannot delete super admin" };
  }

  const sessions = await readSessions();
  const sessionEntries = Object.entries(sessions);
  for (const [sessionId, sessionUsername] of sessionEntries) {
    if (sessionUsername === username) {
      delete sessions[sessionId];
    }
  }
  await writeSessions(sessions);

  if (userToDelete.avatar) {
    const avatarsDir = path.join(process.cwd(), "data", "config", "avatars");
    const avatarPath = path.join(avatarsDir, userToDelete.avatar);
    try {
      await fs.unlink(avatarPath);
    } catch (error) {
      console.error("Failed to delete avatar:", error);
    }
  }

  if (!userToDelete.isAdmin) {
    try {
      const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
      const userFolderPath = path.isAbsolute(uploadDir)
        ? path.join(uploadDir, username)
        : path.join(process.cwd(), uploadDir, username);
      await fs.rm(userFolderPath, { recursive: true, force: true });
    } catch (error) {
      console.error("Failed to delete user folder:", error);
    }
  }

  const updatedUsers = users.filter((u) => u.username !== username);
  await writeUsers(updatedUsers);

  return { success: true };
}

export const updateUser = async (
  username: string,
  updates: { password?: string; isAdmin?: boolean }
): Promise<{ success: boolean; error?: string }> => {
  const currentUser = await getCurrentUser();
  if (!currentUser || !currentUser.isAdmin) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  if (user.isSuperAdmin && currentUser.username !== username) {
    return { success: false, error: "Cannot modify super admin" };
  }

  if (updates.password) {
    if (updates.password.length < 6) {
      return {
        success: false,
        error: "Password must be at least 6 characters",
      };
    }
    const bcrypt = await import("bcryptjs");
    user.passwordHash = await bcrypt.hash(updates.password, 10);
  }

  if (updates.isAdmin !== undefined) {
    if (user.isSuperAdmin) {
      return { success: false, error: "Cannot change super admin role" };
    }
    const wasAdmin = user.isAdmin;
    user.isAdmin = updates.isAdmin;

    if (!wasAdmin && updates.isAdmin) {
      try {
        const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
        const userFolderPath = path.isAbsolute(uploadDir)
          ? path.join(uploadDir, username)
          : path.join(process.cwd(), uploadDir, username);
        await fs.rm(userFolderPath, { recursive: true, force: true });
      } catch (error) {
        console.error("Failed to delete user folder:", error);
      }
    } else if (wasAdmin && !updates.isAdmin) {
      try {
        const uploadDir = process.env.UPLOAD_DIR || "./data/uploads";
        const userFolderPath = path.isAbsolute(uploadDir)
          ? path.join(uploadDir, username)
          : path.join(process.cwd(), uploadDir, username);
        await fs.mkdir(userFolderPath, { recursive: true });
      } catch (error) {
        console.error("Failed to create user folder:", error);
      }
    }
  }

  await writeUsers(users);
  return { success: true };
}

export const createApiKey = async (): Promise<{
  success: boolean;
  apiKey?: string;
  error?: string;
}> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const apiKey = await generateApiKey(user.username, user.isAdmin || false);
  user.apiKey = apiKey;

  await writeUsers(users);

  return { success: true, apiKey };
}

export const regenerateApiKey = async (): Promise<{
  success: boolean;
  apiKey?: string;
  error?: string;
}> => {
  return createApiKey();
}

export const deleteApiKey = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  user.apiKey = undefined;
  await writeUsers(users);

  return { success: true };
}

export const getApiKey = async (): Promise<{
  hasApiKey: boolean;
  apiKey?: string;
}> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { hasApiKey: false };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { hasApiKey: false };
  }

  return {
    hasApiKey: !!user.apiKey,
    apiKey: user.apiKey,
  };
}

export const ensureEncryptionPassword = async (
  username: string
): Promise<string> => {
  const users = await readUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.encryptionKey) {
    return user.encryptionKey;
  }

  let encryptionKey: string;

  if (process.env.ENCRYPTION_KEY) {
    encryptionKey = process.env.ENCRYPTION_KEY;
  } else {
    const crypto = await import("crypto");
    encryptionKey = crypto.randomUUID().slice(0, 13);
  }

  user.encryptionKey = encryptionKey;
  await writeUsers(users);

  return encryptionKey;
}

export const getEncryptionKey = async (): Promise<{
  hasEncryptionKey: boolean;
  encryptionKey?: string;
}> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { hasEncryptionKey: false };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { hasEncryptionKey: false };
  }

  return {
    hasEncryptionKey: !!user.encryptionKey,
    encryptionKey: user.encryptionKey,
  };
}

export const regenerateEncryptionKey = async (): Promise<{
  success: boolean;
  encryptionKey?: string;
  error?: string;
}> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized" };
  }

  const users = await readUsers();
  const user = users.find((u) => u.username === currentUser.username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const crypto = await import("crypto");
  const encryptionKey = crypto.randomUUID().slice(0, 13);

  user.encryptionKey = encryptionKey;
  await writeUsers(users);

  return { success: true, encryptionKey };
}
