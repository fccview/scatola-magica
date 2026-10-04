import "server-only";

import { NextRequest, NextResponse } from "next/server";
import { envOrFile } from "@/app/_lib/env";
import { logger } from "@/app/_lib/logger";

const SCOPE = "oidc";
const WELL_KNOWN = ".well-known/openid-configuration";
const OIDC_COOKIE_MAX_AGE = 600;

export enum OidcCookie {
  VERIFIER = "oidc_verifier",
  STATE = "oidc_state",
  NONCE = "oidc_nonce",
}

export enum OidcError {
  NOT_CONFIGURED = "oidc_not_configured",
  DISCOVERY = "oidc_discovery_failed",
  STATE = "oidc_state_mismatch",
  TOKEN = "oidc_token_exchange_failed",
  ID_TOKEN = "oidc_invalid_id_token",
  NONCE = "oidc_nonce_mismatch",
  USERNAME = "oidc_missing_username",
  UNAUTHORIZED = "oidc_unauthorized",
  SERVER = "oidc_server_error",
}

export interface OidcConfig {
  issuer: string;
  clientId: string;
  clientSecret?: string;
}

export interface OidcDiscovery {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
  userinfo_endpoint?: string;
  end_session_endpoint?: string;
}

export const getOidcConfig = (): OidcConfig | null => {
  const issuer = envOrFile("OIDC_ISSUER");
  const clientId = envOrFile("OIDC_CLIENT_ID");

  if (!issuer || !clientId) return null;

  return { issuer, clientId, clientSecret: envOrFile("OIDC_CLIENT_SECRET") };
};

export const isOidcAvailable = (): boolean => !!getOidcConfig();

export const isPasswordLoginDisabled = (): boolean =>
  process.env.DISABLE_PASSWORD_LOGIN === "true" && isOidcAvailable();

export const isSecureCookie = (): boolean =>
  process.env.NODE_ENV === "production" && process.env.HTTPS === "true";

export const appUrl = (request: NextRequest): string =>
  (process.env.APP_URL || request.nextUrl.origin).replace(/\/+$/, "");

export const callbackUrl = (request: NextRequest): string =>
  `${appUrl(request)}/api/oidc/callback`;

export const discoveryUrl = (issuer: string): string =>
  issuer.includes(WELL_KNOWN)
    ? issuer
    : `${issuer.replace(/\/+$/, "")}/${WELL_KNOWN}`;

export const fetchDiscovery = async (
  issuer: string
): Promise<OidcDiscovery | null> => {
  const url = discoveryUrl(issuer);

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      logger.error(SCOPE, `Discovery failed (${response.status}) at ${url}`);
      return null;
    }

    return (await response.json()) as OidcDiscovery;
  } catch (error) {
    logger.error(SCOPE, `Discovery request failed at ${url}`, error);
    return null;
  }
};

export const loginRedirect = (
  request: NextRequest,
  error?: OidcError
): NextResponse => {
  const url = new URL(`${appUrl(request)}/auth/login`);
  if (error) url.searchParams.set("error", error);
  return NextResponse.redirect(url);
};

export const setOidcCookie = (
  response: NextResponse,
  name: OidcCookie,
  value: string
): void => {
  response.cookies.set(name, value, {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "lax",
    path: "/",
    maxAge: OIDC_COOKIE_MAX_AGE,
  });
};

export const clearOidcCookies = (response: NextResponse): void => {
  for (const name of Object.values(OidcCookie)) {
    response.cookies.delete(name);
  }
};

export const claimList = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  if (typeof value === "string") return value.split(/[\s,]+/).filter(Boolean);
  return [];
};

export const envList = (name: string): string[] =>
  (process.env[name] || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

export const matchesAny = (allowed: string[], available: string[]): boolean =>
  allowed.length > 0 && allowed.some((item) => available.includes(item));
