"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { getEncryptionKey } from "@/app/_server/actions/user";
import { getKeyStatus } from "@/app/_server/actions/pgp";
import { auditLog } from "@/app/_server/actions/logs";
import { ServerActionResponse } from "@/app/_types";
import { getUserPreferences } from "@/app/_lib/preferences";
import { saveCreatedTorrent } from "@/app/_lib/torrents/created-torrents";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./data/uploads";
const TORRENTS_DATA_DIR =
  process.env.TORRENTS_DATA_DIR || "./data/config/torrents";

const MAX_BENCODE_DEPTH = 20;

interface TorrentCreateOptions {
  name?: string;
  announce?: string[];
  comment?: string;
  isAnnounced?: boolean;
}

const _calculateInfoHash = (info: any): string => {
  const bencodedInfo = _bencode(info);
  return crypto.createHash("sha1").update(bencodedInfo).digest("hex");
};

const _bencode = (obj: any, depth: number = 0): Buffer => {
  if (depth > MAX_BENCODE_DEPTH) {
    throw new Error("Maximum bencode depth exceeded");
  }

  if (typeof obj === "string") {
    return Buffer.from(`${obj.length}:${obj}`);
  }
  if (typeof obj === "number") {
    return Buffer.from(`i${obj}e`);
  }
  if (Buffer.isBuffer(obj)) {
    return Buffer.concat([Buffer.from(`${obj.length}:`), obj]);
  }
  if (Array.isArray(obj)) {
    const encoded = obj.map((item) => _bencode(item, depth + 1));
    return Buffer.concat([Buffer.from("l"), ...encoded, Buffer.from("e")]);
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const encoded = keys.flatMap((key) => [
      _bencode(key, depth + 1),
      _bencode(obj[key], depth + 1),
    ]);
    return Buffer.concat([Buffer.from("d"), ...encoded, Buffer.from("e")]);
  }
  throw new Error("Unsupported type for bencoding");
};

const _getFilesRecursive = async (
  dirPath: string,
  basePath: string,
  maxFiles: number,
  maxDepth: number,
  maxFileSize: number,
  currentDepth: number = 0,
  currentCount: number = 0
): Promise<{ path: string; length: number }[]> => {
  if (currentDepth > maxDepth) {
    throw new Error(`Maximum directory depth (${maxDepth}) exceeded`);
  }

  const files: { path: string; length: number }[] = [];

  // Check for symlinks on directory, to avoid path traversal
  const dirStats = await fs.lstat(dirPath);
  if (dirStats.isSymbolicLink()) {
    throw new Error("Symlinks are not allowed");
  }

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    const entryStats = await fs.lstat(fullPath);
    if (entryStats.isSymbolicLink()) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = await _getFilesRecursive(
        fullPath,
        basePath,
        maxFiles,
        maxDepth,
        maxFileSize,
        currentDepth + 1,
        currentCount + files.length
      );
      files.push(...subFiles);
    } else {
      const stats = await fs.stat(fullPath);

      if (stats.size > maxFileSize) {
        throw new Error(`File ${entry.name} exceeds maximum size limit`);
      }

      const relativePath = path.relative(basePath, fullPath);
      files.push({
        path: relativePath,
        length: stats.size,
      });

      if (currentCount + files.length > maxFiles) {
        throw new Error(`Maximum file count (${maxFiles}) exceeded`);
      }
    }
  }

  return files;
};

const _checkTorrentsEnabled = async (username: string): Promise<boolean> => {
  const preferences = await getUserPreferences(username);
  return preferences?.torrentPreferences?.enabled ?? false;
};

