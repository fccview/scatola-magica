import "server-only";

import { lstat, readdir } from "fs/promises";
import path from "path";
import type { FileMetadata } from "@/app/_types";
import { getFileMimeType } from "@/app/_lib/file-utils";
import { TEMP_DIR, UPLOAD_DIR } from "@/app/_lib/storage";
import { logger } from "@/app/_lib/logger";

const SCOPE = "file-scan";

const _posix = (value: string): string => value.split(path.sep).join("/");

const _folderOf = (scanRoot: string, fileAbs: string): string | undefined => {
  const parent = _posix(path.relative(scanRoot, path.dirname(fileAbs)));
  return parent || undefined;
};

export const listEntries = async (dirAbs: string): Promise<string[]> => {
  try {
    const entries = await readdir(dirAbs);
    return entries.filter((entry) => path.join(dirAbs, entry) !== TEMP_DIR);
  } catch (error) {
    logger.warn(SCOPE, `Cannot read directory ${dirAbs}`, error);
    return [];
  }
};

export const scanFiles = async (
  ownerRoot: string,
  scanRoot: string,
  recursive: boolean,
  dirAbs: string = scanRoot
): Promise<FileMetadata[]> => {
  const files: FileMetadata[] = [];

  for (const entry of await listEntries(dirAbs)) {
    const fullPath = path.join(dirAbs, entry);

    try {
      const stats = await lstat(fullPath);

      if (stats.isFile()) {
        files.push({
          id: _posix(path.relative(ownerRoot, fullPath)),
          name: entry,
          originalName: entry,
          size: stats.size,
          mimeType: getFileMimeType(entry),
          uploadedAt: stats.mtime.getTime(),
          lastModified: stats.mtime.getTime(),
          path: `/uploads/${_posix(path.relative(UPLOAD_DIR, fullPath))}`,
          folderPath: recursive ? _folderOf(scanRoot, fullPath) : undefined,
        });
      } else if (stats.isDirectory() && recursive) {
        files.push(...(await scanFiles(ownerRoot, scanRoot, true, fullPath)));
      }
    } catch (error) {
      logger.warn(SCOPE, `Cannot stat ${fullPath}`, error);
    }
  }

  return files;
};

export const countEntries = async (
  dirAbs: string
): Promise<{ fileCount: number; folderCount: number }> => {
  let fileCount = 0;
  let folderCount = 0;

  for (const entry of await listEntries(dirAbs)) {
    try {
      const stats = await lstat(path.join(dirAbs, entry));
      if (stats.isFile()) fileCount++;
      if (stats.isDirectory()) folderCount++;
    } catch (error) {
      logger.warn(SCOPE, `Cannot stat ${entry} in ${dirAbs}`, error);
    }
  }

  return { fileCount, folderCount };
};
