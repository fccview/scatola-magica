import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/app/_lib/request-auth";
import { decryptPathFor } from "@/app/_lib/path-encryption";
import { initUpload } from "@/app/_lib/uploads";
import { toResponse, unauthorized } from "@/app/_lib/upload-responses";
import { PathEscapeError } from "@/app/_lib/storage";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  const user = await validateRequest(request);
  if (!user) return unauthorized();

  try {
    const body = await request.json();
    if (typeof body.folderPath === "string" && body.folderPath) {
      body.folderPath = await decryptPathFor(user.username, body.folderPath);
    }

    return toResponse(await initUpload(user, body));
  } catch (error) {
    if (error instanceof PathEscapeError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    logger.error("upload-init", "Failed to initialize upload", error);
    return NextResponse.json({ error: "Failed to initialize upload" }, { status: 500 });
  }
};
