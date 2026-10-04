"use server";

import { lstat } from "fs/promises";
import { getCurrentUser } from "@/app/_lib/current-user";
import { decryptPath } from "@/app/_lib/path-encryption";
import { scopedPath } from "@/app/_lib/storage";
import { listArchive } from "@/app/_lib/archive";
import { logger } from "@/app/_lib/logger";
import {
  ARCHIVE_PREVIEW_MAX_BYTES,
  ARCHIVE_PREVIEW_MAX_ENTRIES,
} from "@/app/_lib/constants";
import { ArchiveListing, ServerActionResponse } from "@/app/_types";

const SCOPE = "archive";

export const peekArchive = async (
  fileId: string
): Promise<ServerActionResponse<ArchiveListing>> => {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const target = scopedPath(user, await decryptPath(fileId));
    const stats = await lstat(target.absolute);

    if (!stats.isFile()) {
      return { success: false, error: "Not a file" };
    }

    if (stats.size > ARCHIVE_PREVIEW_MAX_BYTES) {
      return {
        success: false,
        error: "This archive is too big to peek into. Download it instead.",
      };
    }

    return {
      success: true,
      data: listArchive(target.absolute, ARCHIVE_PREVIEW_MAX_ENTRIES),
    };
  } catch (error) {
    logger.error(SCOPE, "Failed to read archive", error);
    return { success: false, error: "Failed to read archive" };
  }
};
