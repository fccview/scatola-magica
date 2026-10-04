import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import {
  findUser,
  getSessionUsername,
  isValidUsername,
  newEncryptionKey,
  updateUsers,
} from "@/app/_lib/auth-utils";
import { isPasswordLoginDisabled } from "@/app/_lib/oidc";
import { createUserFolder } from "@/app/_lib/user-files";
import {
  BCRYPT_ROUNDS,
  MIN_PASSWORD_LENGTH,
} from "@/app/_server/actions/user/constants";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

enum RegisterOutcome {
  CREATED = "created",
  EXISTS = "exists",
  FORBIDDEN = "forbidden",
}

const _isAdminRequest = async (request: NextRequest): Promise<boolean> => {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;
  if (!sessionId) return false;

  const username = await getSessionUsername(sessionId);
  if (!username) return false;

  return !!(await findUser(username))?.isAdmin;
};

export const POST = async (request: NextRequest) => {
  try {
    const { username, password, isAdmin } = await request.json();

    if (!isValidUsername(username)) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const requesterIsAdmin = await _isAdminRequest(request);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const outcome = await updateUsers((users) => {
      const isFirstUser = users.length === 0;

      if (!isFirstUser && !requesterIsAdmin) return RegisterOutcome.FORBIDDEN;
      if (isFirstUser && isPasswordLoginDisabled()) return RegisterOutcome.FORBIDDEN;
      if (users.some((u) => u.username === username)) return RegisterOutcome.EXISTS;

      users.push({
        username,
        passwordHash,
        isAdmin: isFirstUser || isAdmin === true,
        isSuperAdmin: isFirstUser,
        createdAt: new Date().toISOString(),
        encryptionKey: newEncryptionKey(),
      });
      return RegisterOutcome.CREATED;
    });

    if (outcome === RegisterOutcome.FORBIDDEN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (outcome === RegisterOutcome.EXISTS) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 });
    }

    if (isAdmin !== true) await createUserFolder(username);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("auth-register", "Registration failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
