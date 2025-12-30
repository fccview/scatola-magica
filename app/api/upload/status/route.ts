import { NextRequest, NextResponse } from "next/server";
import { validateRequest } from "@/app/_lib/request-auth";
import { loadUploadSession, deleteUploadSession } from "@/app/_lib/upload-sessions";
import * as fs from "fs/promises";
import path from "path";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const TEMP_DIR = `${UPLOAD_DIR}/temp`;

export async function POST(request: NextRequest) {
  try {
    const user = await validateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { uploadId } = body;

    if (!uploadId) {
      return NextResponse.json(
        { error: "uploadId required" },
        { status: 400 }
      );
    }

    const session = await loadUploadSession(uploadId);

    if (!session) {
      return NextResponse.json({
        exists: false,
      });
    }

    const tempDir = path.join(TEMP_DIR, uploadId);
    let uploadedChunks: number[] = [];

    try {
      const files = await fs.readdir(tempDir);
      uploadedChunks = files
        .filter(f => f.startsWith("chunk-"))
        .map(f => parseInt(f.replace("chunk-", "")))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
    } catch (error) {
      uploadedChunks = [];
    }

    return NextResponse.json({
      exists: true,
      fileName: session.fileName,
      fileSize: session.fileSize,
      totalChunks: session.totalChunks,
      uploadedChunks,
      progress: (uploadedChunks.length / session.totalChunks) * 100,
      createdAt: session.createdAt,
      e2eEncrypted: session.e2eEncrypted,
      chunkSize: session.chunkSize,
    });
  } catch (error) {
    console.error("Upload status error:", error);
    return NextResponse.json(
      { error: "Failed to get upload status" },
      { status: 500 }
    );
  }
}
