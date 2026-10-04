"use server";

import { lstat, mkdir, rename, unlink } from "fs/promises";
import path from "path";
import {
  FileMetadata,
  PaginatedResponse,
  ServerActionResponse,
} from "@/app/_types";
import { SortBy } from "@/app/_types/enums";
import { getCurrentUser } from "@/app/_lib/current-user";
import { auditLog } from "@/app/_lib/audit-log";
import { scanFiles } from "@/app/_lib/file-scan";
import { isValidName, scopedPath, userRoot } from "@/app/_lib/storage";
import { bustFileCache } from "@/app/_lib/cache/bust";
import { pensieve } from "@/app/_lib/cache/pensieve";
import { dirScopes, rootScope } from "@/app/_lib/cache/scopes";
import { logger } from "@/app/_lib/logger";

const SCOPE = "file-actions";
const DEFAULT_PAGE_SIZE = 15;
const MAX_PAGE_SIZE = 500;
const UNAUTHORIZED = { success: false, error: "Unauthorized" };

interface GetFilesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: SortBy;
  folderPath?: string;
  recursive?: boolean;
}

const _cachedScan = (ownerRoot: string, scanRoot: string, recursive: boolean) =>
  pensieve(
    "files",
    [ownerRoot, scanRoot, recursive],
    recursive ? [rootScope(ownerRoot)] : dirScopes(scanRoot),
    () => scanFiles(ownerRoot, scanRoot, recursive)
  );

const SORTERS: Record<SortBy, (a: FileMetadata, b: FileMetadata) => number> = {
  [SortBy.NAME_ASC]: (a, b) => a.originalName.localeCompare(b.originalName),
  [SortBy.NAME_DESC]: (a, b) => b.originalName.localeCompare(a.originalName),
  [SortBy.DATE_ASC]: (a, b) => a.uploadedAt - b.uploadedAt,
  [SortBy.DATE_DESC]: (a, b) => b.uploadedAt - a.uploadedAt,
  [SortBy.SIZE_ASC]: (a, b) => a.size - b.size,
  [SortBy.SIZE_DESC]: (a, b) => b.size - a.size,
};

const _errorText = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const _clampPage = (value: unknown, fallback: number, max: number): number => {
  const parsed = Math.floor(Number(value));
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
};

export const getFiles = async (
  options: GetFilesOptions = {}
): Promise<ServerActionResponse<PaginatedResponse<FileMetadata>>> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  try {
    const page = _clampPage(options.page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = _clampPage(options.pageSize, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const search = String(options.search ?? "").toLowerCase();
    const sorter = SORTERS[options.sortBy ?? SortBy.DATE_DESC] ?? SORTERS[SortBy.DATE_DESC];

    const scanRoot = scopedPath(currentUser, options.folderPath).absolute;
    const recursive = !!options.recursive || !!search;

    let files = await _cachedScan(userRoot(currentUser), scanRoot, recursive);

    if (search) {
      files = files.filter(
        (file) =>
          file.originalName.toLowerCase().includes(search) ||
          file.mimeType.toLowerCase().includes(search)
      );
    }

    const sorted = [...files].sort(sorter);
    const skip = (page - 1) * pageSize;
    const items = sorted.slice(skip, skip + pageSize);

    return {
      success: true,
      data: {
        items,
        total: sorted.length,
        page,
        pageSize,
        hasMore: skip + items.length < sorted.length,
      },
    };
  } catch (error) {
    logger.error(SCOPE, "Failed to fetch files", error);
    return { success: false, error: "Failed to fetch files" };
  }
};

export const deleteFile = async (id: string): Promise<ServerActionResponse> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  let resource = String(id);

  try {
    const target = scopedPath(currentUser, id);
    resource = target.relative;

    const stats = await lstat(target.absolute);
    if (!stats.isFile() && !stats.isSymbolicLink()) {
      return { success: false, error: "Not a file" };
    }

    await unlink(target.absolute);
    await auditLog("file:delete", { resource, success: true });
    await bustFileCache(target.absolute);

    return { success: true, message: "File deleted successfully" };
  } catch (error) {
    logger.error(SCOPE, `Failed to delete ${resource}`, error);
    await auditLog("file:delete", {
      resource,
      success: false,
      errorMessage: _errorText(error, "Failed to delete file"),
    });
    return { success: false, error: "Failed to delete file" };
  }
};

const _exists = async (absolute: string): Promise<boolean> => {
  try {
    await lstat(absolute);
    return true;
  } catch {
    return false;
  }
};

export const renameFile = async (
  fileId: string,
  newName: string
): Promise<ServerActionResponse> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  const name = typeof newName === "string" ? newName.trim() : "";
  if (!isValidName(name)) {
    return { success: false, error: "Invalid file name" };
  }

  let resource = String(fileId);

  try {
    const source = scopedPath(currentUser, fileId);
    resource = source.relative;

    const parentId = path.posix.dirname(String(fileId));
    const destination = scopedPath(
      currentUser,
      parentId === "." ? name : `${parentId}/${name}`
    );

    if (await _exists(destination.absolute)) {
      return { success: false, error: "A file with this name already exists" };
    }

    await rename(source.absolute, destination.absolute);
    await auditLog("file:rename", {
      resource,
      details: { newName: name },
      success: true,
    });
    await bustFileCache(source.absolute, destination.absolute);

    return { success: true, message: "File renamed successfully" };
  } catch (error) {
    logger.error(SCOPE, `Failed to rename ${resource}`, error);
    await auditLog("file:rename", {
      resource,
      details: { newName: name },
      success: false,
      errorMessage: _errorText(error, "Failed to rename file"),
    });
    return { success: false, error: "Failed to rename file" };
  }
};

export const moveFile = async (
  fileId: string,
  targetFolderPath: string
): Promise<ServerActionResponse> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  let resource = String(fileId);

  try {
    const source = scopedPath(currentUser, fileId);
    resource = source.relative;

    const targetDir = scopedPath(currentUser, targetFolderPath);
    const destination = scopedPath(
      currentUser,
      path.posix.join(targetFolderPath || "", path.basename(source.absolute))
    );

    if (await _exists(destination.absolute)) {
      return { success: false, error: "A file with this name already exists" };
    }

    await mkdir(targetDir.absolute, { recursive: true });
    await rename(source.absolute, destination.absolute);
    await auditLog("file:move", {
      resource,
      details: { targetPath: targetDir.relative },
      success: true,
    });
    await bustFileCache(source.absolute, destination.absolute);

    return { success: true, message: "File moved successfully" };
  } catch (error) {
    logger.error(SCOPE, `Failed to move ${resource}`, error);
    await auditLog("file:move", {
      resource,
      details: { targetPath: targetFolderPath },
      success: false,
      errorMessage: _errorText(error, "Failed to move file"),
    });
    return { success: false, error: "Failed to move file" };
  }
};
