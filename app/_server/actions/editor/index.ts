"use server";

import { lstat, writeFile } from "fs/promises";
import { getCurrentUser } from "@/app/_lib/current-user";
import { decryptPath } from "@/app/_lib/path-encryption";
import { scopedPath } from "@/app/_lib/storage";
import { bustFileCache } from "@/app/_lib/cache/bust";
import { logger } from "@/app/_lib/logger";

const SCOPE = "editor";

export const saveFileContent = async (fileId: string, content: string) => {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  if (typeof content !== "string") {
    return { success: false, error: "Invalid content" };
  }

  try {
    const target = scopedPath(user, await decryptPath(fileId));

    if (!(await lstat(target.absolute)).isFile()) {
      return { success: false, error: "Not a file" };
    }

    await writeFile(target.absolute, content, "utf-8");
    await bustFileCache(target.absolute);

    return { success: true };
  } catch (error) {
    logger.error(SCOPE, "Failed to save file", error);
    return { success: false, error: "Failed to save file" };
  }
};
