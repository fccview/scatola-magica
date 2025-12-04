import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat } from "fs/promises";
import path from "path";
import { getFileMimeType } from "@/app/_lib/file-utils";
import { validateRequest } from "@/app/_lib/request-auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Validate authentication
    const user = await validateRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const relativePath = decodeURIComponent(id);
    const filePath = path.join(UPLOAD_DIR, relativePath);

    let fileStats;
    try {
      fileStats = await stat(filePath);
    } catch {
      return NextResponse.json(
        { error: "File not found on disk" },
        { status: 404 }
      );
    }

    const fileName = path.basename(relativePath);
    const mimeType = getFileMimeType(fileName);

    const fileStream = createReadStream(filePath);
    const readableStream = new ReadableStream({
      start(controller) {
        fileStream.on("data", (chunk: Buffer | string) => {
          if (Buffer.isBuffer(chunk)) {
            controller.enqueue(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
          }
        });
        fileStream.on("end", () => {
          controller.close();
        });
        fileStream.on("error", (error) => {
          controller.error(error);
        });
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": fileStats.size.toString(),
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          fileName
        )}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { error: "Failed to download file" },
      { status: 500 }
    );
  }
}
