import { NextRequest, NextResponse } from "next/server";
import { stat, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getFileMimeType } from "@/app/_lib/file-utils";
import { validateRequest } from "@/app/_lib/request-auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const THUMBNAIL_DIR = process.env.THUMBNAIL_CACHE_DIR || "./data/thumbnails";
const THUMBNAIL_SIZE = 256;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await validateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const relativePath = decodeURIComponent(id);
    const scopedPath = user.isAdmin
      ? relativePath
      : `${user.username}/${relativePath}`;

    const filePath = path.join(UPLOAD_DIR, scopedPath);

    const resolvedPath = path.resolve(filePath);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    if (!resolvedPath.startsWith(resolvedUploadDir + path.sep) && resolvedPath !== resolvedUploadDir) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const mimeType = getFileMimeType(path.basename(relativePath));
    if (!mimeType.startsWith("image/")) {
      return NextResponse.json({ error: "Not an image" }, { status: 400 });
    }

    let fileStats;
    try {
      fileStats = await stat(filePath);
    } catch {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const thumbPath = path.join(THUMBNAIL_DIR, scopedPath);
    const thumbDir = path.dirname(thumbPath);

    let thumbBuffer: Buffer | null = null;

    try {
      const thumbStats = await stat(thumbPath);
      if (thumbStats.mtimeMs >= fileStats.mtimeMs) {
        thumbBuffer = await readFile(thumbPath);
      }
    } catch {
    }

    if (!thumbBuffer) {
      await mkdir(thumbDir, { recursive: true });
      const original = await readFile(filePath);
      thumbBuffer = await sharp(original)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
        .jpeg({ quality: 80 })
        .toBuffer();
      await writeFile(thumbPath, thumbBuffer);
    }

    return new NextResponse(thumbBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": thumbBuffer.length.toString(),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("Thumbnail error:", error);
    return NextResponse.json({ error: "Failed to generate thumbnail" }, { status: 500 });
  }
}
