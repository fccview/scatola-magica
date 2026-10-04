"use server";

import fs from "fs/promises";
import path from "path";
import type { CurrentUser } from "@/app/_types";
import { getCurrentUser } from "@/app/_lib/current-user";
import { decryptFor, encryptFor, readKeyInfo } from "@/app/_lib/pgp";
import { createArchiveToFile, extractArchive } from "@/app/_lib/archive";
import { auditLog } from "@/app/_lib/audit-log";
import { bustFileCache } from "@/app/_lib/cache-tags";
import { isValidName, scopedPath, userRoot } from "@/app/_lib/storage";
import { logger } from "@/app/_lib/logger";

const SCOPE = "file-encryption";
const GPG_EXTENSION = ".gpg";
const FOLDER_GPG_EXTENSION = ".folder.gpg";
const NOT_AUTHENTICATED = { success: false, message: "Not authenticated" };
const NO_KEYS = {
  success: false,
  message: "No PGP keys found. Please generate keys in Settings first.",
};

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

const _errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const _hasKeys = async (user: CurrentUser, customKey?: string) =>
  !!customKey || !!(await readKeyInfo(user.username));

const _exists = async (absolute: string): Promise<boolean> => {
  try {
    await fs.lstat(absolute);
    return true;
  } catch {
    return false;
  }
};

const _idOf = (user: CurrentUser, absolute: string): string =>
  path.relative(userRoot(user), absolute).split(path.sep).join("/");

const _tempZip = (dir: string, name: string): string =>
  path.join(dir, `.temp-${name}-${Date.now()}.zip`);

export const encryptFile = async (
  fileId: string,
  deleteOriginal: boolean = false,
  customPublicKey?: string
): Promise<EncryptResult> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;
  if (!(await _hasKeys(user, customPublicKey))) return NO_KEYS;

  let resource = String(fileId);

  try {
    const source = scopedPath(user, fileId);
    resource = source.relative;

    if (!(await fs.lstat(source.absolute)).isFile()) {
      return { success: false, message: "File not found" };
    }

    const fileName = path.basename(source.absolute);
    const result = await encryptFor(
      user.username,
      new Uint8Array(await fs.readFile(source.absolute)),
      fileName,
      customPublicKey
    );

    if (!result.success || !result.data) {
      return { success: false, message: result.message };
    }

    const encryptedPath = `${source.absolute}${GPG_EXTENSION}`;
    await fs.writeFile(encryptedPath, result.data);
    if (deleteOriginal) await fs.unlink(source.absolute);

    await auditLog("file:encrypt", {
      resource,
      details: { customKey: !!customPublicKey, deletedOriginal: deleteOriginal },
      success: true,
    });
    bustFileCache();

    return {
      success: true,
      message: "File encrypted successfully",
      encryptedFilePath: _idOf(user, encryptedPath),
    };
  } catch (error) {
    logger.error(SCOPE, `Failed to encrypt ${resource}`, error);
    await auditLog("file:encrypt", {
      resource,
      success: false,
      errorMessage: _errorText(error, "Failed to encrypt file"),
    });
    return { success: false, message: "Failed to encrypt file" };
  }
};

const _extractTo = async (
  zipBytes: Uint8Array,
  parentDir: string,
  outputDir: string,
  outputName: string
): Promise<void> => {
  const tempZip = _tempZip(parentDir, outputName);

  try {
    await fs.writeFile(tempZip, zipBytes, { flag: "wx" });
    await extractArchive(tempZip, outputDir);
  } catch (error) {
    await fs.rm(outputDir, { recursive: true, force: true });
    throw error;
  } finally {
    await fs.rm(tempZip, { force: true });
  }
};

