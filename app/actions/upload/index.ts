"use server";

import { writeFile, mkdir, readdir, unlink, rmdir } from "fs/promises";
import { createWriteStream, createReadStream } from "fs";
import path from "path";
import { ServerActionResponse } from "@/app/_types";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/app/actions/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const TEMP_DIR = `${UPLOAD_DIR}/temp`;

const globalForUploadSessions = globalThis as unknown as {
  uploadSessions:
    | Map<
        string,
        {
          fileName: string;
          fileSize: number;
          totalChunks: number;
          receivedChunks: Set<number>;
          createdAt: number;
          folderPath?: string;
          fileId?: string;
        }
      >
    | undefined;
};

const uploadSessions =
  globalForUploadSessions.uploadSessions ??
  new Map<
    string,
    {
      fileName: string;
      fileSize: number;
      totalChunks: number;
      receivedChunks: Set<number>;
      createdAt: number;
      folderPath?: string;
      fileId?: string;
    }
  >();

if (!globalForUploadSessions.uploadSessions) {
  globalForUploadSessions.uploadSessions = uploadSessions;
}

interface InitUploadInput {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  folderPath?: string;
}

export async function initializeUpload(
  input: InitUploadInput
): Promise<ServerActionResponse> {
  try {
    const { uploadId, fileName, fileSize, totalChunks, folderPath } = input;

    const tempDir = path.join(TEMP_DIR, uploadId);
    await mkdir(tempDir, { recursive: true });

    uploadSessions.set(uploadId, {
      fileName,
      fileSize,
      totalChunks,
      receivedChunks: new Set<number>(),
      createdAt: Date.now(),
      folderPath,
    });

    console.log("Upload session initialized:", {
      uploadId,
      fileName,
      totalChunks,
      folderPath,
      sessionCount: uploadSessions.size,
      allSessions: Array.from(uploadSessions.keys()),
    });

    return { success: true };
  } catch (error) {
    console.error("Initialize upload error:", error);
    return {
      success: false,
      error: "Failed to initialize upload",
    };
  }
}

interface UploadChunkInput {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  fileName: string;
  chunk: Blob;
}

export async function uploadChunk(
  formData: FormData
): Promise<ServerActionResponse<{ progress: number }>> {
  try {
    const uploadId = formData.get("uploadId") as string;
    const chunkIndex = parseInt(formData.get("chunkIndex") as string);
    const chunk = formData.get("chunk") as Blob;

    if (!uploadId || isNaN(chunkIndex) || !chunk) {
      console.error("Invalid chunk data:", {
        uploadId,
        chunkIndex,
        hasChunk: !!chunk,
      });
      return { success: false, error: "Invalid chunk data" };
    }

    console.log("Looking for upload session:", {
      uploadId,
      sessionCount: uploadSessions.size,
      allSessions: Array.from(uploadSessions.keys()),
    });

    const session = uploadSessions.get(uploadId);

    if (!session) {
      console.error("Upload session not found in memory:", {
        uploadId,
        sessionCount: uploadSessions.size,
        allSessions: Array.from(uploadSessions.keys()),
      });
      return { success: false, error: "Upload session not found" };
    }

    session.receivedChunks.add(chunkIndex);
    const progress = (session.receivedChunks.size / session.totalChunks) * 100;

    const tempDir = path.join(TEMP_DIR, uploadId);
    const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);

    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(chunkPath, buffer);

    if (session.receivedChunks.size === session.totalChunks) {
      try {
        const fileId = await assembleFile(uploadId, session);
        session.fileId = fileId;
      } catch (assembleError) {
        console.error("Error assembling file:", assembleError);
        throw assembleError;
      }
    }

    return {
      success: true,
      data: { progress },
    };
  } catch (error) {
    console.error("Upload chunk error:", error);
    return {
      success: false,
      error: "Failed to upload chunk",
    };
  }
}

async function assembleFile(
  uploadId: string,
  session: {
    fileName: string;
    fileSize: number;
    totalChunks: number;
    folderPath?: string;
  }
): Promise<string> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const tempDir = path.join(TEMP_DIR, uploadId);

    let actualFolderPath = session.folderPath || "";

    if (!currentUser.isAdmin) {
      actualFolderPath = actualFolderPath
        ? `${currentUser.username}/${actualFolderPath}`
        : currentUser.username;
    }

    const targetDir = path.join(UPLOAD_DIR, actualFolderPath);

    console.log("Assembling file:", {
      uploadId,
      fileName: session.fileName,
      folderPath: session.folderPath,
      actualFolderPath,
      targetDir,
      username: currentUser.username,
      isAdmin: currentUser.isAdmin,
    });

    await mkdir(targetDir, { recursive: true });

    const finalPath = path.join(targetDir, session.fileName);

    const writeStream = createWriteStream(finalPath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk-${i}`);
      const readStream = createReadStream(chunkPath);

      await new Promise<void>((resolve, reject) => {
        readStream.on("end", resolve);
        readStream.on("error", reject);
        writeStream.on("error", reject);
        readStream.pipe(writeStream, { end: false });
      });

      await unlink(chunkPath);
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      writeStream.end();
    });

    await rmdir(tempDir);

    revalidatePath("/files", "layout");

    const relativePath = `${actualFolderPath}/${session.fileName}`;

    return relativePath;
  } catch (error) {
    console.error("Assemble file error:", error);
    throw error;
  }
}

interface FinalizeUploadInput {
  uploadId: string;
}

export async function finalizeUpload(
  input: FinalizeUploadInput
): Promise<ServerActionResponse<{ fileId: string }>> {
  try {
    const { uploadId } = input;

    const session = uploadSessions.get(uploadId);

    if (!session) {
      return {
        success: false,
        error: "Upload session not found",
      };
    }

    if (!session.fileId) {
      return {
        success: false,
        error: "File assembly not complete",
      };
    }

    uploadSessions.delete(uploadId);

    return {
      success: true,
      data: { fileId: session.fileId },
    };
  } catch (error) {
    console.error("Finalize upload error:", error);
    return {
      success: false,
      error: "Failed to finalize upload",
    };
  }
}

export async function cleanupExpiredSessions(): Promise<void> {
  const now = Date.now();
  const expiredTime = 24 * 60 * 60 * 1000;

  for (const [uploadId, session] of uploadSessions.entries()) {
    if (now - session.createdAt > expiredTime) {
      try {
        const tempDir = path.join(TEMP_DIR, uploadId);
        await rmdir(tempDir, { recursive: true }).catch(() => {});
        uploadSessions.delete(uploadId);
      } catch (error) {
        console.error(`Failed to cleanup session ${uploadId}:`, error);
      }
    }
  }
}
