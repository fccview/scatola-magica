"use server";

import { mkdir, rmdir, rename as fsRename, readdir, lstat } from "fs/promises";
import path from "path";
import { ServerActionResponse } from "@/app/_types";
import { revalidatePath } from "next/cache";
import { unstable_cache } from "next/cache";
import { getCurrentUser } from "@/app/_server/actions/user";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

const CACHE_TTL = 60;

export interface FolderMetadata {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  fileCount?: number;
  folderCount?: number;
}

function _pathToId(relativePath: string): string {
  return relativePath;
}

function _idToPath(id: string): string {
  return id;
}

const _getAllFolders = unstable_cache(
  async () => {
    const folders = await _recursiveFolderScan(UPLOAD_DIR);

    folders.sort((a, b) => {
      if (a.parentId === b.parentId) {
        return a.name.localeCompare(b.name);
      }
      return (a.parentId || "").localeCompare(b.parentId || "");
    });

    return folders;
  },
  ["all-folders"],
  {
    revalidate: CACHE_TTL,
    tags: ["folders"],
  }
);

const _getFolders = unstable_cache(
  async (parentPath: string) => {
    const scanPath = parentPath
      ? path.join(UPLOAD_DIR, parentPath)
      : UPLOAD_DIR;

    const folders = await _scanFolders(scanPath, parentPath, parentPath || null);
    folders.sort((a, b) => a.name.localeCompare(b.name));
    return folders;
  },
  ["folders-by-path"],
  {
    revalidate: CACHE_TTL,
    tags: ["folders"],
  }
);

const _scanFolders = async (
  dirPath: string,
  relativePath: string = "",
  parentId: string | null = null
): Promise<FolderMetadata[]> => {
  const folders: FolderMetadata[] = [];

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      if (entry === "temp") continue;

      const fullPath = path.join(dirPath, entry);
      const entryRelativePath = relativePath
        ? `${relativePath}/${entry}`
        : entry;

      try {
        const stats = await lstat(fullPath);

        if (stats.isDirectory()) {
          const folderId = _pathToId(entryRelativePath);

          let fileCount = 0;
          let folderCount = 0;

          try {
            const subEntries = await readdir(fullPath);
            for (const subEntry of subEntries) {
              if (subEntry === "temp") continue;
              const subPath = path.join(fullPath, subEntry);
              try {
                const subStats = await lstat(subPath);
                if (subStats.isFile()) {
                  fileCount++;
                } else if (subStats.isDirectory()) {
                  folderCount++;
                }
              } catch (subError) {
                console.warn(`Error reading sub-entry ${subPath}:`, subError);
              }
            }
          } catch (readError) {
            console.warn(`Error reading directory ${fullPath}:`, readError);
          }

          const folderMetadata = {
            id: folderId,
            name: entry,
            parentId,
            createdAt: stats.mtime.getTime(),
            updatedAt: stats.mtime.getTime(),
            fileCount,
            folderCount,
          };

          folders.push(folderMetadata);
        }
      } catch (error) {
        console.warn(`Error reading ${fullPath}:`, error);
      }
    }
  } catch (error) {
    console.warn(`Error scanning directory ${dirPath}:`, error);
  }

  return folders;
}

