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

/**
 * Validates a request and returns the authenticated user if valid
 * Checks both session cookies and API key headers
 */
export async function validateRequest(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  // Check for API key in Authorization header first
  const authHeader = request.headers.get("Authorization");

  if (authHeader?.startsWith("Bearer ")) {
    const apiKey = authHeader.slice(7).trim();
    const apiKeyResult = await verifyApiKey(apiKey);

    if (apiKeyResult) {
      const users = await readUsers();
      const user = users.find(u => u.username === apiKeyResult.username);

      if (user) {
        return {
          username: user.username,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          authMethod: "apikey"
        };
      }
    }
  }

  // Fallback to session cookie
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session") || cookieStore.get("__Host-session");

  if (sessionCookie?.value) {
    const username = await getSessionUsername(sessionCookie.value);

    if (username) {
      const users = await readUsers();
      const user = users.find(u => u.username === username);

      if (user) {
        return {
          username: user.username,
          isAdmin: user.isAdmin,
          isSuperAdmin: user.isSuperAdmin,
          authMethod: "session"
        };
      }
    }
  }

  return null;
}

/**
 * Checks if a request is coming from internal app (has session, not API key)
 * Used to restrict certain endpoints to browser-only access
 */
export async function isInternalRequest(request: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session") || cookieStore.get("__Host-session");

  if (!sessionCookie?.value) {
    return false;
  }

  const username = await getSessionUsername(sessionCookie.value);
  return username !== null;
}
