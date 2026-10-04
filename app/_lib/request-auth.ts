import "server-only";

import { NextRequest } from "next/server";
import type { User } from "@/app/_types";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import {
  findUser,
  getSessionUsername,
  verifyApiKey,
} from "@/app/_lib/auth-utils";

export enum AuthMethod {
  SESSION = "session",
  API_KEY = "apikey",
}

export interface AuthenticatedUser {
  username: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  authMethod: AuthMethod;
}

const BEARER_PREFIX = "Bearer ";

const _toAuthenticated = (
  user: User,
  authMethod: AuthMethod
): AuthenticatedUser => ({
  username: user.username,
  isAdmin: !!user.isAdmin,
  isSuperAdmin: !!user.isSuperAdmin,
  authMethod,
});

const _fromApiKey = async (
  request: NextRequest
): Promise<AuthenticatedUser | null> => {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith(BEARER_PREFIX)) return null;

  const user = await verifyApiKey(header.slice(BEARER_PREFIX.length).trim());
  return user ? _toAuthenticated(user, AuthMethod.API_KEY) : null;
};

const _fromSession = async (
  request: NextRequest
): Promise<AuthenticatedUser | null> => {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;
  if (!sessionId) return null;

  const username = await getSessionUsername(sessionId);
  if (!username) return null;

  const user = await findUser(username);
  return user ? _toAuthenticated(user, AuthMethod.SESSION) : null;
};

export const validateRequest = async (
  request: NextRequest
): Promise<AuthenticatedUser | null> =>
  (await _fromApiKey(request)) ?? (await _fromSession(request));

