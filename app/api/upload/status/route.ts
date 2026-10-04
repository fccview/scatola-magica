import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/app/_lib/request-auth";
import { uploadStatus } from "@/app/_lib/uploads";
import { unauthorized } from "@/app/_lib/upload-responses";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  const user = await validateRequest(request);
  if (!user) return unauthorized();

  try {
    const { uploadId } = await request.json();
    if (!uploadId) {
      return NextResponse.json({ error: "uploadId required" }, { status: 400 });
    }

    return NextResponse.json(await uploadStatus(user, uploadId));
  } catch (error) {
    logger.error("upload-status", "Failed to get upload status", error);
    return NextResponse.json({ error: "Failed to get upload status" }, { status: 500 });
  }
};
