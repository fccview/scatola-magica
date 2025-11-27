import fs from "fs/promises";
import path from "path";
import { lock, unlock } from "proper-lockfile";
import type { User } from "@/app/_types";

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
