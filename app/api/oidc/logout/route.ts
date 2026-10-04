import { NextRequest, NextResponse } from "next/server";
import { appUrl, fetchDiscovery, getOidcConfig } from "@/app/_lib/oidc";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

const SCOPE = "oidc-logout";

export const GET = async (request: NextRequest) => {
  const loginUrl = `${appUrl(request)}/auth/login`;

  const customLogoutUrl = process.env.OIDC_LOGOUT_URL;
  if (customLogoutUrl) return NextResponse.redirect(customLogoutUrl);

  const config = getOidcConfig();
  if (!config) return NextResponse.redirect(loginUrl);

  const discovery = await fetchDiscovery(config.issuer);
  if (!discovery?.end_session_endpoint) {
    logger.debug(SCOPE, "No end_session_endpoint, redirecting to login");
    return NextResponse.redirect(loginUrl);
  }

  try {
    const url = new URL(discovery.end_session_endpoint);
    url.searchParams.set("post_logout_redirect_uri", loginUrl);
    url.searchParams.set("client_id", config.clientId);
    return NextResponse.redirect(url);
  } catch (error) {
    logger.error(SCOPE, "Invalid end_session_endpoint", error);
    return NextResponse.redirect(loginUrl);
  }
};
