import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import { deleteSession } from "@/app/_lib/auth-utils";
import { appUrl } from "@/app/_lib/oidc";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

const _endSession = async (request: NextRequest): Promise<void> => {
  const sessionId = request.cookies.get(COOKIE_NAME)?.value;
  if (!sessionId) return;

  try {
    await deleteSession(sessionId);
  } catch (error) {
    logger.error("auth-logout", "Failed to delete session", error);
  }
};

export const POST = async (request: NextRequest) => {
  await _endSession(request);

  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
};

export const GET = async (request: NextRequest) => {
  await _endSession(request);

  const response = NextResponse.redirect(`${appUrl(request)}/auth/login`);
  response.cookies.delete(COOKIE_NAME);
  return response;
};
