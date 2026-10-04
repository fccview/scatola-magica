import { NextRequest, NextResponse } from "next/server";
import { stat } from "fs/promises";
import path from "path";
import { getFileMimeType } from "@/app/_lib/file-utils";
import { validateRequest } from "@/app/_lib/request-auth";
import { scopedPath } from "@/app/_lib/storage";
import {
  contentDisposition,
  isInlineType,
  pathErrorResponse,
  SANDBOX_CSP,
  streamFile,
} from "@/app/_lib/file-response";

const PDF_TYPE = "application/pdf";

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
    const target = scopedPath(user, decodeURIComponent(id));

    const fileStats = await stat(target.absolute).catch(() => null);
    if (!fileStats?.isFile()) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileName = path.basename(target.absolute);
    const mimeType = getFileMimeType(fileName);
    const viewInline =
      request.nextUrl.searchParams.get("view") === "true" && isInlineType(mimeType);

    const headers: Record<string, string> = {
      "Content-Type": mimeType,
      "Content-Length": fileStats.size.toString(),
      "Content-Disposition": contentDisposition(
        viewInline ? "inline" : "attachment",
        fileName
      ),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    };

    if (mimeType !== PDF_TYPE) {
      headers["Content-Security-Policy"] = SANDBOX_CSP;
    }

    return new NextResponse(streamFile(target.absolute), { headers });
  } catch (error) {
    return pathErrorResponse(error, "download");
  }
};
