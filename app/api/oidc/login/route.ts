import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import {
  callbackUrl,
  envOrFile,
  fetchDiscovery,
  getOidcConfig,
  loginRedirect,
  OidcCookie,
  OidcError,
  setOidcCookie,
} from "@/app/_lib/oidc";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

const SCOPE = "oidc-login";
const BASE_SCOPE = "openid profile email";
const DISABLED_SCOPE_VALUES = ["no", "false"];

const _random = (bytes: number): string =>
  crypto.randomBytes(bytes).toString("base64url");

const _challenge = (verifier: string): string =>
  crypto.createHash("sha256").update(verifier).digest("base64url");

const _scope = (): string => {
  const groupsScope = envOrFile("OIDC_GROUPS_SCOPE") ?? "groups";
  const wantsGroups =
    !!(process.env.OIDC_ADMIN_GROUPS || process.env.OIDC_USER_GROUPS) &&
    !!groupsScope &&
    !DISABLED_SCOPE_VALUES.includes(groupsScope.toLowerCase());

  return wantsGroups ? `${BASE_SCOPE} ${groupsScope}` : BASE_SCOPE;
};

export const GET = async (request: NextRequest) => {
  const config = getOidcConfig();
  if (!config) {
    logger.warn(SCOPE, "OIDC_ISSUER or OIDC_CLIENT_ID is not set");
    return loginRedirect(request, OidcError.NOT_CONFIGURED);
  }

  const discovery = await fetchDiscovery(config.issuer);
  if (!discovery?.authorization_endpoint) {
    return loginRedirect(request, OidcError.DISCOVERY);
  }

  const verifier = _random(32);
  const state = _random(16);
  const nonce = _random(16);

  const url = new URL(discovery.authorization_endpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(request));
  url.searchParams.set("scope", _scope());
  url.searchParams.set("code_challenge", _challenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);

  logger.debug(SCOPE, `Redirecting to ${url.origin}${url.pathname}`, {
    redirectUri: callbackUrl(request),
  });

  const response = NextResponse.redirect(url);
  setOidcCookie(response, OidcCookie.VERIFIER, verifier);
  setOidcCookie(response, OidcCookie.STATE, state);
  setOidcCookie(response, OidcCookie.NONCE, nonce);

  return response;
};
