import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import { getSessionUsername } from "@/app/_lib/auth-utils";
import { logger } from "@/app/_lib/logger";

const PUBLIC_PREFIXES = [
  "/api/auth/check-session",
  "/api/auth/login",
  "/api/auth/register",
  "/api/oidc/",
  "/auth",
];

const LOGIN_PATH = "/auth/login";

const _isPublic = (pathname: string): boolean =>
  PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

const _next = (pathname: string): NextResponse => {
  const response = NextResponse.next();
  response.headers.set("x-pathname", pathname);
  return response;
};

const _toLogin = (request: NextRequest): NextResponse => {
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
  response.cookies.delete(COOKIE_NAME);
  return response;
};

export const proxy = async (request: NextRequest) => {
  const { pathname } = request.nextUrl;

  if (_isPublic(pathname)) return _next(pathname);
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const sessionId = request.cookies.get(COOKIE_NAME)?.value;
  if (!sessionId) return _toLogin(request);

  try {
    const username = await getSessionUsername(sessionId);
    if (!username) return _toLogin(request);
  } catch (error) {
    logger.error("proxy", "Session check failed", error);
    return _toLogin(request);
  }

  return _next(pathname);
};

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|site.webmanifest|manifest.json|offline.html|app-icons|logo|pokemon|animations|app-screenshots|pink-stars.svg).*)",
  ],
};
