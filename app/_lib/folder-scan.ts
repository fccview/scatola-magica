import "server-only";

import { lstat } from "fs/promises";
import path from "path";
import { countEntries, listEntries } from "@/app/_lib/file-scan";
import { logger } from "@/app/_lib/logger";

const SCOPE = "folder-scan";

export interface FolderMetadata {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  fileCount?: number;
  folderCount?: number;
}

const _posix = (value: string): string => value.split(path.sep).join("/");

export const toFolderId = (ownerRoot: string, absolute: string): string =>
  _posix(path.relative(ownerRoot, absolute));

export const describeFolder = async (
  ownerRoot: string,
  absolute: string
): Promise<FolderMetadata> => {
  const stats = await lstat(absolute);
  const parentId = toFolderId(ownerRoot, path.dirname(absolute));
  const counts = await countEntries(absolute);

  return {
    id: toFolderId(ownerRoot, absolute),
    name: path.basename(absolute),
    parentId: parentId && !parentId.startsWith("..") ? parentId : null,
    createdAt: stats.mtime.getTime(),
    updatedAt: stats.mtime.getTime(),
    ...counts,
  };
};

export const scanFolders = async (
  ownerRoot: string,
  dirAbs: string,
  recursive: boolean
): Promise<FolderMetadata[]> => {
  const folders: FolderMetadata[] = [];

  for (const entry of await listEntries(dirAbs)) {
    const fullPath = path.join(dirAbs, entry);

    try {
      const stats = await lstat(fullPath);
      if (!stats.isDirectory()) continue;

      folders.push(await describeFolder(ownerRoot, fullPath));

      if (recursive) {
        folders.push(...(await scanFolders(ownerRoot, fullPath, true)));
      }
    } catch (error) {
      logger.warn(SCOPE, `Cannot read folder ${fullPath}`, error);
    }
  }

  return folders;
};

export const sortFolderTree = (folders: FolderMetadata[]): FolderMetadata[] =>
  [...folders].sort((a, b) =>
    a.parentId === b.parentId
      ? a.name.localeCompare(b.name)
      : (a.parentId || "").localeCompare(b.parentId || "")
  );
