"use server";

import { writeFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/app/_server/actions/user";
import { decryptPath } from "@/app/_lib/path-encryption";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

export const saveFileContent = async (fileId: string, content: string) => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const decryptedPath = await decryptPath(fileId);
    const resolvedUploadDir = path.resolve(UPLOAD_DIR);
    const filePath = path.resolve(path.join(UPLOAD_DIR, decryptedPath));

    if (!filePath.startsWith(resolvedUploadDir)) {
      return {
        success: false,
        error: "Invalid file path"
      };
    }

    await writeFile(filePath, content, "utf-8");

    return { success: true };
  } catch (error) {
    console.error("Save file error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to save file",
    };
  }
}
