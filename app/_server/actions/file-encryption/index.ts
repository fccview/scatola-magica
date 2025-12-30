"use server";

import fs from "fs/promises";
import path from "path";
import { stat } from "fs/promises";
import { getCurrentUser } from "@/app/_server/actions/user";
import {
  encryptFileData,
  decryptFileData,
  getKeyStatus,
} from "@/app/_server/actions/pgp";
import { revalidatePath } from "next/cache";
import {
  createArchiveToFile,
  extractArchive,
} from "@/app/_server/actions/archive";
import { auditLog } from "@/app/_server/actions/logs";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR || path.join(process.cwd(), "data/uploads");

interface EncryptResult {
  success: boolean;
  message: string;
  encryptedFilePath?: string;
}

interface DecryptResult {
  success: boolean;
  message: string;
  decryptedFilePath?: string;
}

export const encryptFile = async (
  fileId: string,
  deleteOriginal: boolean = false,
  customPublicKey?: string
): Promise<EncryptResult> => {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const userScopeFileID = user.isAdmin ? fileId : `${user.username}/${fileId}`;

  try {
    if (!customPublicKey) {
      const keyStatus = await getKeyStatus();
      if (!keyStatus.hasKeys) {
        return {
          success: false,
          message: "No PGP keys found. Please generate keys in Settings first.",
        };
      }
    }

    const filePath = path.join(UPLOAD_DIR, userScopeFileID);

    try {
      await fs.access(filePath);
    } catch {
      return { success: false, message: "File not found" };
    }

    const fileBuffer = await fs.readFile(filePath);
    const fileName = path.basename(userScopeFileID);
    const encryptResult = await encryptFileData(
      new Uint8Array(fileBuffer),
      fileName,
      undefined,
      customPublicKey
    );

    if (!encryptResult.success || !encryptResult.encryptedData) {
      return { success: false, message: encryptResult.message };
    }

    const encryptedFilePath = `${filePath}.gpg`;
    await fs.writeFile(encryptedFilePath, encryptResult.encryptedData);

    if (deleteOriginal) {
      await fs.unlink(filePath);
    }

    await auditLog("file:encrypt", {
      resource: userScopeFileID,
      details: {
        customKey: !!customPublicKey,
        deletedOriginal: deleteOriginal,
      },
      success: true,
    });

    revalidatePath("/", "layout");
    revalidatePath("/files", "page");

    return {
      success: true,
      message: "File encrypted successfully",
      encryptedFilePath: `${userScopeFileID}.gpg`,
    };
  } catch (error) {
    console.error("Error encrypting file:", error);
    await auditLog("file:encrypt", {
      resource: userScopeFileID,
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "Failed to encrypt file",
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to encrypt file",
    };
  }
};

export const decryptFile = async (
  fileId: string,
  password: string,
  outputName: string,
  deleteEncrypted: boolean = false,
  customPrivateKey?: string
): Promise<DecryptResult> => {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Not authenticated" };
  }

  const userScopeFileID = user.isAdmin ? fileId : `${user.username}/${fileId}`;

  try {
    if (!customPrivateKey) {
      const keyStatus = await getKeyStatus();
      if (!keyStatus.hasKeys) {
        return {
          success: false,
          message: "No PGP keys found. Please generate keys in Settings first.",
        };
      }
    }

    const filePath = path.join(UPLOAD_DIR, userScopeFileID);

    try {
      await fs.access(filePath);
    } catch {
      return { success: false, message: "File not found" };
    }

    if (!userScopeFileID.endsWith(".gpg")) {
      return { success: false, message: "File is not encrypted" };
    }

    const encryptedContent = await fs.readFile(filePath, "utf-8");

    const decryptResult = await decryptFileData(
      encryptedContent,
      password,
      undefined,
      customPrivateKey
    );

    if (!decryptResult.success || !decryptResult.decryptedData) {
      return { success: false, message: decryptResult.message };
    }

    const folderPath = path.dirname(userScopeFileID);
    const isEncryptedFolder = fileId.endsWith(".folder.gpg");

    if (isEncryptedFolder) {
      const tempArchivePath = path.join(
        UPLOAD_DIR,
        folderPath,
        `.temp-${outputName}-${Date.now()}.zip`
      );
      const outputDir = path.join(UPLOAD_DIR, folderPath, outputName);

      try {
        await fs.writeFile(
          tempArchivePath,
          Buffer.from(decryptResult.decryptedData)
        );
        await extractArchive(tempArchivePath, outputDir);
        await fs.unlink(tempArchivePath);

        if (deleteEncrypted) {
          await fs.unlink(filePath);
        }

        await auditLog("folder:decrypt", {
          resource: userScopeFileID,
          details: { outputName, deletedEncrypted: deleteEncrypted },
          success: true,
        });

        revalidatePath("/", "layout");
        revalidatePath("/files", "page");

        return {
          success: true,
          message: "Folder decrypted successfully",
          decryptedFilePath: path.join(folderPath, outputName),
        };
      } catch (error) {
        await fs.unlink(tempArchivePath).catch(() => {});
        await fs.rmdir(outputDir, { recursive: true }).catch(() => {});
        throw error;
      }
    }

    const decryptedFilePath = path.join(UPLOAD_DIR, folderPath, outputName);

    await fs.writeFile(
      decryptedFilePath,
      Buffer.from(decryptResult.decryptedData)
    );

    if (deleteEncrypted) {
      await fs.unlink(filePath);
    }

    await auditLog("file:decrypt", {
      resource: userScopeFileID,
      details: { outputName, deletedEncrypted: deleteEncrypted },
      success: true,
    });

    revalidatePath("/", "layout");
    revalidatePath("/files", "page");

    return {
      success: true,
      message: "File decrypted successfully",
      decryptedFilePath: path.join(folderPath, outputName),
    };
  } catch (error) {
    console.error("Error decrypting file:", error);
    await auditLog("file:decrypt", {
      resource: userScopeFileID,
      success: false,
      errorMessage:
        error instanceof Error ? error.message : "Failed to decrypt file",
    });
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to decrypt file",
    };
  }
};

