import { NextRequest, NextResponse } from "next/server";
import { initializeUpload } from "@/app/_server/actions/upload";
import { validateRequest } from "@/app/_lib/request-auth";
import { decryptPath } from "@/app/_lib/path-encryption";

export async function POST(request: NextRequest) {
  try {
    const user = await validateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    if (body.folderPath) {
      body.folderPath = await decryptPath(body.folderPath);
    }

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
