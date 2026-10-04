import { NextRequest, NextResponse } from "next/server";
import { createSession, newSessionId } from "@/app/_lib/auth-utils";
import {
  appUrl,
  callbackUrl,
  clearOidcCookies,
  fetchDiscovery,
  getOidcConfig,
  loginRedirect,
  OidcCookie,
  OidcError,
} from "@/app/_lib/oidc";
import {
  exchangeCode,
  identityFrom,
  provisionUser,
  verifyIdToken,
  withUserinfo,
} from "@/app/_lib/oidc-flow";
import { setSessionCookie } from "@/app/_lib/session-cookie";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

const SCOPE = "oidc-callback";

const _fail = (request: NextRequest, error: OidcError, reason: string) => {
  logger.warn(SCOPE, `SSO login rejected: ${reason}`);
  const response = loginRedirect(request, error);
  clearOidcCookies(response);
  return response;
};

const _handle = async (request: NextRequest): Promise<NextResponse> => {
  const config = getOidcConfig();
  if (!config) {
    return _fail(request, OidcError.NOT_CONFIGURED, "OIDC is not configured");
  }

  const params = request.nextUrl.searchParams;
  const providerError = params.get("error");
  if (providerError) {
    return _fail(
      request,
      OidcError.UNAUTHORIZED,
      `provider returned ${providerError}: ${params.get("error_description") ?? ""}`
    );
  }

  const code = params.get("code");
  const state = params.get("state");
  const savedState = request.cookies.get(OidcCookie.STATE)?.value;
  const verifier = request.cookies.get(OidcCookie.VERIFIER)?.value;
  const nonce = request.cookies.get(OidcCookie.NONCE)?.value;

  if (!code || !state || !savedState || state !== savedState || !verifier) {
    return _fail(
      request,
      OidcError.STATE,
      `state/verifier cookies missing or mismatched (code=${!!code}, state=${!!state}, savedState=${!!savedState}, verifier=${!!verifier}). Make sure APP_URL matches the URL you browse to.`
    );
  }

  const discovery = await fetchDiscovery(config.issuer);
  if (!discovery?.token_endpoint || !discovery.jwks_uri) {
    return _fail(request, OidcError.DISCOVERY, "discovery document incomplete");
  }

  const tokens = await exchangeCode(
    config,
    discovery,
    code,
    verifier,
    callbackUrl(request)
  );
  if (!tokens?.id_token) {
    return _fail(request, OidcError.TOKEN, "no id_token returned by the provider");
  }

  const idClaims = await verifyIdToken(tokens.id_token, config, discovery);
  if (!idClaims) {
    return _fail(request, OidcError.ID_TOKEN, "id_token failed verification");
  }

  if (idClaims.nonce === undefined) {
    logger.warn(SCOPE, "Provider did not echo the nonce claim");
  } else if (idClaims.nonce !== nonce) {
    return _fail(request, OidcError.NONCE, "nonce mismatch");
  }

  const claims = await withUserinfo(idClaims, discovery, tokens.access_token);
  logger.debug(SCOPE, "Resolved claims", claims);

  const identity = identityFrom(claims);
  if (!identity) {
    return _fail(request, OidcError.USERNAME, "no usable username claim");
  }

  if (!identity.isAllowed) {
    return _fail(
      request,
      OidcError.UNAUTHORIZED,
      `${identity.username} is not in OIDC_USER_GROUPS / OIDC_USER_ROLES`
    );
  }

  await provisionUser(identity);

  const sessionId = newSessionId();
  await createSession(sessionId, identity.username);

  const response = NextResponse.redirect(`${appUrl(request)}/`);
  setSessionCookie(response, sessionId);
  clearOidcCookies(response);

  logger.info(SCOPE, `SSO login for ${identity.username}`);
  return response;
};

export const GET = async (request: NextRequest) => {
  try {
    return await _handle(request);
  } catch (error) {
    logger.error(SCOPE, "Unexpected SSO callback failure", error);
    return loginRedirect(request, OidcError.SERVER);
  }
};
