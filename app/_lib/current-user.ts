import "server-only";

import { cookies } from "next/headers";
import type { CurrentUser, User } from "@/app/_types";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import {
  findUser,
  getSessionUsername,
  newEncryptionKey,
  readUsers,
  updateUsers,
} from "@/app/_lib/auth-utils";

const _toCurrentUser = (user: User): CurrentUser => ({
  username: user.username,
  isAdmin: !!user.isAdmin,
  isSuperAdmin: !!user.isSuperAdmin,
  avatar: user.avatar,
  persistentTheme: user.persistentTheme ?? false,
  pokemonTheme: user.pokemonTheme,
  colorMode: user.colorMode,
});

export const getSessionId = async (): Promise<string | null> => {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
};

export const getUserRecord = async (): Promise<User | null> => {
  const sessionId = await getSessionId();
  if (!sessionId) return null;

  const username = await getSessionUsername(sessionId);
  if (!username) return null;

  return findUser(username);
};

export const getCurrentUser = async (): Promise<CurrentUser | null> => {
  const user = await getUserRecord();
  return user ? _toCurrentUser(user) : null;
};

export const hasUsers = async (): Promise<boolean> => {
  const users = await readUsers();
  return users.length > 0;
};

export const ensureEncryptionPassword = (username: string): Promise<string> =>
  updateUsers((users) => {
    const user = users.find((u) => u.username === username);
    if (!user) throw new Error("User not found");

    user.encryptionKey ||= newEncryptionKey();
    return user.encryptionKey;
  });
