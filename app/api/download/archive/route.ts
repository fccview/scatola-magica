import { NextRequest, NextResponse } from "next/server";
import archiver from "archiver";
import { stat } from "fs/promises";
import path from "path";
import { PassThrough, Readable } from "stream";
import { validateRequest } from "@/app/_lib/request-auth";
import { decryptPathFor } from "@/app/_lib/path-encryption";
import { ScopedPath, scopedPath } from "@/app/_lib/storage";
import { contentDisposition, pathErrorResponse } from "@/app/_lib/file-response";
import { logger } from "@/app/_lib/logger";

const SCOPE = "download-archive";
const MAX_ITEMS = 1000;
const ZIP_LEVEL = 6;

const _archiveName = (targets: ScopedPath[]): string =>
  targets.length === 1
    ? `${path.basename(targets[0].absolute)}.zip`
    : `archive-${Date.now()}.zip`;

export const POST = async (request: NextRequest) => {
  const user = await validateRequest(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { paths } = (await request.json()) as { paths?: unknown };

    if (!Array.isArray(paths) || paths.length === 0 || paths.length > MAX_ITEMS) {
      return NextResponse.json({ error: "No paths provided" }, { status: 400 });
    }

    const targets: ScopedPath[] = [];
    for (const item of paths) {
      const decrypted = await decryptPathFor(user.username, String(item));
      const target = scopedPath(user, decrypted);

      if (!(await stat(target.absolute).catch(() => null))) {
        return NextResponse.json({ error: "Path not found" }, { status: 404 });
      }
      targets.push(target);
    }

    const output = new PassThrough();
    const archive = archiver("zip", { zlib: { level: ZIP_LEVEL } });

    archive.on("warning", (error) => logger.warn(SCOPE, "Archive warning", error));
    archive.on("error", (error) => {
      logger.error(SCOPE, "Archive failed", error);
      output.destroy(error);
    });
    archive.pipe(output);

    for (const target of targets) {
      const name = path.basename(target.absolute);
      const targetStats = await stat(target.absolute);

      if (targetStats.isDirectory()) {
        archive.directory(target.absolute, name);
      } else {
        archive.file(target.absolute, { name });
      }
    }

    archive.finalize().catch((error) => output.destroy(error));

    return new NextResponse(Readable.toWeb(output) as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": contentDisposition("attachment", _archiveName(targets)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return pathErrorResponse(error, SCOPE);
  }
};
