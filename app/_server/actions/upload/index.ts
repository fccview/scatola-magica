"use server";

import { ServerActionResponse } from "@/app/_types";
import { getCurrentUser } from "@/app/_lib/current-user";
import {
  deleteUploadSession,
  listOwnerSessions,
  sessionDir,
  writtenChunks,
} from "@/app/_lib/upload-sessions";
import { logger } from "@/app/_lib/logger";

const SCOPE = "upload-actions";

interface ResumableUpload {
  uploadId: string;
  fileName: string;
  progress: number;
  fileSize: number;
  createdAt: number;
}

export const listResumableUploads = async (): Promise<
  ServerActionResponse<{ uploads: ResumableUpload[] }>
> => {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    const sessions = await listOwnerSessions(user.username);
    const uploads: ResumableUpload[] = [];

    for (const session of sessions) {
      if (session.fileId) continue;

      const chunks = await writtenChunks(sessionDir(user.username, session.uploadId));
      uploads.push({
        uploadId: session.uploadId,
        fileName: session.fileName,
        progress: (chunks.length / session.totalChunks) * 100,
        fileSize: session.fileSize,
        createdAt: session.createdAt,
      });
    }

    return { success: true, data: { uploads } };
  } catch (error) {
    logger.error(SCOPE, "Failed to list resumable uploads", error);
    return { success: false, error: "Failed to list resumable uploads" };
  }
};

export const deleteUploadSessionAction = async (
  uploadId: string
): Promise<ServerActionResponse> => {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: "Unauthorized" };

  try {
    await deleteUploadSession(user.username, uploadId);
    return { success: true };
  } catch (error) {
    logger.error(SCOPE, `Failed to delete upload session ${uploadId}`, error);
    return { success: false, error: "Failed to delete upload session" };
  }
};
