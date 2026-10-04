import "server-only";

import { createRemoteJWKSet, decodeJwt, jwtVerify, JWTPayload } from "jose";
import {
  claimList,
  envList,
  matchesAny,
  OidcConfig,
  OidcDiscovery,
} from "@/app/_lib/oidc";
import {
  isValidUsername,
  newEncryptionKey,
  updateUsers,
} from "@/app/_lib/auth-utils";
import { createUserFolder } from "@/app/_lib/user-files";
import { logger } from "@/app/_lib/logger";

const SCOPE = "oidc-flow";
const CLOCK_TOLERANCE_SECONDS = 5;
const JWT_CONTENT_TYPE = "jwt";

export interface TokenSet {
  id_token?: string;
  access_token?: string;
}

export interface OidcIdentity {
  username: string;
  isAdmin: boolean;
  isAllowed: boolean;
}

const _tokenRequest = (
  endpoint: string,
  body: URLSearchParams,
  basicAuth?: string
): Promise<Response> =>
  fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      ...(basicAuth ? { authorization: `Basic ${basicAuth}` } : {}),
    },
    body,
  });

const _logTokenError = async (response: Response, method: string) => {
  const detail = await response.text().catch(() => "");
  logger.error(
    SCOPE,
    `Token exchange failed with ${method} (${response.status}): ${detail.slice(0, 500)}`
  );
};

export const exchangeCode = async (
  config: OidcConfig,
  discovery: OidcDiscovery,
  code: string,
  verifier: string,
  redirectUri: string
): Promise<TokenSet | null> => {
  const params = {
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    code_verifier: verifier,
  };

  const postBody = new URLSearchParams(params);
  if (config.clientSecret) postBody.set("client_secret", config.clientSecret);

  let response = await _tokenRequest(discovery.token_endpoint, postBody);

  if (!response.ok && config.clientSecret) {
    await _logTokenError(response, "client_secret_post");

    const basic = Buffer.from(
      `${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`
    ).toString("base64");

    response = await _tokenRequest(
      discovery.token_endpoint,
      new URLSearchParams(params),
      basic
    );
  }

  if (!response.ok) {
    await _logTokenError(response, config.clientSecret ? "client_secret_basic" : "public client");
    return null;
  }

  return (await response.json()) as TokenSet;
};

export const verifyIdToken = async (
  idToken: string,
  config: OidcConfig,
  discovery: OidcDiscovery
): Promise<JWTPayload | null> => {
  try {
    const jwks = createRemoteJWKSet(new URL(discovery.jwks_uri));
    const { payload } = await jwtVerify(idToken, jwks, {
      issuer: discovery.issuer,
      audience: config.clientId,
      clockTolerance: CLOCK_TOLERANCE_SECONDS,
    });
    return payload;
  } catch (error) {
    logger.error(SCOPE, "ID token validation failed", error);
    return null;
  }
};

const _needsUserinfo = (claims: JWTPayload): boolean =>
  (!claims.preferred_username && !claims.email) ||
  (!claims.groups && !claims.roles);

export const withUserinfo = async (
  claims: JWTPayload,
  discovery: OidcDiscovery,
  accessToken?: string
): Promise<JWTPayload> => {
  if (!_needsUserinfo(claims) || !discovery.userinfo_endpoint || !accessToken) {
    return claims;
  }

  try {
    const response = await fetch(discovery.userinfo_endpoint, {
      headers: { authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      logger.warn(SCOPE, `Userinfo request failed (${response.status})`);
      return claims;
    }

    const contentType = response.headers.get("content-type") || "";
    const userinfo = contentType.includes(JWT_CONTENT_TYPE)
      ? decodeJwt(await response.text())
      : ((await response.json()) as JWTPayload);

    if (userinfo.sub && claims.sub && userinfo.sub !== claims.sub) {
      logger.warn(SCOPE, "Userinfo subject does not match ID token, ignoring");
      return claims;
    }

    return { ...userinfo, ...claims };
  } catch (error) {
    logger.warn(SCOPE, "Userinfo request errored, using ID token claims", error);
    return claims;
  }
};

const _usernameFrom = (claims: JWTPayload): string | null => {
  const email = typeof claims.email === "string" ? claims.email : "";
  const candidates = [claims.preferred_username, email.split("@")[0], claims.sub];

  for (const candidate of candidates) {
    if (isValidUsername(candidate)) return candidate;
  }

  return null;
};

export const identityFrom = (claims: JWTPayload): OidcIdentity | null => {
  const username = _usernameFrom(claims);
  if (!username) return null;

  const groups = claimList(claims.groups);
  const roles = claimList(claims.roles);

  const isAdmin =
    matchesAny(envList("OIDC_ADMIN_GROUPS"), groups) ||
    matchesAny(envList("OIDC_ADMIN_ROLES"), roles);

  const userGroups = envList("OIDC_USER_GROUPS");
  const userRoles = envList("OIDC_USER_ROLES");
  const restricted = userGroups.length > 0 || userRoles.length > 0;

  const isAllowed =
    !restricted ||
    isAdmin ||
    matchesAny(userGroups, groups) ||
    matchesAny(userRoles, roles);

  return { username, isAdmin, isAllowed };
};

export const provisionUser = async ({
  username,
  isAdmin,
}: OidcIdentity): Promise<void> => {
  const created = await updateUsers((users) => {
    const isFirstUser = users.length === 0;
    const existing = users.find((u) => u.username === username);

    if (existing) {
      existing.encryptionKey ||= newEncryptionKey();
      if (isAdmin && !existing.isAdmin) existing.isAdmin = true;
      return false;
    }

    users.push({
      username,
      passwordHash: "",
      isAdmin: isFirstUser || isAdmin,
      isSuperAdmin: isFirstUser,
      createdAt: new Date().toISOString(),
      encryptionKey: newEncryptionKey(),
    });
    return !(isFirstUser || isAdmin);
  });

  if (created) await createUserFolder(username);
};
