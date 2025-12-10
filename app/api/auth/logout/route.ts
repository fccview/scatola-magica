import { NextRequest, NextResponse } from "next/server";
import { deleteSession } from "@/app/_server/actions/user";
import { COOKIE_NAME } from "@/app/_lib/auth-constants";
import { isInternalRequest } from "@/app/_lib/request-auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const isInternal = await isInternalRequest(request);
  if (!isInternal) {
    return NextResponse.json(
      { error: "This endpoint is only accessible via browser sessions" },
      { status: 403 }
    );
  }

  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete(COOKIE_NAME);
  return response;
}

export async function GET(request: NextRequest) {
  const isInternal = await isInternalRequest(request);
  if (!isInternal) {
    return NextResponse.json(
      { error: "This endpoint is only accessible via browser sessions" },
      { status: 403 }
    );
  }

  const sessionId = request.cookies.get(COOKIE_NAME)?.value;

  if (sessionId) {
    await deleteSession(sessionId);
  }

  const appUrl = process.env.APP_URL || request.nextUrl.origin;
  const response = NextResponse.redirect(`${appUrl}/auth/login`);
  response.cookies.delete(COOKIE_NAME);
  return response;
}
