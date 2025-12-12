"use server";

import { writeFile, mkdir, readFile, unlink, rmdir } from "fs/promises";
import { createWriteStream, createReadStream } from "fs";
import path from "path";
import { ServerActionResponse } from "@/app/_types";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/app/_server/actions/user";
import { decryptPath } from "@/app/_lib/path-encryption";
import { auditLog } from "@/app/_server/actions/logs";
import crypto from "crypto";
interface UploadSession {
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  createdAt: number;
  folderPath?: string;
  fileId?: string;
  e2eEncrypted?: boolean;
  e2ePassword?: string;
}

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const TEMP_DIR = `${UPLOAD_DIR}/temp`;

const globalForUploadSessions = globalThis as unknown as {
  uploadSessions: Map<string, UploadSession> | undefined;
};

const uploadSessions =
  globalForUploadSessions.uploadSessions ?? new Map<string, UploadSession>();

if (!globalForUploadSessions.uploadSessions) {
  globalForUploadSessions.uploadSessions = uploadSessions;
}
interface InitUploadInput {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  folderPath?: string;
  e2eEncrypted?: boolean;
  e2ePassword?: string;
}

interface FinalizeUploadInput {
  uploadId: string;
}

const _keyFromPwd = async (password: string, salt: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 600000, 32, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
};

const _decryptChunk = async (
  encryptedChunk: Buffer,
  password: string
): Promise<Buffer> => {
  const salt = encryptedChunk.subarray(0, SALT_LENGTH);
  const iv = encryptedChunk.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertextWithTag = encryptedChunk.subarray(SALT_LENGTH + IV_LENGTH);

  const authTag = ciphertextWithTag.subarray(
    ciphertextWithTag.length - AUTH_TAG_LENGTH
  );
  const encryptedContent = ciphertextWithTag.subarray(
    0,
    ciphertextWithTag.length - AUTH_TAG_LENGTH
  );

  const key = await _keyFromPwd(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedContent),
    decipher.final(),
  ]);

  return decrypted;
};

const _assembleFile = async (
  uploadId: string,
  session: UploadSession
): Promise<string> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    const tempDir = path.join(TEMP_DIR, uploadId);

    let actualFolderPath = session.folderPath
      ? await decryptPath(session.folderPath)
      : "";

    if (!currentUser.isAdmin) {
      actualFolderPath = actualFolderPath
        ? `${currentUser.username}/${actualFolderPath}`
        : currentUser.username;
    }

    const targetDir = path.join(UPLOAD_DIR, actualFolderPath);

    await mkdir(targetDir, { recursive: true });

    const finalPath = path.join(targetDir, session.fileName);

    const writeStream = createWriteStream(finalPath);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk-${i}`);

      if (session.e2eEncrypted && session.e2ePassword) {
        const encryptedChunk = await readFile(chunkPath);
        const decryptedChunk = await _decryptChunk(
          encryptedChunk,
          session.e2ePassword
        );

        await new Promise<void>((resolve, reject) => {
          writeStream.write(decryptedChunk, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      } else {
        const readStream = createReadStream(chunkPath);

        await new Promise<void>((resolve, reject) => {
          readStream.on("end", resolve);
          readStream.on("error", reject);
          writeStream.on("error", reject);
          readStream.pipe(writeStream, { end: false });
        });
      }

      await unlink(chunkPath);
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      writeStream.end();
    });

    await rmdir(tempDir);

    revalidatePath("/files", "layout");
    revalidateTag("files");

    const relativePath = `${actualFolderPath}/${session.fileName}`;

    await auditLog("file:upload", {
      resource: relativePath,
      details: {
        fileName: session.fileName,
        fileSize: session.fileSize,
        e2eEncrypted: session.e2eEncrypted,
      },
      success: true,
    });

    return relativePath;
  } catch (error) {
    console.error("Assemble file error:", error);
    await auditLog("file:upload", {
      resource: session.fileName,
      details: {
        fileName: session.fileName,
        fileSize: session.fileSize,
      },
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "Failed to assemble file",
    });
    throw error;
  }
};

export const initializeUpload = async (
  input: InitUploadInput
): Promise<ServerActionResponse> => {
  try {
    const {
      uploadId,
      fileName,
      fileSize,
      totalChunks,
      folderPath,
      e2eEncrypted,
      e2ePassword,
    } = input;

    const tempDir = path.join(TEMP_DIR, uploadId);
    await mkdir(tempDir, { recursive: true });

    uploadSessions.set(uploadId, {
      fileName,
      fileSize,
      totalChunks,
      receivedChunks: new Set<number>(),
      createdAt: Date.now(),
      folderPath,
      e2eEncrypted,
      e2ePassword,
    });

    return { success: true };
  } catch (error) {
    console.error("Initialize upload error:", error);
    return {
      success: false,
      error: "Failed to initialize upload",
    };
  }
};

export const uploadChunk = async (
  formData: FormData
): Promise<ServerActionResponse<{ progress: number }>> => {
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
        const fileId = await _assembleFile(uploadId, session);
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
};

export const finalizeUpload = async (
  input: FinalizeUploadInput
): Promise<ServerActionResponse<{ fileId: string }>> => {
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
};

export const cleanupExpiredSessions = async (): Promise<void> => {
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
};

export const isChunkEncrypted = (chunk: Buffer): boolean => {
  return chunk.length > SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
};
