import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/app/_lib/request-auth";
import { finalizeUpload } from "@/app/_lib/uploads";
import { toResponse, unauthorized } from "@/app/_lib/upload-responses";
import { logger } from "@/app/_lib/logger";

export const dynamic = "force-dynamic";

export const POST = async (request: NextRequest) => {
  const user = await validateRequest(request);
  if (!user) return unauthorized();

  try {
    const { uploadId } = await request.json();
    return toResponse(await finalizeUpload(user, uploadId));
  } catch (error) {
    logger.error("upload-finalize", "Failed to finalize upload", error);
    return NextResponse.json({ error: "Failed to finalize upload" }, { status: 500 });
  }
};
