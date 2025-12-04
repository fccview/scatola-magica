import { NextRequest, NextResponse } from "next/server";
import { uploadChunk } from "@/app/_server/actions/upload";
import { validateRequest } from "@/app/_lib/request-auth";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const user = await validateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const result = await uploadChunk(formData);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Chunk upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload chunk" },
      { status: 500 }
    );
  }
}