export const createTorrentFromFile = async (
  filePath: string,
  options?: TorrentCreateOptions
): Promise<
  ServerActionResponse<{
    magnetURI: string;
    torrentFile: string;
    infoHash: string;
  } | null>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const enabled = await _checkTorrentsEnabled(user.username);
    if (!enabled) {
      return { success: true, data: null };
    }

    const encryptionValidation = await validateEncryptionForTorrents();
    if (!encryptionValidation.success) {
      return {
        success: false,
        error: encryptionValidation.error || "Encryption validation failed",
      };
    }

    const preferences = await getUserPreferences(user.username);
    const prefs = preferences.torrentPreferences!;

    const normalizedBase = path.normalize(path.resolve(UPLOADS_DIR));
    const fullPath = path.resolve(UPLOADS_DIR, filePath);
    const normalizedPath = path.normalize(fullPath);

    const relativePath = path.relative(normalizedBase, normalizedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return { success: false, error: "Invalid file path" };
    }

    // Check for symlinks to avoid path traversal
    const lstats = await fs.lstat(fullPath).catch(() => null);
    if (!lstats) {
      return { success: false, error: "File not found" };
    }
    if (lstats.isSymbolicLink()) {
      return { success: false, error: "Symlinks are not allowed" };
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      return { success: false, error: "Path is not a file" };
    }

    if (stats.size > prefs.maxSingleFileSize) {
      return {
        success: false,
        error: `File size exceeds maximum limit of ${Math.round(
          prefs.maxSingleFileSize / 1024 / 1024 / 1024
        )}GB`,
      };
    }

    const fileName = path.basename(fullPath);
    const fileBuffer = await fs.readFile(fullPath);

    const pieceLength = 262144;
    const pieces: Buffer[] = [];
    for (let i = 0; i < fileBuffer.length; i += pieceLength) {
      const piece = fileBuffer.slice(i, i + pieceLength);
      const hash = crypto.createHash("sha1").update(piece).digest();
      pieces.push(hash);
    }

    const info = {
      name: options?.name || fileName,
      "piece length": pieceLength,
      pieces: Buffer.concat(pieces),
      length: stats.size,
    };

    const infoHash = _calculateInfoHash(info);

    const isAnnounced = options?.isAnnounced ?? false;
    const trackers = isAnnounced ? prefs.trackers : [];

    const torrent: any = {
      info,
      comment:
        options?.comment || `Created with Scatola Magica by ${user.username}`,
      "creation date": Math.floor(Date.now() / 1000),
      "created by": "Scatola Magica",
    };

    if (isAnnounced && trackers.length > 0) {
      torrent.announce = trackers[0] || "";
      torrent["announce-list"] = trackers.map((url: string) => [url]);
    } else {
      torrent.private = 1;
    }

    const torrentFile = _bencode(torrent);

    let magnetURI = `magnet:?xt=urn:btih:${infoHash}`;
    if (info.name) {
      magnetURI += `&dn=${encodeURIComponent(info.name)}`;
    }
    if (isAnnounced && trackers.length > 0) {
      trackers.forEach((url: string) => {
        magnetURI += `&tr=${encodeURIComponent(url)}`;
      });
    }

    await fs.mkdir(TORRENTS_DATA_DIR, { recursive: true });
    const torrentFileName = `${infoHash}.torrent`;
    const torrentFilePath = path.join(TORRENTS_DATA_DIR, torrentFileName);
    await fs.writeFile(torrentFilePath, torrentFile);

    await saveCreatedTorrent(user.username, {
      infoHash,
      name: info.name,
      magnetURI,
      torrentFilePath,
      sourcePath: filePath,
      size: stats.size,
      fileCount: 1,
      createdAt: Date.now(),
      createdBy: user.username,
    });

    await auditLog("torrent:create", {
      resource: filePath,
      details: {
        infoHash,
        size: stats.size,
      },
    });

    return {
      success: true,
      data: {
        magnetURI,
        torrentFile: torrentFile.toString("base64"),
        infoHash,
      },
    };
  } catch (error: any) {
    console.error("Create torrent error:", error);
    const errorMsg =
      error?.message?.replace(/\/[^\s]+/g, "[path]") ||
      "Failed to create torrent";

    await auditLog("torrent:error", {
      resource: "createTorrentFromFile",
      details: {
        filePath: filePath?.replace(/\/[^\s]+/g, "[path]"),
        error: errorMsg,
      },
      success: false,
      errorMessage: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
};

export const createTorrentFromFolder = async (
  folderPath: string,
  options?: TorrentCreateOptions
): Promise<
  ServerActionResponse<{
    magnetURI: string;
    torrentFile: string;
    infoHash: string;
  } | null>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const enabled = await _checkTorrentsEnabled(user.username);
    if (!enabled) {
      return { success: true, data: null };
    }

    const encryptionValidation = await validateEncryptionForTorrents();
    if (!encryptionValidation.success) {
      return {
        success: false,
        error: encryptionValidation.error || "Encryption validation failed",
      };
    }

    const preferences = await getUserPreferences(user.username);
    const prefs = preferences.torrentPreferences!;

    const normalizedBase = path.normalize(path.resolve(UPLOADS_DIR));
    const fullPath = path.resolve(UPLOADS_DIR, folderPath);
    const normalizedPath = path.normalize(fullPath);

    const relativePath = path.relative(normalizedBase, normalizedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      return { success: false, error: "Invalid folder path" };
    }

    // Check for symlinks to avoid path traversal
    const lstats = await fs.lstat(fullPath).catch(() => null);
    if (!lstats) {
      return { success: false, error: "Folder not found" };
    }
    if (lstats.isSymbolicLink()) {
      return { success: false, error: "Symlinks are not allowed" };
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return { success: false, error: "Path is not a folder" };
    }

    const folderName = path.basename(fullPath);
    const files = await _getFilesRecursive(
      fullPath,
      fullPath,
      prefs.maxFolderFileCount,
      prefs.maxPathDepth,
      prefs.maxSingleFileSize
    );

    if (files.length === 0) {
      return { success: false, error: "Folder is empty" };
    }

    const pieceLength = 262144;
    const pieces: Buffer[] = [];
    let currentPiece = Buffer.alloc(0);

    for (const file of files) {
      const fileFullPath = path.join(fullPath, file.path);
      const fileBuffer = await fs.readFile(fileFullPath);

      let offset = 0;
      while (offset < fileBuffer.length) {
        const remainingInPiece = pieceLength - currentPiece.length;
        const chunk = fileBuffer.slice(offset, offset + remainingInPiece);
        currentPiece = Buffer.concat([currentPiece, chunk]);
        offset += chunk.length;

        if (currentPiece.length === pieceLength) {
          const hash = crypto.createHash("sha1").update(currentPiece).digest();
          pieces.push(hash);
          currentPiece = Buffer.alloc(0);
        }
      }
    }

    if (currentPiece.length > 0) {
      const hash = crypto.createHash("sha1").update(currentPiece).digest();
      pieces.push(hash);
    }

    const totalSize = files.reduce((sum, f) => sum + f.length, 0);

    if (totalSize > prefs.maxTotalTorrentSize) {
      return {
        success: false,
        error: `Total torrent size exceeds maximum limit of ${Math.round(
          prefs.maxTotalTorrentSize / 1024 / 1024 / 1024
        )}GB`,
      };
    }

    const info: any = {
      name: options?.name || folderName,
      "piece length": pieceLength,
      pieces: Buffer.concat(pieces),
      files: files.map((f) => ({
        path: f.path.split(path.sep),
        length: f.length,
      })),
    };

    const infoHash = _calculateInfoHash(info);

    const isAnnounced = options?.isAnnounced ?? false;
    const trackers = isAnnounced ? prefs.trackers : [];

    const torrent: any = {
      info,
      comment:
        options?.comment || `Created with Scatola Magica by ${user.username}`,
      "creation date": Math.floor(Date.now() / 1000),
      "created by": "Scatola Magica",
    };

    if (isAnnounced && trackers.length > 0) {
      torrent.announce = trackers[0] || "";
      torrent["announce-list"] = trackers.map((url: string) => [url]);
    } else {
      torrent.private = 1;
    }

    const torrentFile = _bencode(torrent);

    let magnetURI = `magnet:?xt=urn:btih:${infoHash}`;
    if (info.name) {
      magnetURI += `&dn=${encodeURIComponent(info.name)}`;
    }
    if (isAnnounced && trackers.length > 0) {
      trackers.forEach((url: string) => {
        magnetURI += `&tr=${encodeURIComponent(url)}`;
      });
    }

    await fs.mkdir(TORRENTS_DATA_DIR, { recursive: true });
    const torrentFileName = `${infoHash}.torrent`;
    const torrentFilePath = path.join(TORRENTS_DATA_DIR, torrentFileName);
    await fs.writeFile(torrentFilePath, torrentFile);

    await saveCreatedTorrent(user.username, {
      infoHash,
      name: info.name,
      magnetURI,
      torrentFilePath,
      sourcePath: folderPath,
      size: totalSize,
      fileCount: files.length,
      createdAt: Date.now(),
      createdBy: user.username,
    });

    await auditLog("torrent:create", {
      resource: folderPath,
      details: {
        infoHash,
        fileCount: files.length,
        size: totalSize,
        announced: isAnnounced,
      },
    });

    return {
      success: true,
      data: {
        magnetURI,
        torrentFile: torrentFile.toString("base64"),
        infoHash,
      },
    };
  } catch (error: any) {
    console.error("Create torrent from folder error:", error);
    const errorMsg =
      error?.message?.replace(/\/[^\s]+/g, "[path]") ||
      "Failed to create torrent from folder";

    await auditLog("torrent:error", {
      resource: "createTorrentFromFolder",
      details: {
        folderPath: folderPath?.replace(/\/[^\s]+/g, "[path]"),
        error: errorMsg,
      },
      success: false,
      errorMessage: errorMsg,
    });

    return {
      success: false,
      error: errorMsg,
    };
  }
};

export const validateEncryptionForTorrents = async (): Promise<
  ServerActionResponse<{ hasEncryption: boolean }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    const keyResult = await getEncryptionKey();
    if (!keyResult.hasEncryptionKey) {
      return {
        success: false,
        error:
          "Encryption must be configured before using torrents. Please set up encryption in Settings.",
        data: { hasEncryption: false },
      };
    }

    const keyStatus = await getKeyStatus();
    if (!keyStatus.hasKeys) {
      return {
        success: false,
        error:
          "PGP keys not found. Please generate or import keys in Settings > Encryption.",
        data: { hasEncryption: false },
      };
    }

    return {
      success: true,
      data: { hasEncryption: true },
    };
  } catch (error) {
    console.error("Encryption validation error:", error);
    return {
      success: false,
      error: "Failed to validate encryption status",
      data: { hasEncryption: false },
    };
  }
};
