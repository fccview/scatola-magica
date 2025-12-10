import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import type { User } from "@/app/_types";
import crypto from "crypto";

function getAuthConfigDir(): string {
  return path.join(process.cwd(), "data", "config");
}

function getUsersFile(): string {
  return path.join(getAuthConfigDir(), "users.json");
}

function getSessionsFile(): string {
  return path.join(getAuthConfigDir(), "sessions.json");
}

export const ensureAuthDir = async (): Promise<void> => {
  await fs.mkdir(getAuthConfigDir(), { recursive: true });
}

export const readJsonFile = async <T>(filePath: string): Promise<T | null> => {
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

export const writeJsonFile = async <T>(
  filePath: string,
  data: T
): Promise<void> => {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

export const readUsers = async (): Promise<User[]> => {
  await ensureAuthDir();
  const users = await readJsonFile<User[]>(getUsersFile());
  return users || [];
}

export const writeUsers = async (users: User[]): Promise<void> => {
  await ensureAuthDir();
  const usersFile = getUsersFile();
  await lock(usersFile);
  try {
    await writeJsonFile(usersFile, users);
  } finally {
    await unlock(usersFile);
  }
}

export const readSessions = async (): Promise<Record<string, string>> => {
  await ensureAuthDir();
  const sessions = await readJsonFile<Record<string, string>>(
    getSessionsFile()
  );
  return sessions || {};
}

export const writeSessions = async (
  sessions: Record<string, string>
): Promise<void> => {
  await ensureAuthDir();
  const sessionsFile = getSessionsFile();
  await lock(sessionsFile);
  try {
    await writeJsonFile(sessionsFile, sessions);
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

export const generateApiKey = async (
  username: string,
  isAdmin: boolean
): Promise<string> => {
  const randomBytes = crypto.randomBytes(24);
  const randomString = randomBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `ck_${randomString}`;
}

export const verifyApiKey = async (
  apiKey: string
): Promise<{ username: string; isAdmin: boolean } | null> => {
  try {
    if (!apiKey.startsWith("ck_")) {
      return null;
    }

    const users = await readUsers();
    const user = users.find((u) => u.apiKey === apiKey);

    if (!user) {
      return null;
    }

    return {
      username: user.username,
      isAdmin: user.isAdmin || false,
    };
  } catch {
    return null;
  }
}
