import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createSession, findUser, newSessionId } from "@/app/_lib/auth-utils";
import { ensureEncryptionPassword } from "@/app/_lib/current-user";
import {
  clearFailures,
  clientIp,
  isBruteForceEnabled,
  isLockedOut,
  recordFailure,
} from "@/app/_lib/brute-force";
import { isPasswordLoginDisabled } from "@/app/_lib/oidc";
import { setSessionCookie } from "@/app/_lib/session-cookie";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

const SCOPE = "auth-login";
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO5Z8Q0mQ1rN0qNfJm1u7Qw1y0bJp6rWa";

const _invalid = () =>
  NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

export const POST = async (request: NextRequest) => {
  if (isPasswordLoginDisabled()) {
    return NextResponse.json({ error: "Password login is disabled" }, { status: 403 });
  }

  const guard = isBruteForceEnabled();
  const ip = guard ? clientIp(request) : "";

  if (guard && isLockedOut(ip)) {
    return NextResponse.json(
      { error: "Too many failed attempts. Try again later." },
      { status: 429 }
    );
  }

  try {
    const { username, password } = await request.json();

    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const user = await findUser(username);
    const isValid = await bcrypt.compare(password, user?.passwordHash || DUMMY_HASH);

    if (!user?.passwordHash || !isValid) {
      if (guard) recordFailure(ip);
      logger.warn(SCOPE, `Failed login for "${username}"`);
      return _invalid();
    }

    if (guard) clearFailures(ip);

    await ensureEncryptionPassword(user.username);

    const sessionId = newSessionId();
    await createSession(sessionId, user.username);

    const response = NextResponse.json({ success: true, username: user.username });
    setSessionCookie(response, sessionId);
    return response;
  } catch (error) {
    logger.error(SCOPE, "Login failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