const _recursiveFolderScan = async (
  dirPath: string,
  relativePath: string = "",
  parentId: string | null = null
): Promise<FolderMetadata[]> => {
  let allFolders: FolderMetadata[] = [];

  try {
    const entries = await readdir(dirPath);

    for (const entry of entries) {
      if (entry === "temp") continue;

      const fullPath = path.join(dirPath, entry);
      const entryRelativePath = relativePath
        ? `${relativePath}/${entry}`
        : entry;

      try {
        const stats = await lstat(fullPath);

        if (stats.isDirectory()) {
          const folderId = _pathToId(entryRelativePath);

          let fileCount = 0;
          let folderCount = 0;

          try {
            const subEntries = await readdir(fullPath);
            for (const subEntry of subEntries) {
              if (subEntry === "temp") continue;
              const subPath = path.join(fullPath, subEntry);
              try {
                const subStats = await lstat(subPath);
                if (subStats.isFile()) {
                  fileCount++;
                } else if (subStats.isDirectory()) {
                  folderCount++;
                }
              } catch (subError) {
                console.warn(`Error reading sub-entry ${subPath}:`, subError);
              }
            }
          } catch (readError) {
            console.warn(`Error reading directory ${fullPath}:`, readError);
          }

          allFolders.push({
            id: folderId,
            name: entry,
            parentId,
            createdAt: stats.mtime.getTime(),
            updatedAt: stats.mtime.getTime(),
            fileCount,
            folderCount,
          });

          const subFolders = await _recursiveFolderScan(
            fullPath,
            entryRelativePath,
            folderId
          );
          allFolders = allFolders.concat(subFolders);
        }
      } catch (error) {
        console.warn(`Error reading ${fullPath}:`, error);
      }
    }
  } catch (error) {
    console.warn(`Error scanning directory ${dirPath}:`, error);
  }

  return allFolders;
}

export const getAllFolders = async (): Promise<
  ServerActionResponse<FolderMetadata[]>
> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    let folders: FolderMetadata[];
    try {
      folders = await _getAllFolders();
    } catch (cacheError) {
      console.error("Cache error in getAllFolders:", cacheError);
      folders = await _recursiveFolderScan(UPLOAD_DIR);
      folders.sort((a, b) => {
        if (a.parentId === b.parentId) {
          return a.name.localeCompare(b.name);
        }
        return (a.parentId || "").localeCompare(b.parentId || "");
      });
    }

    if (currentUser.isAdmin) {
      return {
        success: true,
        data: folders,
      };
    }

    const userPrefix = `${currentUser.username}/`;
    const userFolders = folders
      .filter((folder) => folder.id.startsWith(userPrefix))
      .map((folder) => ({
        ...folder,
        id: folder.id.slice(userPrefix.length),
        parentId: folder.parentId
          ? folder.parentId === currentUser.username
            ? null
            : folder.parentId.slice(userPrefix.length)
          : null,
      }));

    return {
      success: true,
      data: userFolders,
    };
  } catch (error) {
    console.error("Get all folders error:", error);
    return {
      success: false,
      error: "Failed to fetch folders",
    };
  }
}

export const getFolders = async (
  parentId?: string | null
): Promise<ServerActionResponse<FolderMetadata[]>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const parentPath = parentId ? _idToPath(parentId) : "";

    let folders: FolderMetadata[];
    let scanPath: string;

    if (currentUser.isAdmin) {
      scanPath = parentPath ? path.join(UPLOAD_DIR, parentPath) : UPLOAD_DIR;
      try {
        folders = await _getFolders(parentPath);
      } catch (cacheError) {
        console.error("Cache error in getFolders:", cacheError);
        folders = await _scanFolders(scanPath, parentPath, parentPath || null);
        folders.sort((a, b) => a.name.localeCompare(b.name));
      }
      return {
        success: true,
        data: folders,
      };
    }

    const actualParentPath = parentPath
      ? `${currentUser.username}/${parentPath}`
      : currentUser.username;

    scanPath = path.join(UPLOAD_DIR, actualParentPath);
    try {
      folders = await _getFolders(actualParentPath);
    } catch (cacheError) {
      console.error("Cache error in getFolders:", cacheError);
      folders = await _scanFolders(
        scanPath,
        actualParentPath,
        actualParentPath || null
      );
      folders.sort((a, b) => a.name.localeCompare(b.name));
    }

    const userPrefix = `${currentUser.username}/`;
    const userFolders = folders.map((folder) => ({
      ...folder,
      id: folder.id.startsWith(userPrefix)
        ? folder.id.slice(userPrefix.length)
        : folder.id,
      parentId: folder.parentId
        ? folder.parentId === currentUser.username
          ? null
          : folder.parentId.startsWith(userPrefix)
            ? folder.parentId.slice(userPrefix.length)
            : folder.parentId
        : null,
    }));

    return {
      success: true,
      data: userFolders,
    };
  } catch (error) {
    console.error("Get folders error:", error);
    return {
      success: false,
      error: "Failed to fetch folders",
    };
  }
}

