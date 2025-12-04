import { NextRequest, NextResponse } from "next/server";
import { finalizeUpload } from "@/app/_server/actions/upload";
import { validateRequest } from "@/app/_lib/request-auth";

export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const user = await validateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const result = await finalizeUpload(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Finalize upload error:", error);
    return NextResponse.json(
      { error: "Failed to finalize upload" },
      { status: 500 }
    );
  }
}
