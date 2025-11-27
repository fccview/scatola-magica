"use server";

import { unlink, stat, readdir, lstat, rename, mkdir } from "fs/promises";
import path from "path";
import {
  ServerActionResponse,
  PaginatedResponse,
  FileMetadata,
} from "@/app/_types";
import { SortBy } from "@/app/_types/enums";
import { revalidatePath } from "next/cache";
import { getFileMimeType } from "@/app/_lib/file-utils";
import { unstable_cache } from "next/cache";
import { getCurrentUser } from "@/app/actions/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./data/uploads";

const CACHE_TTL = 60;

interface GetFilesOptions {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: SortBy;
  folderPath?: string;
  recursive?: boolean;
}

async function scanFilesystemDirectory(
  dirPath: string,
  relativePath: string = "",
  recursive: boolean = false,
  currentFolderPath: string = ""
): Promise<FileMetadata[]> {
  const files: FileMetadata[] = [];

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

        if (stats.isFile()) {
          let folderPath: string | undefined = undefined;
          if (recursive && entryRelativePath) {
            let pathWithoutCurrent = entryRelativePath;
            if (currentFolderPath) {
              const prefix = currentFolderPath + "/";
              if (entryRelativePath.startsWith(prefix)) {
                pathWithoutCurrent = entryRelativePath.slice(prefix.length);
              } else if (entryRelativePath.startsWith(currentFolderPath)) {
                pathWithoutCurrent = entryRelativePath
                  .slice(currentFolderPath.length)
                  .replace(/^\//, "");
              }
            }

            const parts = pathWithoutCurrent.split("/");
            if (parts.length > 1) {
              parts.pop();
              folderPath = parts.join("/");
            }
          }

          const mimeType = getFileMimeType(entry);
          files.push({
            id: entryRelativePath,
            name: entry,
            originalName: entry,
            size: stats.size,
            mimeType,
            uploadedAt: stats.mtime.getTime(),
            lastModified: stats.mtime.getTime(),
            path: `/uploads/${entryRelativePath}`,
            folderPath,
          });
        } else if (stats.isDirectory() && recursive) {
          const subFiles = await scanFilesystemDirectory(
            fullPath,
            entryRelativePath,
            recursive,
            currentFolderPath
          );
          files.push(...subFiles);
        }
      } catch (error) {
        console.warn(`Error reading ${fullPath}:`, error);
      }
    }
  } catch (error) {
    console.warn(`Error scanning directory ${dirPath}:`, error);
  }

  return files;
}

const getFilesCached = unstable_cache(
  async (folderPath: string, recursive: boolean) => {
    const scanPath = folderPath
      ? path.join(UPLOAD_DIR, folderPath)
      : UPLOAD_DIR;

    return await scanFilesystemDirectory(
      scanPath,
      folderPath,
      recursive,
      folderPath
    );
  },
  ["files-by-path"],
  {
    revalidate: CACHE_TTL,
    tags: ["files"],
  }
);

export async function getFiles(
  options: GetFilesOptions = {}
): Promise<ServerActionResponse<PaginatedResponse<FileMetadata>>> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const {
      page = 1,
      pageSize = 15,
      search = "",
      sortBy = SortBy.DATE_DESC,
      folderPath = "",
      recursive = false,
    } = options;

    const shouldScanRecursive = recursive || !!search;

    let allFiles: FileMetadata[] = [];

    if (currentUser.isAdmin) {
      try {
        allFiles = await getFilesCached(folderPath, shouldScanRecursive);
      } catch (error) {
        console.error("Filesystem scan failed:", error);
        return {
          success: false,
          error: "Failed to scan filesystem",
        };
      }
    } else {
      const actualFolderPath = folderPath
        ? `${currentUser.username}/${folderPath}`
        : currentUser.username;

      try {
        allFiles = await getFilesCached(actualFolderPath, shouldScanRecursive);
      } catch (error) {
        console.error("Filesystem scan failed:", error);
        return {
          success: false,
          error: "Failed to scan filesystem",
        };
      }

      const userPrefix = `${currentUser.username}/`;
      allFiles = allFiles.map((file) => ({
        ...file,
        id: file.id.startsWith(userPrefix)
          ? file.id.slice(userPrefix.length)
          : file.id,
        path: file.path,
        folderPath: file.folderPath
          ? file.folderPath.startsWith(userPrefix)
            ? file.folderPath.slice(userPrefix.length)
            : file.folderPath
          : undefined,
      }));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      allFiles = allFiles.filter(
        (file) =>
          file.originalName.toLowerCase().includes(searchLower) ||
          file.mimeType.toLowerCase().includes(searchLower)
      );
    }

    const sortedFiles = sortFiles(allFiles, sortBy);

    const skip = (page - 1) * pageSize;
    const paginatedFiles = sortedFiles.slice(skip, skip + pageSize);

    return {
      success: true,
      data: {
        items: paginatedFiles,
        total: sortedFiles.length,
        page,
        pageSize,
        hasMore: skip + paginatedFiles.length < sortedFiles.length,
      },
    };
  } catch (error) {
    console.error("Get files error:", error);
    return {
      success: false,
      error: "Failed to fetch files",
    };
  }
}

