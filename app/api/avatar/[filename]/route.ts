import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { validateRequest } from "@/app/_lib/request-auth";
import { avatarPath } from "@/app/_lib/user-files";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
};

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) => {
  if (!(await validateRequest(request))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { filename } = await params;
  const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()];
  const absolute = avatarPath(filename);

  if (!contentType || !absolute) {
    return new NextResponse("Invalid filename", { status: 400 });
  }

  try {
    const buffer = await readFile(absolute);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new NextResponse("Avatar not found", { status: 404 });
  }
};