export const getFolderById = async (
  id: string
): Promise<ServerActionResponse<FolderMetadata>> => {
  try {
    const folderPath = _idToPath(id);
    const fullPath = path.join(UPLOAD_DIR, folderPath);

    try {
      const stats = await lstat(fullPath);

      if (!stats.isDirectory()) {
        return {
          success: false,
          error: "Not a folder",
        };
      }

      const pathParts = folderPath.split("/").filter((p) => p);
      const parentPath = pathParts.slice(0, -1).join("/");
      const parentId = parentPath ? _pathToId(parentPath) : null;

      const entries = await readdir(fullPath);
      let fileCount = 0;
      let folderCount = 0;

      for (const entry of entries) {
        if (entry === "temp") continue;
        const entryPath = path.join(fullPath, entry);
        const entryStats = await lstat(entryPath);
        if (entryStats.isFile()) {
          fileCount++;
        } else if (entryStats.isDirectory()) {
          folderCount++;
        }
      }

      const folderMetadata: FolderMetadata = {
        id,
        name: path.basename(fullPath),
        parentId,
        createdAt: stats.mtime.getTime(),
        updatedAt: stats.mtime.getTime(),
        fileCount,
        folderCount,
      };

      return {
        success: true,
        data: folderMetadata,
      };
    } catch (error) {
      return {
        success: false,
        error: "Folder not found",
      };
    }
  } catch (error) {
    console.error("Get folder error:", error);
    return {
      success: false,
      error: "Failed to fetch folder",
    };
  }
}

export const createFolder = async (
  name: string,
  parentId?: string | null
): Promise<ServerActionResponse<FolderMetadata>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: "Folder name is required",
      };
    }

    const sanitizedName = name.trim();

    const parentPath = parentId ? _idToPath(parentId) : "";
    const actualParentPath = !currentUser.isAdmin
      ? parentPath
        ? `${currentUser.username}/${parentPath}`
        : currentUser.username
      : parentPath;

    const newFolderPath = actualParentPath
      ? `${actualParentPath}/${sanitizedName}`
      : sanitizedName;

    const fullPath = path.join(UPLOAD_DIR, newFolderPath);

    try {
      const stats = await lstat(fullPath);
      if (stats) {
        return {
          success: false,
          error: "A folder with this name already exists",
        };
      }
    } catch { }

    await mkdir(fullPath, { recursive: true });

    const stats = await lstat(fullPath);
    const folderId = _pathToId(newFolderPath);

    const folderMetadata: FolderMetadata = {
      id: folderId,
      name: sanitizedName,
      parentId: parentId || null,
      createdAt: stats.mtime.getTime(),
      updatedAt: stats.mtime.getTime(),
      fileCount: 0,
      folderCount: 0,
    };

    revalidatePath("/files", "layout");

    return {
      success: true,
      data: folderMetadata,
    };
  } catch (error) {
    console.error("Create folder error:", error);
    return {
      success: false,
      error: "Failed to create folder",
    };
  }
}