function sortFiles(files: FileMetadata[], sortBy: SortBy): FileMetadata[] {
  const sorted = [...files];

  switch (sortBy) {
    case SortBy.NAME_ASC:
      return sorted.sort((a, b) =>
        a.originalName.localeCompare(b.originalName)
      );
    case SortBy.NAME_DESC:
      return sorted.sort((a, b) =>
        b.originalName.localeCompare(a.originalName)
      );
    case SortBy.DATE_ASC:
      return sorted.sort((a, b) => a.uploadedAt - b.uploadedAt);
    case SortBy.DATE_DESC:
      return sorted.sort((a, b) => b.uploadedAt - a.uploadedAt);
    case SortBy.SIZE_ASC:
      return sorted.sort((a, b) => a.size - b.size);
    case SortBy.SIZE_DESC:
      return sorted.sort((a, b) => b.size - a.size);
    default:
      return sorted.sort((a, b) => b.uploadedAt - a.uploadedAt);
  }
}

export async function getFileById(
  id: string
): Promise<ServerActionResponse<FileMetadata>> {
  try {
    const relativePath = id;
    const fullPath = path.join(UPLOAD_DIR, relativePath);

    try {
      const stats = await stat(fullPath);
      const fileName = path.basename(relativePath);
      const mimeType = getFileMimeType(fileName);

      const fileMetadata: FileMetadata = {
        id,
        name: fileName,
        originalName: fileName,
        size: stats.size,
        mimeType,
        uploadedAt: stats.mtime.getTime(),
        lastModified: stats.mtime.getTime(),
        path: `/uploads/${relativePath}`,
      };

      return {
        success: true,
        data: fileMetadata,
      };
    } catch (error) {
      return {
        success: false,
        error: "File not found",
      };
    }
  } catch (error) {
    console.error("Get file error:", error);
    return {
      success: false,
      error: "Failed to fetch file",
    };
  }
}

export async function deleteFile(id: string): Promise<ServerActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const actualRelativePath = !currentUser.isAdmin
      ? `${currentUser.username}/${id}`
      : id;

    const filePath = path.join(UPLOAD_DIR, actualRelativePath);

    try {
      await unlink(filePath);
    } catch (error) {
      console.error("Failed to delete file from disk:", error);
      return {
        success: false,
        error: "Failed to delete file",
      };
    }

    revalidatePath("/files", "layout");

    return {
      success: true,
      message: "File deleted successfully",
    };
  } catch (error) {
    console.error("Delete file error:", error);
    return {
      success: false,
      error: "Failed to delete file",
    };
  }
}

export async function renameFile(
  fileId: string,
  newName: string
): Promise<ServerActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    if (!newName || newName.trim() === "") {
      return {
        success: false,
        error: "File name cannot be empty",
      };
    }

    const actualCurrentPath = !currentUser.isAdmin
      ? `${currentUser.username}/${fileId}`
      : fileId;

    const currentFilePath = path.join(UPLOAD_DIR, actualCurrentPath);
    const dirPath = path.dirname(currentFilePath);
    const newFilePath = path.join(dirPath, newName.trim());

    try {
      const newFileExists = await stat(newFilePath)
        .then(() => true)
        .catch(() => false);
      if (newFileExists) {
        return {
          success: false,
          error: "A file with this name already exists",
        };
      }

      await rename(currentFilePath, newFilePath);
    } catch (error) {
      console.error("Failed to rename file on filesystem:", error);
      return {
        success: false,
        error: "Failed to rename file on filesystem",
      };
    }

    revalidatePath("/files", "layout");

    return {
      success: true,
      message: "File renamed successfully",
    };
  } catch (error) {
    console.error("Rename file error:", error);
    return {
      success: false,
      error: "Failed to rename file",
    };
  }
}

export async function moveFile(
  fileId: string,
  targetFolderPath: string
): Promise<ServerActionResponse> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const actualCurrentPath = !currentUser.isAdmin
      ? `${currentUser.username}/${fileId}`
      : fileId;

    const actualTargetPath = !currentUser.isAdmin
      ? targetFolderPath
        ? `${currentUser.username}/${targetFolderPath}`
        : currentUser.username
      : targetFolderPath;

    const currentFilePath = path.join(UPLOAD_DIR, actualCurrentPath);
    const fileName = path.basename(actualCurrentPath);

    const targetDir = actualTargetPath
      ? path.join(UPLOAD_DIR, actualTargetPath)
      : UPLOAD_DIR;
    const targetFilePath = path.join(targetDir, fileName);

    try {
      await mkdir(targetDir, { recursive: true });
      await rename(currentFilePath, targetFilePath);
    } catch (error) {
      console.error("Failed to move file on filesystem:", error);
      return {
        success: false,
        error: "Failed to move file on filesystem",
      };
    }

    revalidatePath("/files", "layout");

    return {
      success: true,
      message: "File moved successfully",
    };
  } catch (error) {
    console.error("Move file error:", error);
    return {
      success: false,
      error: "Failed to move file",
    };
  }
}

export async function getStorageStats(): Promise<
  ServerActionResponse<{
    totalFiles: number;
    totalSize: number;
    averageSize: number;
  }>
> {
  try {
    const files = await scanFilesystemDirectory(UPLOAD_DIR, "", true);

    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const averageSize = totalFiles > 0 ? totalSize / totalFiles : 0;

    return {
      success: true,
      data: {
        totalFiles,
        totalSize,
        averageSize,
      },
    };
  } catch (error) {
    console.error("Get storage stats error:", error);
    return {
      success: false,
      error: "Failed to fetch storage stats",
    };
  }
}
