import { NextRequest, NextResponse } from "next/server";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getFileMimeType } from "@/app/_lib/file-utils";
import { validateRequest } from "@/app/_lib/request-auth";
import { resolveIn, scopedPath, THUMBNAIL_DIR } from "@/app/_lib/storage";
import { pathErrorResponse } from "@/app/_lib/file-response";

const THUMBNAIL_SIZE = 256;
const THUMBNAIL_QUALITY = 80;
const MAX_INPUT_PIXELS = 100_000_000;
const SKIPPED_TYPES = ["image/svg+xml"];

const _cachedThumb = async (
  thumbPath: string,
  sourceMtime: number
): Promise<Buffer | null> => {
  try {
    const thumbStats = await stat(thumbPath);
    return thumbStats.mtimeMs >= sourceMtime ? await readFile(thumbPath) : null;
  } catch {
    return null;
  }
};

const _renderThumb = async (source: string, thumbPath: string) => {
  const buffer = await sharp(source, { limitInputPixels: MAX_INPUT_PIXELS })
    .rotate()
    .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, { fit: "cover" })
    .jpeg({ quality: THUMBNAIL_QUALITY })
    .toBuffer();

  await mkdir(path.dirname(thumbPath), { recursive: true });
  await writeFile(thumbPath, buffer);
  return buffer;
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const user = await validateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const source = scopedPath(user, decodeURIComponent(id));
    const mimeType = getFileMimeType(path.basename(source.absolute));

    if (!mimeType.startsWith("image/") || SKIPPED_TYPES.includes(mimeType)) {
      return NextResponse.json({ error: "Not a supported image" }, { status: 400 });
    }

    const sourceStats = await stat(source.absolute).catch(() => null);
    if (!sourceStats?.isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const thumbPath = resolveIn(THUMBNAIL_DIR, `${source.relative}.jpg`);
    const thumb =
      (await _cachedThumb(thumbPath, sourceStats.mtimeMs)) ??
      (await _renderThumb(source.absolute, thumbPath));

    return new NextResponse(new Uint8Array(thumb), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": thumb.length.toString(),
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    return pathErrorResponse(error, "thumbnail");
  }
};
