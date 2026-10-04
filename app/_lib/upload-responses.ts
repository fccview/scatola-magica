import "server-only";

import { NextResponse } from "next/server";
import type { UploadResult } from "@/app/_lib/uploads";

export const toResponse = <T>(result: UploadResult<T>): NextResponse =>
  result.success
    ? NextResponse.json({ success: true, data: result.data })
    : NextResponse.json({ error: result.error }, { status: result.status ?? 400 });

export const unauthorized = (): NextResponse =>
  NextResponse.json({ error: "Unauthorized" }, { status: 401 });
