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

export async function ensureAuthDir(): Promise<void> {
  await fs.mkdir(getAuthConfigDir(), { recursive: true });
}

export async function readJsonFile<T>(filePath: string): Promise<T | null> {
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

export async function writeJsonFile<T>(
  filePath: string,
  data: T
): Promise<void> {
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

// API Key generation and validation
export async function generateApiKey(username: string, isAdmin: boolean): Promise<string> {
  // Generate a random 32-character string (256 bits of entropy)
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 chars in base64url
  const randomString = randomBytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `ck_${randomString}`;
}

export async function verifyApiKey(apiKey: string): Promise<{ username: string; isAdmin: boolean } | null> {
  try {
    // Check if it starts with ck_
    if (!apiKey.startsWith("ck_")) {
      return null;
    }

    // Verify the user still exists and the API key matches
    const users = await readUsers();
    const user = users.find(u => u.apiKey === apiKey);

    if (!user) {
      return null;
    }

    return {
      username: user.username,
      isAdmin: user.isAdmin || false
    };
  } catch {
    return null;
  }
}
