import "server-only";

import { createReadStream } from "fs";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { PathEscapeError } from "@/app/_lib/storage";
import { logger } from "@/app/_lib/logger";

export const SANDBOX_CSP =
  "sandbox; default-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'unsafe-inline'";

const INLINE_PREFIXES = ["image/", "video/", "audio/", "text/"];
const PDF_TYPE = "application/pdf";

export const isInlineType = (mimeType: string): boolean =>
  mimeType === PDF_TYPE || INLINE_PREFIXES.some((p) => mimeType.startsWith(p));

export const contentDisposition = (
  type: "inline" | "attachment",
  fileName: string
): string => {
  const ascii = fileName.replace(/[^\x20-\x7E]/g, "_").replace(/["\\]/g, "_");
  return `${type}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
};

export const streamFile = (absolute: string): ReadableStream<Uint8Array> =>
  Readable.toWeb(createReadStream(absolute)) as ReadableStream<Uint8Array>;

export const pathErrorResponse = (
  error: unknown,
  scope: string
): NextResponse => {
  if (error instanceof PathEscapeError) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  logger.error(scope, "Request failed", error);
  return NextResponse.json({ error: "Request failed" }, { status: 500 });
};
