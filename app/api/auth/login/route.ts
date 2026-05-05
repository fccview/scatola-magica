import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { readUsers, createSession } from "@/app/_server/actions/user";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";

export const dynamic = "force-dynamic";

const _failedAttempts = new Map<string, { count: number; until: number }>();
const LOCKOUT_THRESHOLD = 10;
const LOCKOUT_MS = 15 * 60 * 1000;

function _getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function _checkBruteForce(ip: string): boolean {
  const entry = _failedAttempts.get(ip);
  if (!entry) return false;
  if (Date.now() < entry.until) return true;
  _failedAttempts.delete(ip);
  return false;
}

function _recordFailure(ip: string) {
  const entry = _failedAttempts.get(ip) ?? { count: 0, until: 0 };
  entry.count += 1;
  if (entry.count >= LOCKOUT_THRESHOLD) {
    entry.until = Date.now() + LOCKOUT_MS;
  }
  _failedAttempts.set(ip, entry);
}

function _clearFailures(ip: string) {
  _failedAttempts.delete(ip);
}

function base64UrlEncode(buffer: Buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const bruteForceEnabled = process.env.BRUTEFORCE_PROTECTION === "true";
    const ip = bruteForceEnabled ? _getClientIp(request) : "";

    if (bruteForceEnabled && _checkBruteForce(ip)) {
      return NextResponse.json(
        { error: "Too many failed attempts. Try again later." },
        { status: 429 }
      );
    }

    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const users = await readUsers();
    const user = users.find((u) => u.username === username);

    if (!user) {
      if (bruteForceEnabled) _recordFailure(ip);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.passwordHash) {
      if (bruteForceEnabled) _recordFailure(ip);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      if (bruteForceEnabled) _recordFailure(ip);
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (bruteForceEnabled) _clearFailures(ip);

    const { ensureEncryptionPassword } = await import(
      "@/app/_server/actions/user"
    );
    await ensureEncryptionPassword(username);

    const sessionId = base64UrlEncode(crypto.randomBytes(32));
    await createSession(sessionId, username);

    const response = NextResponse.json({ success: true, username });
    response.cookies.set(COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure:
        process.env.NODE_ENV === "production" && process.env.HTTPS === "true",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
