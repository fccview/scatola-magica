import "server-only";

import path from "path";
import crypto from "crypto";
import type { PublicUser, User } from "@/app/_types";
import { readJson, updateJson } from "@/app/_lib/json-store";

export const CONFIG_DIR = path.join(process.cwd(), "data", "config");
export const AVATARS_DIR = path.join(CONFIG_DIR, "avatars");

const USERS_FILE = path.join(CONFIG_DIR, "users.json");
const SESSIONS_FILE = path.join(CONFIG_DIR, "sessions.json");
const API_KEY_PREFIX = "ck_";
const USERNAME_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._@+-]{0,63}$/;
const RESERVED_USERNAMES = ["temp"];

type SessionMap = Record<string, string>;

export const isValidUsername = (username: unknown): username is string =>
  typeof username === "string" &&
  USERNAME_PATTERN.test(username) &&
  !username.includes("..") &&
  !RESERVED_USERNAMES.includes(username.toLowerCase());

export const toPublicUser = (user: User): PublicUser => ({
  username: user.username,
  isAdmin: user.isAdmin,
  isSuperAdmin: user.isSuperAdmin,
  createdAt: user.createdAt,
  avatar: user.avatar,
});

export const readUsers = (): Promise<User[]> => readJson<User[]>(USERS_FILE, []);

export const updateUsers = <R>(
  mutate: (users: User[]) => R | Promise<R>
): Promise<R> => updateJson<User[], R>(USERS_FILE, [], mutate);

export const findUser = async (username: string): Promise<User | null> => {
  const users = await readUsers();
  return users.find((u) => u.username === username) ?? null;
};

export const readSessions = (): Promise<SessionMap> =>
  readJson<SessionMap>(SESSIONS_FILE, {});

export const updateSessions = <R>(
  mutate: (sessions: SessionMap) => R | Promise<R>
): Promise<R> => updateJson<SessionMap, R>(SESSIONS_FILE, {}, mutate);

export const getSessionUsername = async (
  sessionId: string
): Promise<string | null> => {
  const sessions = await readSessions();
  return Object.hasOwn(sessions, sessionId) ? sessions[sessionId] : null;
};

export const createSession = (
  sessionId: string,
  username: string
): Promise<void> =>
  updateSessions((sessions) => {
    sessions[sessionId] = username;
  });

export const deleteSession = (sessionId: string): Promise<void> =>
  updateSessions((sessions) => {
    delete sessions[sessionId];
  });

export const dropUserSessions = (username: string): Promise<void> =>
  updateSessions((sessions) => {
    for (const [id, owner] of Object.entries(sessions)) {
      if (owner === username) delete sessions[id];
    }
  });

export const newSessionId = (): string =>
  crypto.randomBytes(32).toString("base64url");

export const newEncryptionKey = (): string =>
  process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString("hex");

export const generateApiKey = (): string =>
  `${API_KEY_PREFIX}${crypto.randomBytes(24).toString("base64url")}`;

const _sameKey = (a: string, b: string): boolean => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

export const verifyApiKey = async (apiKey: string): Promise<User | null> => {
  if (!apiKey.startsWith(API_KEY_PREFIX)) return null;

  const users = await readUsers();
  return users.find((u) => !!u.apiKey && _sameKey(u.apiKey, apiKey)) ?? null;
};
