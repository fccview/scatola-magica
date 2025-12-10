import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getSessionUsername, verifyApiKey } from "./auth-utils";
import { readUsers } from "./auth-utils";

export interface AuthenticatedUser {
  username: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  authMethod: "session" | "apikey";
}

export const validateRequest = async (
  request: NextRequest
): Promise<AuthenticatedUser | null> => {
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    const apiKeyResult = await verifyApiKey(apiKey);

    if (apiKeyResult) {
      const users = await readUsers();
      const user = users.find((u) => u.username === apiKeyResult.username);

      if (user) {
        return {
          username: user.username,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          authMethod: "apikey",
        };
      }
    }
  }

  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get("session") || cookieStore.get("__Host-session");

  if (sessionCookie?.value) {
    const username = await getSessionUsername(sessionCookie.value);

    if (username) {
      const users = await readUsers();
      const user = users.find((u) => u.username === username);

      if (user) {
        return {
          username: user.username,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          authMethod: "session",
        };
      }
    }
  }

  return null;
}

export const isInternalRequest = async (
  request: NextRequest
): Promise<boolean> => {
  const cookieStore = await cookies();
  const sessionCookie =
    cookieStore.get("session") || cookieStore.get("__Host-session");

  if (!sessionCookie?.value) {
    return false;
  }

  const username = await getSessionUsername(sessionCookie.value);
  return username !== null;
}
