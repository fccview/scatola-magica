import "server-only";

import { NextResponse } from "next/server";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import { isSecureCookie } from "@/app/_lib/oidc";

export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export const setSessionCookie = (
  response: NextResponse,
  sessionId: string
): void => {
  response.cookies.set(COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
};