const _decryptInto = async (
  user: CurrentUser,
  fileId: string,
  password: string,
  outputName: string,
  deleteEncrypted: boolean,
  customPrivateKey?: string
): Promise<DecryptResult> => {
  const source = scopedPath(user, fileId);
  const parentDir = path.dirname(source.absolute);
  const output = scopedPath(user, path.posix.join(path.posix.dirname(fileId), outputName));
  const isFolder = source.absolute.endsWith(FOLDER_GPG_EXTENSION);

  if (!(await fs.lstat(source.absolute)).isFile()) {
    return { success: false, message: "File not found" };
  }

  if (await _exists(output.absolute)) {
    return { success: false, message: `"${outputName}" already exists` };
  }

  const result = await decryptFor(
    user.username,
    await fs.readFile(source.absolute, "utf-8"),
    password,
    customPrivateKey
  );

  if (!result.success || !result.data) {
    return { success: false, message: result.message };
  }

  if (isFolder) {
    await _extractTo(result.data, parentDir, output.absolute, outputName);
  } else {
    await fs.writeFile(output.absolute, result.data, { flag: "wx" });
  }

  if (deleteEncrypted) await fs.unlink(source.absolute);

  await auditLog(isFolder ? "folder:decrypt" : "file:decrypt", {
    resource: source.relative,
    details: { outputName, deletedEncrypted: deleteEncrypted },
    success: true,
  });
  bustFileCache();

  return {
    success: true,
    message: isFolder
      ? "Folder decrypted successfully"
      : "File decrypted successfully",
    decryptedFilePath: _idOf(user, output.absolute),
  };
};

export const decryptFile = async (
  fileId: string,
  password: string,
  outputName: string,
  deleteEncrypted: boolean = false,
  customPrivateKey?: string
): Promise<DecryptResult> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;
  if (!(await _hasKeys(user, customPrivateKey))) return NO_KEYS;

  if (!String(fileId).endsWith(GPG_EXTENSION)) {
    return { success: false, message: "File is not encrypted" };
  }

  if (!isValidName(outputName)) {
    return { success: false, message: "Invalid output name" };
  }

  try {
    return await _decryptInto(
      user,
      fileId,
      password,
      outputName,
      deleteEncrypted,
      customPrivateKey
    );
  } catch (error) {
    logger.error(SCOPE, `Failed to decrypt ${fileId}`, error);
    await auditLog("file:decrypt", {
      resource: String(fileId),
      success: false,
      errorMessage: _errorText(error, "Failed to decrypt file"),
    });
    return { success: false, message: "Failed to decrypt file" };
  }
};

export const encryptFolder = async (
  folderId: string,
  deleteOriginal: boolean = false,
  customPublicKey?: string
): Promise<EncryptResult> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;
  if (!(await _hasKeys(user, customPublicKey))) return NO_KEYS;

  try {
    const folder = scopedPath(user, folderId);
    if (!folderId || folder.absolute === userRoot(user)) {
      return { success: false, message: "Cannot encrypt the root folder" };
    }

    if (!(await fs.lstat(folder.absolute)).isDirectory()) {
      return { success: false, message: "Path is not a directory" };
    }

    const folderName = path.basename(folder.absolute);
    const parentDir = path.dirname(folder.absolute);
    const tempZip = _tempZip(parentDir, folderName);
    const encryptedPath = path.join(parentDir, `${folderName}${FOLDER_GPG_EXTENSION}`);

    try {
      await createArchiveToFile(folder.absolute, tempZip);

      const result = await encryptFor(
        user.username,
        new Uint8Array(await fs.readFile(tempZip)),
        `${folderName}.zip`,
        customPublicKey
      );

      if (!result.success || !result.data) {
        return { success: false, message: result.message };
      }

      await fs.writeFile(encryptedPath, result.data);
    } finally {
      await fs.rm(tempZip, { force: true });
    }

    if (deleteOriginal) await fs.rm(folder.absolute, { recursive: true });

    await auditLog("folder:encrypt", {
      resource: folder.relative,
      details: { customKey: !!customPublicKey, deletedOriginal: deleteOriginal },
      success: true,
    });
    bustFileCache();

    return {
      success: true,
      message: "Folder encrypted successfully",
      encryptedFilePath: _idOf(user, encryptedPath),
    };
  } catch (error) {
    logger.error(SCOPE, `Failed to encrypt folder ${folderId}`, error);
    return { success: false, message: "Failed to encrypt folder" };
  }
};

export const decryptFolder = async (
  folderId: string,
  password: string,
  outputName: string,
  deleteEncrypted: boolean = false,
  customPrivateKey?: string
): Promise<DecryptResult> => {
  if (!String(folderId).endsWith(FOLDER_GPG_EXTENSION)) {
    return { success: false, message: "Folder is not encrypted" };
  }

  return decryptFile(
    folderId,
    password,
    outputName,
    deleteEncrypted,
    customPrivateKey
  );
};
