"use server";

import { writeFile, mkdir, readFile, unlink, rmdir } from "fs/promises";
import * as fs from "fs/promises";
import { createWriteStream, createReadStream } from "fs";
import path from "path";
import { ServerActionResponse } from "@/app/_types";
import { revalidatePath, revalidateTag } from "next/cache";
import { getCurrentUser } from "@/app/_server/actions/user";
import { decryptPath } from "@/app/_lib/path-encryption";
import { auditLog } from "@/app/_server/actions/logs";
import crypto from "crypto";
import {
  createUploadSession,
  loadUploadSession,
  markChunkWritten,
  isUploadComplete,
  setSessionFileId,
  deleteUploadSession,
  listUploadSessions,
  tryStartAssembly,
  type PersistedUploadSession,
} from "@/app/_lib/upload-sessions";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";
const TEMP_DIR = `${UPLOAD_DIR}/temp`;

interface InitUploadInput {
  uploadId: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  chunkSize?: number;
  folderPath?: string;
  e2eEncrypted?: boolean;
  e2ePassword?: string;
  e2eSalt?: number[];
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
  key: Buffer
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
  session: PersistedUploadSession
): Promise<string> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Unauthorized");
    }

    let decryptionKey: Buffer | undefined;
    if (session.e2eEncrypted && session.e2ePassword && session.e2eSalt) {
      const salt = Buffer.from(session.e2eSalt);
      decryptionKey = await _keyFromPwd(session.e2ePassword, salt);
    }

    const tempDir = path.join(TEMP_DIR, uploadId);

    for (let i = 0; i < session.totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk-${i}`);
      try {
        await fs.access(chunkPath, fs.constants.F_OK);
      } catch (error) {
        throw new Error(
          `Chunk ${i} missing during assembly. ` +
          `Expected: ${chunkPath}. ` +
          `Written: ${session.writtenChunks.length}/${session.totalChunks}`
        );
      }
    }

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

    let assemblyFailed = false;

    writeStream.on("error", (err) => {
      if (!assemblyFailed) {
        assemblyFailed = true;
        console.error("Write stream error during assembly:", err);
      }
    });

    for (let i = 0; i < session.totalChunks; i++) {
      if (assemblyFailed) {
        throw new Error("Assembly failed due to write stream error");
      }

      const chunkPath = path.join(tempDir, `chunk-${i}`);

      if (session.e2eEncrypted && decryptionKey) {
        const encryptedChunk = await readFile(chunkPath);
        const decryptedChunk = await _decryptChunk(
          encryptedChunk,
          decryptionKey
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
          readStream.on("error", reject);

          readStream.on("data", (chunk) => {
            if (!writeStream.write(chunk)) {
              readStream.pause();
              writeStream.once("drain", () => {
                readStream.resume();
              });
            }
          });

          readStream.on("end", resolve);
        });
      }

      await unlink(chunkPath);
    }

    await new Promise<void>((resolve, reject) => {
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      writeStream.end();
    });

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
      chunkSize,
      folderPath,
      e2eEncrypted,
      e2ePassword,
      e2eSalt,
    } = input;

    const session: PersistedUploadSession = {
      uploadId,
      fileName,
      fileSize,
      totalChunks,
      receivedChunks: [],
      writtenChunks: [],
      createdAt: Date.now(),
      chunkSize,
      folderPath,
      e2eEncrypted,
      e2ePassword,
      e2eSalt,
    };

    await createUploadSession(session);

    return { success: true };
  } catch (error) {
    console.error("Initialize upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initialize upload",
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

    const session = await loadUploadSession(uploadId);

    if (!session) {
      return { success: false, error: "Upload session not found" };
    }

    const arrayBuffer = await chunk.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (session.e2eEncrypted && session.e2ePassword) {
      const hasSalt = buffer.length > SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
      const looksEncrypted = buffer.length > 100 && buffer[0] !== 0;

      if (!hasSalt || !looksEncrypted) {
        console.error(`[SECURITY] E2E encryption flag set but chunk ${chunkIndex} appears UNENCRYPTED`);
        return {
          success: false,
          error: "Security error: E2E encryption enabled but chunk is not encrypted"
        };
      }
    }

    const tempDir = path.join(TEMP_DIR, uploadId);
    const chunkPath = path.join(tempDir, `chunk-${chunkIndex}`);

    await new Promise<void>((resolve, reject) => {
      const writeStream = createWriteStream(chunkPath);
      writeStream.on("finish", resolve);
      writeStream.on("error", reject);
      writeStream.write(buffer);
      writeStream.end();
    });

    const chunkFiles = await fs.readdir(tempDir);
    const chunks = chunkFiles.filter(f => f.startsWith("chunk-"));

    let totalBytesWritten = 0;
    for (const chunkFile of chunks) {
      const stats = await fs.stat(path.join(tempDir, chunkFile));
      totalBytesWritten += stats.size;
    }

    const progress = (totalBytesWritten / session.fileSize) * 100;
    const isComplete = chunks.length === session.totalChunks;

    if (isComplete) {
      const shouldAssemble = await tryStartAssembly(uploadId);
      if (shouldAssemble) {
        const fileId = await _assembleFile(uploadId, session);
        await setSessionFileId(uploadId, fileId);
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

    let session = await loadUploadSession(uploadId);
    if (!session) {
      return {
        success: false,
        error: "Upload session not found",
      };
    }

    let retries = 0;
    const maxRetries = 300;
    while ((!session.fileId || session.fileId.startsWith("__")) && retries < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 200));
      session = await loadUploadSession(uploadId);
      if (!session) {
        return {
          success: false,
          error: "Upload session not found",
        };
      }
      retries++;
    }

    if (!session.fileId || session.fileId.startsWith("__")) {
      return {
        success: false,
        error: "File assembly did not complete in time",
      };
    }

    await deleteUploadSession(uploadId).catch(() => {});

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

export const listResumableUploads = async (): Promise<ServerActionResponse<{
  uploads: Array<{
    uploadId: string;
    fileName: string;
    progress: number;
    fileSize: number;
    createdAt: number;
  }>;
}>> => {
  try {
    const sessionIds = await listUploadSessions();
    const uploads = [];

    for (const uploadId of sessionIds) {
      const session = await loadUploadSession(uploadId);
      if (session && !session.fileId) {
        uploads.push({
          uploadId: session.uploadId,
          fileName: session.fileName,
          progress: (session.writtenChunks.length / session.totalChunks) * 100,
          fileSize: session.fileSize,
          createdAt: session.createdAt,
        });
      }
    }

    return { success: true, data: { uploads } };
  } catch (error) {
    console.error("List resumable uploads error:", error);
    return { success: false, error: "Failed to list resumable uploads" };
  }
};

export const deleteUploadSessionAction = async (
  uploadId: string
): Promise<ServerActionResponse> => {
  try {
    await deleteUploadSession(uploadId);
    return { success: true };
  } catch (error) {
    console.error("Delete upload session error:", error);
    return {
      success: false,
      error: "Failed to delete upload session",
    };
  }
};

export const cleanupExpiredSessions = async (): Promise<void> => {
  const now = Date.now();
  const expiredTime = 24 * 60 * 60 * 1000;

  try {
    const sessionIds = await listUploadSessions();

    for (const uploadId of sessionIds) {
      const session = await loadUploadSession(uploadId);
      if (!session) {
        const tempDir = path.join(TEMP_DIR, uploadId);
        await rmdir(tempDir, { recursive: true }).catch(() => {});
        continue;
      }

      if (now - session.createdAt > expiredTime) {
        console.log(`[Cleanup] Removing expired: ${uploadId}`);
        await deleteUploadSession(uploadId);
      }
    }

  } catch (error) {
    console.error("[Cleanup] Failed:", error);
  }
};

export const initializeUploadSessionsFromDisk = async (): Promise<void> => {
  try {
    const sessionIds = await listUploadSessions();
    console.log(`[Recovery] Found ${sessionIds.length} sessions`);

    for (const uploadId of sessionIds) {
      const session = await loadUploadSession(uploadId);
      if (!session) continue;

      const now = Date.now();
      const expiredTime = 24 * 60 * 60 * 1000;

      if (now - session.createdAt > expiredTime) {
        await deleteUploadSession(uploadId);
        continue;
      }

      console.log(
        `[Recovery] Active: ${uploadId} ` +
        `(${session.writtenChunks.length}/${session.totalChunks} chunks)`
      );
    }
  } catch (error) {
    console.error("[Recovery] Failed:", error);
  }
};

const isChunkEncrypted = (chunk: Buffer): boolean => {
  return chunk.length > SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
};
