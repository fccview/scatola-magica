import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { stat } from "fs/promises";
import path from "path";
import { PassThrough } from "stream";
import { validateRequest } from "@/app/_lib/request-auth";
import { decryptPath } from "@/app/_lib/path-encryption";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

export async function POST(request: NextRequest) {
  try {
    const currentUser = await validateRequest(request);
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { paths } = body as { paths: string[] };

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json({ error: "No paths provided" }, { status: 400 });
    }

    const decryptedPaths = await Promise.all(
      paths.map((p) => decryptPath(p))
    );

    const isAdmin = currentUser.isAdmin;
    const username = currentUser.username;

    const actualPaths = decryptedPaths.map((relativePath) => {
      return isAdmin ? relativePath : `${username}/${relativePath}`;
    });

    for (const actualPath of actualPaths) {
      const fullPath = path.join(UPLOAD_DIR, actualPath);

      const resolvedPath = path.resolve(fullPath);
      const resolvedUploadDir = path.resolve(UPLOAD_DIR);

      if (!resolvedPath.startsWith(resolvedUploadDir)) {
        return NextResponse.json(
          {
            error: "Invalid path",
            debug: { actualPath, resolvedPath, resolvedUploadDir },
          },
          { status: 403 }
        );
      }

      try {
        await stat(fullPath);
      } catch (err) {
        console.error("Path not found:", actualPath, err);
        return NextResponse.json(
          { error: `Path not found: ${actualPath}` },
          { status: 404 }
        );
      }
    }

    let archiveName = "download.zip";
    if (decryptedPaths.length === 1) {
      const singlePath = decryptedPaths[0];
      const baseName = path.basename(singlePath);
      archiveName = `${baseName}.zip`;
    } else {
      archiveName = `archive-${Date.now()}.zip`;
    }

    const passThrough = new PassThrough();

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    archive.pipe(passThrough);

    archive.on("warning", (err) => {
      if (err.code !== "ENOENT") {
        console.error("Archive warning:", err);
      }
    });

    archive.on("error", (err) => {
      console.error("Archive error:", err);
      passThrough.destroy(err);
    });

    for (const actualPath of actualPaths) {
      const fullPath = path.join(UPLOAD_DIR, actualPath);
      const fileStats = await stat(fullPath);
      const itemName = path.basename(actualPath);

      if (fileStats.isDirectory()) {
        archive.directory(fullPath, itemName);
      } else {
        archive.file(fullPath, { name: itemName });
      }
    }

    archive.finalize();

    const readableStream = new ReadableStream({
      start(controller) {
        passThrough.on("data", (chunk: Buffer) => {
          controller.enqueue(new Uint8Array(chunk));
        });

        passThrough.on("end", () => {
          controller.close();
        });

        passThrough.on("error", (error) => {
          controller.error(error);
        });
      },
      cancel() {
        passThrough.destroy();
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          archiveName
        )}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("Archive download error:", error);
    return NextResponse.json(
      { error: "Failed to create archive" },
      { status: 500 }
    );
  }
}
