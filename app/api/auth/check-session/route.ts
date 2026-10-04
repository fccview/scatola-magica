import { NextRequest, NextResponse } from "next/server";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import { getSessionUsername } from "@/app/_lib/auth-utils";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

export const GET = async (request: NextRequest) => {
  try {
    const sessionId = request.cookies.get(COOKIE_NAME)?.value;
    if (!sessionId) {
      return NextResponse.json({ error: "No session cookie" }, { status: 401 });
    }

    const username = await getSessionUsername(sessionId);
    if (!username) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 });
    }

    return NextResponse.json({ success: true, username });
  } catch (error) {
    logger.error("check-session", "Session check failed", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
};
