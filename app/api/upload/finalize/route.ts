import { NextRequest, NextResponse } from "next/server";
import { finalizeUpload } from "@/app/actions/upload";

export async function POST(request: NextRequest) {
  try {
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
