import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/app/_lib/request-auth";
import { storeChunk } from "@/app/_lib/uploads";
import { toResponse, unauthorized } from "@/app/_lib/upload-responses";
import { logger } from "@/app/_lib/logger";

export const maxDuration = 60;
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const POST = async (request: NextRequest) => {
  const user = await validateRequest(request);
  if (!user) return unauthorized();

  try {
    const formData = await request.formData();
    const result = await storeChunk(
      user,
      formData.get("uploadId"),
      formData.get("chunkIndex"),
      formData.get("chunk")
    );

    return toResponse(result);
  } catch (error) {
    logger.error("upload-chunk", "Failed to upload chunk", error);
    return NextResponse.json({ error: "Failed to upload chunk" }, { status: 500 });
  }
};
