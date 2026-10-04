"use server";

import { lstat, mkdir, rename, rm } from "fs/promises";
import path from "path";
import { ServerActionResponse } from "@/app/_types";
import { getCurrentUser } from "@/app/_lib/current-user";
import { readUsers } from "@/app/_lib/auth-utils";
import { auditLog } from "@/app/_lib/audit-log";
import {
  describeFolder,
  FolderMetadata,
  scanFolders,
  sortFolderTree,
} from "@/app/_lib/folder-scan";
import {
  isValidName,
  scopedPath,
  userRoot,
  UPLOAD_DIR,
} from "@/app/_lib/storage";
import { bustFileCache } from "@/app/_lib/cache/bust";
import { pensieve } from "@/app/_lib/cache/pensieve";
import { dirScopes, rootScope } from "@/app/_lib/cache/scopes";
import { logger } from "@/app/_lib/logger";

export type { FolderMetadata } from "@/app/_lib/folder-scan";

const SCOPE = "folder-actions";
const UNAUTHORIZED = { success: false, error: "Unauthorized" };

const _cachedTree = (ownerRoot: string) =>
  pensieve("folder-tree", [ownerRoot], [rootScope(ownerRoot)], async () =>
    sortFolderTree(await scanFolders(ownerRoot, ownerRoot, true))
  );

const _cachedLevel = (ownerRoot: string, dirAbs: string) =>
  pensieve("folder-level", [ownerRoot, dirAbs], dirScopes(dirAbs), async () =>
    (await scanFolders(ownerRoot, dirAbs, false)).sort((a, b) =>
      a.name.localeCompare(b.name)
    )
  );

const _isDirectory = async (absolute: string): Promise<boolean> => {
  try {
    return (await lstat(absolute)).isDirectory();
  } catch {
    return false;
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

const _isHomeFolder = async (absolute: string): Promise<boolean> => {
  if (path.dirname(absolute) !== UPLOAD_DIR) return false;

  const users = await readUsers();
  return users.some((u) => u.username === path.basename(absolute));
};

export const getAllFolders = async (): Promise<
  ServerActionResponse<FolderMetadata[]>
> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  try {
    const root = userRoot(currentUser);
    await mkdir(root, { recursive: true });
    return { success: true, data: await _cachedTree(root) };
  } catch (error) {
    logger.error(SCOPE, "Failed to fetch folders", error);
    return { success: false, error: "Failed to fetch folders" };
  }
};

export const getFolders = async (
  parentId?: string | null
): Promise<ServerActionResponse<FolderMetadata[]>> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  try {
    const root = userRoot(currentUser);
    const parent = scopedPath(currentUser, parentId ?? "");
    const data = await _cachedLevel(root, parent.absolute);
    return { success: true, data };
  } catch (error) {
    logger.error(SCOPE, "Failed to fetch folders", error);
    return { success: false, error: "Failed to fetch folders" };
  }
};

export const getFolderById = async (
  id: string
): Promise<ServerActionResponse<FolderMetadata>> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  try {
    const folder = scopedPath(currentUser, id);
    if (!id || !(await _isDirectory(folder.absolute))) {
      return { success: false, error: "Folder not found" };
    }

    return {
      success: true,
      data: await describeFolder(userRoot(currentUser), folder.absolute),
    };
  } catch (error) {
    logger.warn(SCOPE, `Failed to read folder ${id}`, error);
    return { success: false, error: "Folder not found" };
  }
};

export const createFolder = async (
  name: string,
  parentId?: string | null
): Promise<ServerActionResponse<FolderMetadata>> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  const folderName = typeof name === "string" ? name.trim() : "";
  if (!isValidName(folderName)) {
    return { success: false, error: "Invalid folder name" };
  }

  try {
    const target = scopedPath(
      currentUser,
      parentId ? `${parentId}/${folderName}` : folderName
    );

    if (await _exists(target.absolute)) {
      return { success: false, error: "A folder with this name already exists" };
    }

    await mkdir(target.absolute, { recursive: true });
    await auditLog("folder:create", { resource: target.relative, success: true });
    await bustFileCache(target.absolute);

    return {
      success: true,
      data: await describeFolder(userRoot(currentUser), target.absolute),
    };
  } catch (error) {
    logger.error(SCOPE, "Failed to create folder", error);
    return { success: false, error: "Failed to create folder" };
  }
};

export const updateFolder = async (
  id: string,
  name: string
): Promise<ServerActionResponse<FolderMetadata>> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  const folderName = typeof name === "string" ? name.trim() : "";
  if (!isValidName(folderName) || !id) {
    return { success: false, error: "Invalid folder name" };
  }

  try {
    const source = scopedPath(currentUser, id);
    if (!(await _isDirectory(source.absolute))) {
      return { success: false, error: "Folder not found" };
    }

    if (await _isHomeFolder(source.absolute)) {
      return { success: false, error: "Cannot rename a user's home folder" };
    }

    const parentId = path.posix.dirname(id);
    const destination = scopedPath(
      currentUser,
      parentId === "." ? folderName : `${parentId}/${folderName}`
    );

    if (await _exists(destination.absolute)) {
      return { success: false, error: "A folder with this name already exists" };
    }

    await rename(source.absolute, destination.absolute);
    await auditLog("folder:rename", {
      resource: source.relative,
      details: { newName: folderName },
      success: true,
    });
    await bustFileCache(source.absolute, destination.absolute);

    return {
      success: true,
      data: await describeFolder(userRoot(currentUser), destination.absolute),
    };
  } catch (error) {
    logger.error(SCOPE, `Failed to rename folder ${id}`, error);
    return { success: false, error: "Failed to update folder" };
  }
};

export const deleteFolder = async (id: string): Promise<ServerActionResponse> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  try {
    const target = scopedPath(currentUser, id);
    if (!id || target.absolute === userRoot(currentUser)) {
      return { success: false, error: "Cannot delete the root folder" };
    }

    if (!(await _isDirectory(target.absolute))) {
      return { success: false, error: "Folder not found" };
    }

    await rm(target.absolute, { recursive: true });
    await auditLog("folder:delete", { resource: target.relative, success: true });
    await bustFileCache(target.absolute);

    return { success: true, message: "Folder deleted successfully" };
  } catch (error) {
    logger.error(SCOPE, `Failed to delete folder ${id}`, error);
    return { success: false, error: "Failed to delete folder" };
  }
};

export const getFolderPath = async (
  folderId: string
): Promise<ServerActionResponse<FolderMetadata[]>> => {
  const currentUser = await getCurrentUser();
  if (!currentUser) return UNAUTHORIZED;

  const root = userRoot(currentUser);
  const parts = String(folderId ?? "").split("/").filter(Boolean);
  const breadcrumbs: FolderMetadata[] = [];

  for (let i = 0; i < parts.length; i++) {
    try {
      const crumb = scopedPath(currentUser, parts.slice(0, i + 1).join("/"));
      breadcrumbs.push(await describeFolder(root, crumb.absolute));
    } catch (error) {
      logger.warn(SCOPE, `Skipping breadcrumb for ${folderId}`, error);
    }
  }

  return { success: true, data: breadcrumbs };
};