export const encryptFolder = async (
  folderId: string,
  deleteOriginal: boolean = false,
  customPublicKey?: string
): Promise<EncryptResult> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    if (!customPublicKey) {
      const keyStatus = await getKeyStatus();
      if (!keyStatus.hasKeys) {
        return {
          success: false,
          message: "No PGP keys found. Please generate keys in Settings first.",
        };
      }
    }

    const actualFolderPath = user.isAdmin
      ? folderId
      : `${user.username}/${folderId}`;
    const folderPath = path.join(UPLOAD_DIR, actualFolderPath);

    try {
      const stats = await stat(folderPath);
      if (!stats.isDirectory()) {
        return { success: false, message: "Path is not a directory" };
      }
    } catch {
      return { success: false, message: "Folder not found" };
    }

    const folderName = path.basename(folderId);
    const tempArchivePath = path.join(
      UPLOAD_DIR,
      path.dirname(actualFolderPath),
      `.temp-${folderName}-${Date.now()}.zip`
    );

    try {
      await createArchiveToFile(folderPath, tempArchivePath);

      const archiveBuffer = await fs.readFile(tempArchivePath);
      const encryptResult = await encryptFileData(
        new Uint8Array(archiveBuffer),
        `${folderName}.zip`,
        undefined,
        customPublicKey
      );

      if (!encryptResult.success || !encryptResult.encryptedData) {
        await fs.unlink(tempArchivePath).catch(() => {});
        return { success: false, message: encryptResult.message };
      }

      const encryptedFilePath = path.join(
        UPLOAD_DIR,
        path.dirname(actualFolderPath),
        `${folderName}.folder.gpg`
      );
      await fs.writeFile(encryptedFilePath, encryptResult.encryptedData);
      await fs.unlink(tempArchivePath);

      if (deleteOriginal) {
        await fs.rmdir(folderPath, { recursive: true });
      }

      revalidatePath("/", "layout");
      revalidatePath("/files", "page");

      return {
        success: true,
        message: "Folder encrypted successfully",
        encryptedFilePath: path.join(
          path.dirname(folderId),
          `${folderName}.folder.gpg`
        ),
      };
    } catch (error) {
      await fs.unlink(tempArchivePath).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error("Error encrypting folder:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to encrypt folder",
    };
  }
};

export const decryptFolder = async (
  folderId: string,
  password: string,
  outputName: string,
  deleteEncrypted: boolean = false,
  customPrivateKey?: string
): Promise<DecryptResult> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    if (!customPrivateKey) {
      const keyStatus = await getKeyStatus();
      if (!keyStatus.hasKeys) {
        return {
          success: false,
          message: "No PGP keys found. Please generate keys in Settings first.",
        };
      }
    }

    const actualFolderPath = user.isAdmin
      ? folderId
      : `${user.username}/${folderId}`;
    const encryptedFilePath = path.join(UPLOAD_DIR, actualFolderPath);

    try {
      await fs.access(encryptedFilePath);
    } catch {
      return { success: false, message: "File not found" };
    }

    if (!folderId.endsWith(".folder.gpg")) {
      return { success: false, message: "Folder is not encrypted" };
    }

    const encryptedContent = await fs.readFile(encryptedFilePath, "utf-8");

    const decryptResult = await decryptFileData(
      encryptedContent,
      password,
      undefined,
      customPrivateKey
    );

    if (!decryptResult.success || !decryptResult.decryptedData) {
      return { success: false, message: decryptResult.message };
    }

    const folderPath = path.dirname(actualFolderPath);
    const tempArchivePath = path.join(
      UPLOAD_DIR,
      folderPath,
      `.temp-${outputName}-${Date.now()}.zip`
    );
    const outputDir = path.join(UPLOAD_DIR, folderPath, outputName);

    try {
      await fs.writeFile(
        tempArchivePath,
        Buffer.from(decryptResult.decryptedData)
      );
      await extractArchive(tempArchivePath, outputDir);
      await fs.unlink(tempArchivePath);

      if (deleteEncrypted) {
        await fs.unlink(encryptedFilePath);
      }

      revalidatePath("/", "layout");
      revalidatePath("/files", "page");

      return {
        success: true,
        message: "Folder decrypted successfully",
        decryptedFilePath: path.join(path.dirname(folderId), outputName),
      };
    } catch (error) {
      await fs.unlink(tempArchivePath).catch(() => {});
      await fs.rmdir(outputDir, { recursive: true }).catch(() => {});
      throw error;
    }
  } catch (error) {
    console.error("Error decrypting folder:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to decrypt folder",
    };
  }
};
