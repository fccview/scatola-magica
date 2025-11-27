"use server";

import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import { cookies } from "next/headers";
import type { User } from "@/app/_types";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";

function getAuthConfigDir(): string {
  return path.join(process.cwd(), "data", "config");
}

function getUsersFile(): string {
  return path.join(getAuthConfigDir(), "users.json");
}

function getSessionsFile(): string {
  return path.join(getAuthConfigDir(), "sessions.json");
}

export async function ensureAuthDir(): Promise<void> {
  const configDir = getAuthConfigDir();
  await fs.mkdir(configDir, { recursive: true });
  await fs.mkdir(path.join(configDir, "avatars"), { recursive: true });
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
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

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export async function readUsers(): Promise<User[]> {
  await ensureAuthDir();
  const users = await readJsonFile<User[]>(getUsersFile());
  return users || [];
}

export async function writeUsers(users: User[]): Promise<void> {
  await ensureAuthDir();
  const usersFile = getUsersFile();
  try {
    await fs.access(usersFile);
  } catch {
    await writeJsonFile(usersFile, []);
  }
  await lock(usersFile);
  try {
    await writeJsonFile(usersFile, users);
  } finally {
    await unlock(usersFile);
  }
}

export async function readSessions(): Promise<Record<string, string>> {
  await ensureAuthDir();
  const sessions = await readJsonFile<Record<string, string>>(
    getSessionsFile()
  );
  return sessions || {};
}

export async function writeSessions(
  sessions: Record<string, string>
): Promise<void> {
  await ensureAuthDir();
  const sessionsFile = getSessionsFile();
  try {
    await fs.access(sessionsFile);
  } catch {
    await writeJsonFile(sessionsFile, {});
  }
  await lock(sessionsFile);
  try {
    await writeJsonFile(sessionsFile, sessions);
  } finally {
    await unlock(sessionsFile);
  }
}

export async function getSessionUsername(
  sessionId: string
): Promise<string | null> {
  const sessions = await readSessions();
  return sessions[sessionId] || null;
}

export async function createSession(
  sessionId: string,
  username: string
): Promise<void> {
  const sessions = await readSessions();
  sessions[sessionId] = username;
  await writeSessions(sessions);
}

export async function deleteSession(sessionId: string): Promise<void> {
  const sessions = await readSessions();
  delete sessions[sessionId];
  await writeSessions(sessions);
}

export async function hasUsers(): Promise<boolean> {
  const users = await readUsers();
  return users.length > 0;
}

export async function isOidcAvailable(): Promise<boolean> {
  const issuer = process.env.OIDC_ISSUER || "";
  const clientId = process.env.OIDC_CLIENT_ID || "";
  return !!(issuer && clientId);
}

export async function getCurrentUser(): Promise<{
  username: string;
  isAdmin: boolean;
  avatar?: string;
} | null> {
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

export async function createUser(
  username: string,
  password: string,
  isAdmin: boolean
): Promise<{ success: boolean; error?: string }> {
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

  users.push({
    username,
    passwordHash,
    isAdmin,
    createdAt: new Date().toISOString(),
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

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; error?: string }> {
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

export async function changeUsername(
  newUsername: string
): Promise<{ success: boolean; error?: string }> {
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

export async function updateAvatar(
  base64Data: string,
  filename: string
): Promise<{ success: boolean; error?: string }> {
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

export async function removeAvatar(): Promise<{
  success: boolean;
  error?: string;
}> {
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

export async function deleteUser(
  username: string
): Promise<{ success: boolean; error?: string }> {
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

export async function updateUser(
  username: string,
  updates: { password?: string; isAdmin?: boolean }
): Promise<{ success: boolean; error?: string }> {
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
