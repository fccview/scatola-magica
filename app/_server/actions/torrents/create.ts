"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { validateEncryptionForTorrents } from "@/app/_server/actions/torrents/validation";
import { auditLog } from "@/app/_server/actions/logs";
import { ServerActionResponse } from "@/app/_types";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./data/uploads";

interface TorrentCreateOptions {
  name?: string;
  announce?: string[];
  comment?: string;
}

const _calculateInfoHash = (info: any): string => {
  const bencodedInfo = _bencode(info);
  return crypto.createHash("sha1").update(bencodedInfo).digest("hex");
};

const _bencode = (obj: any): Buffer => {
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
    const encoded = obj.map(_bencode);
    return Buffer.concat([Buffer.from("l"), ...encoded, Buffer.from("e")]);
  }
  if (typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const encoded = keys.flatMap((key) => [
      _bencode(key),
      _bencode(obj[key]),
    ]);
    return Buffer.concat([Buffer.from("d"), ...encoded, Buffer.from("e")]);
  }
  throw new Error("Unsupported type for bencoding");
};

const _getFilesRecursive = async (
  dirPath: string,
  basePath: string
): Promise<{ path: string; length: number }[]> => {
  const files: { path: string; length: number }[] = [];
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const subFiles = await _getFilesRecursive(fullPath, basePath);
      files.push(...subFiles);
    } else {
      const stats = await fs.stat(fullPath);
      const relativePath = path.relative(basePath, fullPath);
      files.push({
        path: relativePath,
        length: stats.size,
      });
    }
  }

  return files;
};

export const createTorrentFromFile = async (
  filePath: string,
  options?: TorrentCreateOptions
): Promise<
  ServerActionResponse<{ magnetURI: string; torrentFile: Buffer; infoHash: string }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const encryptionValidation = await validateEncryptionForTorrents();
    if (!encryptionValidation.success) {
      return {
        success: false,
        error: encryptionValidation.error || "Encryption validation failed",
      };
    }

    // filePath is already relative from UPLOADS_DIR (e.g., "admin/test_parse.js")
    const fullPath = path.join(UPLOADS_DIR, filePath);

    // Verify file exists and is within uploads directory
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(UPLOADS_DIR);
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return { success: false, error: "Invalid file path" };
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isFile()) {
      return { success: false, error: "Path is not a file" };
    }

    const fileName = path.basename(fullPath);
    const fileBuffer = await fs.readFile(fullPath);

    // Calculate piece length (256KB for most files)
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

    const torrent: any = {
      info,
      announce: options?.announce?.[0] || "",
      "announce-list": options?.announce?.map((url) => [url]) || [],
      comment: options?.comment || `Created with Scatola Magica by ${user.username}`,
      "creation date": Math.floor(Date.now() / 1000),
      "created by": "Scatola Magica",
    };

    const torrentFile = _bencode(torrent);

    // Construct magnet URI manually
    let magnetURI = `magnet:?xt=urn:btih:${infoHash}`;
    if (info.name) {
      magnetURI += `&dn=${encodeURIComponent(info.name)}`;
    }
    if (options?.announce && options.announce.length > 0) {
      options.announce.forEach((url) => {
        magnetURI += `&tr=${encodeURIComponent(url)}`;
      });
    }

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
        torrentFile,
        infoHash,
      },
    };
  } catch (error) {
    console.error("Create torrent error:", error);
    return {
      success: false,
      error: "Failed to create torrent",
    };
  }
};

export const createTorrentFromFolder = async (
  folderPath: string,
  options?: TorrentCreateOptions
): Promise<
  ServerActionResponse<{ magnetURI: string; torrentFile: Buffer; infoHash: string }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const encryptionValidation = await validateEncryptionForTorrents();
    if (!encryptionValidation.success) {
      return {
        success: false,
        error: encryptionValidation.error || "Encryption validation failed",
      };
    }

    // folderPath is already relative from UPLOADS_DIR (e.g., "admin/myfolder")
    const fullPath = path.join(UPLOADS_DIR, folderPath);

    // Verify folder exists and is within uploads directory
    const normalizedPath = path.normalize(fullPath);
    const normalizedUploadsDir = path.normalize(UPLOADS_DIR);
    if (!normalizedPath.startsWith(normalizedUploadsDir)) {
      return { success: false, error: "Invalid folder path" };
    }

    const stats = await fs.stat(fullPath);
    if (!stats.isDirectory()) {
      return { success: false, error: "Path is not a folder" };
    }

    const folderName = path.basename(fullPath);
    const files = await _getFilesRecursive(fullPath, fullPath);

    if (files.length === 0) {
      return { success: false, error: "Folder is empty" };
    }

    // Read all files and calculate pieces
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

    // Hash final piece if any data remaining
    if (currentPiece.length > 0) {
      const hash = crypto.createHash("sha1").update(currentPiece).digest();
      pieces.push(hash);
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

    const torrent: any = {
      info,
      announce: options?.announce?.[0] || "",
      "announce-list": options?.announce?.map((url) => [url]) || [],
      comment: options?.comment || `Created with Scatola Magica by ${user.username}`,
      "creation date": Math.floor(Date.now() / 1000),
      "created by": "Scatola Magica",
    };

    const torrentFile = _bencode(torrent);

    // Construct magnet URI manually
    let magnetURI = `magnet:?xt=urn:btih:${infoHash}`;
    if (info.name) {
      magnetURI += `&dn=${encodeURIComponent(info.name)}`;
    }
    if (options?.announce && options.announce.length > 0) {
      options.announce.forEach((url) => {
        magnetURI += `&tr=${encodeURIComponent(url)}`;
      });
    }

    const totalSize = files.reduce((sum, f) => sum + f.length, 0);

    await auditLog("torrent:create", {
      resource: folderPath,
      details: {
        infoHash,
        fileCount: files.length,
        size: totalSize,
      },
    });

    return {
      success: true,
      data: {
        magnetURI,
        torrentFile,
        infoHash,
      },
    };
  } catch (error) {
    console.error("Create torrent from folder error:", error);
    return {
      success: false,
      error: "Failed to create torrent from folder",
    };
  }
};
