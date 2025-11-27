import { NextRequest, NextResponse } from "next/server";
import { initializeUpload } from "@/app/actions/upload";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await initializeUpload(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Init upload error:", error);
    return NextResponse.json(
      { error: "Failed to initialize upload" },
      { status: 500 }
    );
  }
}