export const updateFolder = async (
  id: string,
  name: string
): Promise<ServerActionResponse<FolderMetadata>> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!name || name.trim().length === 0) {
      return {
        success: false,
        error: "Folder name is required",
      };
    }

    const oldPath = _idToPath(id);
    const actualOldPath = !currentUser.isAdmin
      ? `${currentUser.username}/${oldPath}`
      : oldPath;

    const oldFullPath = path.join(UPLOAD_DIR, actualOldPath);

    try {
      await lstat(oldFullPath);
    } catch {
      return {
        success: false,
        error: "Folder not found",
      };
    }

    const pathParts = actualOldPath.split("/").filter((p) => p);
    const parentPath = pathParts.slice(0, -1).join("/");
    const newPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim();
    const newFullPath = path.join(UPLOAD_DIR, newPath);

    try {
      const stats = await lstat(newFullPath);
      if (stats) {
        return {
          success: false,
          error: "A folder with this name already exists",
        };
      }
    } catch { }

    try {
      await fsRename(oldFullPath, newFullPath);
    } catch (fsError) {
      console.error("Filesystem rename error:", fsError);
      return {
        success: false,
        error: "Failed to rename folder directory",
      };
    }

    const stats = await lstat(newFullPath);
    let newId = _pathToId(newPath);
    let responseParentId = parentPath ? _pathToId(parentPath) : null;

    if (!currentUser.isAdmin) {
      const userPrefix = `${currentUser.username}/`;
      if (newId.startsWith(userPrefix)) {
        newId = newId.slice(userPrefix.length);
      }
      if (responseParentId) {
        if (responseParentId === currentUser.username) {
          responseParentId = null;
        } else if (responseParentId.startsWith(userPrefix)) {
          responseParentId = responseParentId.slice(userPrefix.length);
        }
      }
    }

    const entries = await readdir(newFullPath);
    let fileCount = 0;
    let folderCount = 0;

    for (const entry of entries) {
      if (entry === "temp") continue;
      const entryPath = path.join(newFullPath, entry);
      const entryStats = await lstat(entryPath);
      if (entryStats.isFile()) {
        fileCount++;
      } else if (entryStats.isDirectory()) {
        folderCount++;
      }
    }

    const folderMetadata: FolderMetadata = {
      id: newId,
      name: name.trim(),
      parentId: responseParentId,
      createdAt: stats.mtime.getTime(),
      updatedAt: stats.mtime.getTime(),
      fileCount,
      folderCount,
    };

    revalidatePath("/files", "layout");

    return {
      success: true,
      data: folderMetadata,
    };
  } catch (error) {
    console.error("Update folder error:", error);
    return {
      success: false,
      error: "Failed to update folder",
    };
  }
}

export const deleteFolder = async (id: string): Promise<ServerActionResponse> => {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const folderPath = _idToPath(id);
    const actualFolderPath = !currentUser.isAdmin
      ? `${currentUser.username}/${folderPath}`
      : folderPath;

    const fullPath = path.join(UPLOAD_DIR, actualFolderPath);

    try {
      await lstat(fullPath);
    } catch {
      return {
        success: false,
        error: "Folder not found",
      };
    }

    try {
      await rmdir(fullPath, { recursive: true });
    } catch (error) {
      console.error("Failed to delete folder:", error);
      return {
        success: false,
        error: "Failed to delete folder",
      };
    }

    revalidatePath("/files", "layout");

    return {
      success: true,
      message: "Folder deleted successfully",
    };
  } catch (error) {
    console.error("Delete folder error:", error);
    return {
      success: false,
      error: "Failed to delete folder",
    };
  }
}

export const getFolderPath = async (
  folderId: string
): Promise<ServerActionResponse<FolderMetadata[]>> => {
  try {
    const folderPath = _idToPath(folderId);
    const pathParts = folderPath.split("/").filter((p) => p);

    const breadcrumbs: FolderMetadata[] = [];

    for (let i = 0; i < pathParts.length; i++) {
      const currentPath = pathParts.slice(0, i + 1).join("/");
      const currentId = _pathToId(currentPath);
      const fullPath = path.join(UPLOAD_DIR, currentPath);

      try {
        const stats = await lstat(fullPath);
        const parentPath = pathParts.slice(0, i).join("/");
        const parentId = parentPath ? _pathToId(parentPath) : null;

        breadcrumbs.push({
          id: currentId,
          name: pathParts[i],
          parentId,
          createdAt: stats.mtime.getTime(),
          updatedAt: stats.mtime.getTime(),
        });
      } catch (error) {
        console.warn(`Error reading folder ${fullPath}:`, error);
      }
    }

    return {
      success: true,
      data: breadcrumbs,
    };
  } catch (error) {
    console.error("Get folder path error:", error);
    return {
      success: false,
      error: "Failed to get folder path",
    };
  }
}
