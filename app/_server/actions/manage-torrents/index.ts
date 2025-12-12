"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { validateEncryptionForTorrents } from "@/app/_server/actions/make-torrents";
import { getTorrentManager } from "@/app/_lib/torrents/torrent-manager";
import {
  saveTorrentSession,
  loadTorrentSessions,
  deleteTorrentSession,
} from "@/app/_lib/torrents/torrent-sessions";
import {
  loadCreatedTorrents,
  deleteCreatedTorrent,
} from "@/app/_lib/torrents/created-torrents";
import { getUserPreferences } from "@/app/_lib/preferences";
import { auditLog } from "@/app/_server/actions/logs";
import { ServerActionResponse } from "@/app/_types";
import {
  TorrentSession,
  TorrentStatus,
  TorrentMetadata,
  TorrentState,
} from "@/app/_types/torrent";
import parseTorrent from "parse-torrent";
import path from "path";
import fs from "fs/promises";

const UPLOADS_DIR = process.env.UPLOADS_DIR || "./data/uploads";
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_MAX = 5;

const _checkRateLimit = (username: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(username);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(username, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX) {
    return false;
  }

  userLimit.count++;
  return true;
};

const _getDownloadPath = async (
  username: string,
  customPath?: string,
  isAdmin?: boolean
): Promise<string> => {
  const preferences = await getUserPreferences(username);
  const preferredPath = preferences.torrentPreferences?.preferredDownloadPath;

  if (customPath) {
    if (customPath.length > 4096) {
      throw new Error("Path too long");
    }

    const normalizedBase = path.normalize(path.resolve(UPLOADS_DIR));
    const fullPath = path.resolve(UPLOADS_DIR, customPath);
    const normalizedPath = path.normalize(fullPath);

    const relativePath = path.relative(normalizedBase, normalizedPath);
    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      throw new Error("Invalid download path");
    }

    try {
      const lstats = await fs.lstat(normalizedPath);
      if (lstats.isSymbolicLink()) {
        throw new Error("Symlinks are not allowed");
      }
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }

    return normalizedPath;
  }

  if (preferredPath) {
    const normalizedBase = path.normalize(path.resolve(UPLOADS_DIR));
    const fullPath = path.resolve(UPLOADS_DIR, preferredPath);
    const relativePath = path.relative(normalizedBase, fullPath);

    if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
      if (isAdmin) {
        return UPLOADS_DIR;
      }
      return path.join(UPLOADS_DIR, username);
    }

    return fullPath;
  }

  if (isAdmin) {
    return UPLOADS_DIR;
  }

  return path.join(UPLOADS_DIR, username);
};

export const addTorrent = async (
  magnetURIOrBuffer: string | Buffer | Uint8Array,
  customDownloadPath?: string,
  folderPath?: string
): Promise<ServerActionResponse<{ infoHash: string }>> => {
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

    if (!_checkRateLimit(user.username)) {
      return {
        success: false,
        error: "Rate limit exceeded. Maximum 5 torrents per minute.",
      };
    }

    const preferences = await getUserPreferences(user.username);
    const torrentPrefs = preferences.torrentPreferences!;

    if (typeof magnetURIOrBuffer === "string") {
      if (magnetURIOrBuffer.length > 10240) {
        return { success: false, error: "Magnet URI too long" };
      }
      if (!magnetURIOrBuffer.startsWith("magnet:")) {
        return { success: false, error: "Invalid magnet URI format" };
      }
    } else {
      const bufferSize = magnetURIOrBuffer.length;
      if (bufferSize > torrentPrefs.maxTorrentFileSize) {
        return {
          success: false,
          error: `Torrent file too large (max ${Math.round(
            torrentPrefs.maxTorrentFileSize / 1024 / 1024
          )}MB)`,
        };
      }
      if (bufferSize === 0) {
        return { success: false, error: "Empty torrent file" };
      }
    }

    const manager = getTorrentManager();
    const activeTorrents = manager.getAllTorrents();

    if (activeTorrents.length >= torrentPrefs.maxActiveTorrents) {
      return {
        success: false,
        error: `Maximum active torrents (${torrentPrefs.maxActiveTorrents}) reached. Pause or remove a torrent first.`,
      };
    }

    let parsedTorrent: any;
    try {
      if (typeof magnetURIOrBuffer === "string") {
        parsedTorrent = await parseTorrent(magnetURIOrBuffer);
      } else {
        const buffer = Buffer.isBuffer(magnetURIOrBuffer)
          ? magnetURIOrBuffer
          : Buffer.from(magnetURIOrBuffer);
        parsedTorrent = await parseTorrent(buffer);
      }
    } catch (error) {
      console.error("Parse torrent error:", error);
      return {
        success: false,
        error: "Invalid torrent format",
      };
    }

    if (!parsedTorrent.infoHash) {
      return {
        success: false,
        error: "Unable to extract info hash from torrent",
      };
    }

    const existingSessions = await loadTorrentSessions(user.username);
    const existingTorrent = existingSessions.find(
      (s) => s.metadata.infoHash === parsedTorrent.infoHash
    );
    if (existingTorrent) {
      return {
        success: false,
        error: `Torrent "${existingTorrent.metadata.name}" already exists. Check status at /torrents`,
      };
    }

    const downloadPath = await _getDownloadPath(
      user.username,
      customDownloadPath || folderPath,
      user.isAdmin
    );

    await fs.mkdir(downloadPath, { recursive: true });

    let magnetURI: string;
    if (typeof magnetURIOrBuffer === "string") {
      magnetURI = magnetURIOrBuffer;
    } else {
      magnetURI = `magnet:?xt=urn:btih:${parsedTorrent.infoHash}`;
      if (parsedTorrent.name) {
        magnetURI += `&dn=${encodeURIComponent(parsedTorrent.name)}`;
      }
      if (parsedTorrent.announce && parsedTorrent.announce.length > 0) {
        parsedTorrent.announce.forEach((url: string) => {
          magnetURI += `&tr=${encodeURIComponent(url)}`;
        });
      }
    }

    const metadata: TorrentMetadata = {
      infoHash: parsedTorrent.infoHash,
      name: parsedTorrent.name || "Unknown",
      magnetURI,
      size: parsedTorrent.length || 0,
      files:
        parsedTorrent.files?.map((f: any) => ({
          path: f.path,
          length: f.length,
        })) || [],
      createdAt: Date.now(),
      createdBy: user.username,
      downloadPath,
      folderPath,
    };

    await saveTorrentSession(user.username, metadata);

    if (torrentPrefs.autoStartTorrents) {
      try {
        const session: TorrentSession = {
          metadata,
          state: {
            infoHash: metadata.infoHash,
            status: TorrentStatus.INITIALIZING,
            downloadSpeed: 0,
            uploadSpeed: 0,
            downloaded: 0,
            uploaded: 0,
            progress: 0,
            ratio: 0,
            numPeers: 0,
            timeRemaining: 0,
            addedAt: Date.now(),
          },
          username: user.username,
        };
        await manager.addTorrent(
          session,
          torrentPrefs.seedRatio,
          async () => {}
        );
      } catch (error) {
        console.error("Failed to start torrent manager:", error);
      }
    }

    await auditLog("torrent:add", {
      resource: metadata.name,
      details: {
        infoHash: metadata.infoHash,
        size: metadata.size,
        downloadPath,
      },
    });

    return {
      success: true,
      data: { infoHash: parsedTorrent.infoHash },
    };
  } catch (error: any) {
    console.error("Add torrent error:", error);
    const errorMsg =
      error?.message?.replace(/\/[^\s]+/g, "[path]") || "Failed to add torrent";
    return {
      success: false,
      error: errorMsg,
    };
  }
};

export const getTorrents = async (
  page: number = 1,
  limit: number = 50
): Promise<
  ServerActionResponse<{ torrents: TorrentSession[]; total: number }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const storedSessions = await loadTorrentSessions(user.username);
    const createdTorrents = await loadCreatedTorrents(user.username);
    const createdInfoHashes = new Set(createdTorrents.map((ct) => ct.infoHash));
    const manager = getTorrentManager();
    const preferences = await getUserPreferences(user.username);
    const seedRatio = preferences.torrentPreferences?.seedRatio || 1.0;

    const sessions: TorrentSession[] = storedSessions.map((stored) => {
      const { metadata, addedAt } = stored;

      const torrent = manager.getTorrent(metadata.infoHash);
      let state: TorrentState;

      if (torrent) {
        const downloaded = torrent.downloaded || 0;
        const uploaded = torrent.uploaded || 0;
        const progress = torrent.progress || 0;
        const ratio = downloaded > 0 ? uploaded / downloaded : 0;
        const numPeers = torrent.numPeers || 0;
        const downloadSpeed = torrent.downloadSpeed || 0;
        const uploadSpeed = torrent.uploadSpeed || 0;
        const isPaused = torrent.paused || false;

        let status = TorrentStatus.DOWNLOADING;
        if (isPaused) {
          status = TorrentStatus.PAUSED;
        } else if (progress >= 1) {
          if (ratio >= seedRatio && seedRatio > 0) {
            status = TorrentStatus.COMPLETED;
          } else {
            status = TorrentStatus.SEEDING;
          }
        }

        const timeRemaining =
          downloadSpeed > 0 ? (torrent.length - downloaded) / downloadSpeed : 0;

        state = {
          infoHash: metadata.infoHash,
          status,
          downloadSpeed,
          uploadSpeed,
          downloaded,
          uploaded,
          progress,
          ratio,
          numPeers,
          timeRemaining,
          addedAt,
        };
      } else {
        state = {
          infoHash: metadata.infoHash,
          status: TorrentStatus.STOPPED,
          downloadSpeed: 0,
          uploadSpeed: 0,
          downloaded: 0,
          uploaded: 0,
          progress: 0,
          ratio: 0,
          numPeers: 0,
          timeRemaining: 0,
          addedAt,
        };
      }

      return {
        metadata,
        state,
        username: user.username,
        isFromCreatedTorrent: createdInfoHashes.has(metadata.infoHash),
      };
    });

    const createdSessions: TorrentSession[] = createdTorrents.map((ct) => ({
      metadata: {
        infoHash: ct.infoHash,
        name: ct.name,
        magnetURI: ct.magnetURI,
        torrentFilePath: ct.torrentFilePath,
        size: ct.size,
        files: [],
        createdAt: ct.createdAt,
        createdBy: ct.createdBy,
        downloadPath: ct.sourcePath,
      },
      state: {
        infoHash: ct.infoHash,
        status: TorrentStatus.CREATED,
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloaded: 0,
        uploaded: 0,
        progress: 1,
        ratio: 0,
        numPeers: 0,
        timeRemaining: 0,
        addedAt: ct.createdAt,
      },
      username: user.username,
    }));

    const allTorrents = [...sessions, ...createdSessions].sort(
      (a, b) => b.state.addedAt - a.state.addedAt
    );

    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = allTorrents.slice(start, end);

    return {
      success: true,
      data: {
        torrents: paginated,
        total: allTorrents.length,
      },
    };
  } catch (error: any) {
    console.error("Get torrents error:", error);
    return {
      success: false,
      error: "Failed to load torrents",
    };
  }
};

export const pauseTorrent = async (
  infoHash: string
): Promise<ServerActionResponse<void>> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessions = await loadTorrentSessions(user.username);
    const stored = sessions.find((s) => s.metadata.infoHash === infoHash);
    const metadata = stored?.metadata;

    if (!metadata) {
      return { success: false, error: "Torrent not found" };
    }

    const manager = getTorrentManager();
    const torrent = manager.getTorrent(infoHash);

    if (!torrent) {
      return { success: false, error: "Torrent is not active" };
    }

    await manager.pauseTorrent(infoHash);

    await auditLog("torrent:pause", {
      resource: stored.metadata.name,
      details: {
        infoHash,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Pause torrent error:", error);
    return {
      success: false,
      error: "Failed to pause torrent",
    };
  }
};

export const stopTorrent = async (
  infoHash: string
): Promise<ServerActionResponse<void>> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessions = await loadTorrentSessions(user.username);
    const stored = sessions.find((s) => s.metadata.infoHash === infoHash);

    if (!stored) {
      return { success: false, error: "Torrent not found" };
    }

    const manager = getTorrentManager();
    await manager.stopTorrent(infoHash);

    await auditLog("torrent:stop", {
      resource: stored.metadata.name,
      details: {
        infoHash,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Stop torrent error:", error);
    return {
      success: false,
      error: "Failed to stop torrent",
    };
  }
};

export const resumeTorrent = async (
  infoHash: string
): Promise<ServerActionResponse<void>> => {
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

    const sessions = await loadTorrentSessions(user.username);
    const stored = sessions.find((s) => s.metadata.infoHash === infoHash);

    if (!stored) {
      return { success: false, error: "Torrent not found" };
    }

    const preferences = await getUserPreferences(user.username);
    const seedRatio = preferences.torrentPreferences?.seedRatio || 1.0;

    const manager = getTorrentManager();
    const existingTorrent = manager.getTorrent(infoHash);

    if (existingTorrent) {
      await manager.resumeTorrent(infoHash);
    } else {
      const session: TorrentSession = {
        metadata: stored.metadata,
        state: {
          infoHash: stored.metadata.infoHash,
          status: TorrentStatus.INITIALIZING,
          downloadSpeed: 0,
          uploadSpeed: 0,
          downloaded: 0,
          uploaded: 0,
          progress: 0,
          ratio: 0,
          numPeers: 0,
          timeRemaining: 0,
          addedAt: stored.addedAt,
        },
        username: user.username,
      };
      await manager.addTorrent(session, seedRatio, async () => {});
    }

    await auditLog("torrent:resume", {
      resource: stored.metadata.name,
      details: {
        infoHash,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Resume torrent error:", error);
    return {
      success: false,
      error: "Failed to resume torrent",
    };
  }
};

export const removeTorrent = async (
  infoHash: string,
  deleteFiles: boolean = false
): Promise<ServerActionResponse<void>> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessions = await loadTorrentSessions(user.username);
    const stored = sessions.find((s) => s.metadata.infoHash === infoHash);

    if (stored) {
      const manager = getTorrentManager();
      await manager.removeTorrent(infoHash);

      if (deleteFiles) {
        try {
          const downloadPath = stored.metadata.downloadPath;
          const torrentPath = path.join(downloadPath, stored.metadata.name);
          await fs.rm(torrentPath, { recursive: true, force: true });
        } catch (error) {
          console.error("Error deleting torrent files:", error);
        }
      }

      await deleteTorrentSession(user.username, infoHash);

      await auditLog("torrent:remove", {
        resource: stored.metadata.name,
        details: {
          infoHash,
          deletedFiles: deleteFiles,
        },
      });
    } else {
      const createdTorrents = await loadCreatedTorrents(user.username);
      const created = createdTorrents.find((ct) => ct.infoHash === infoHash);

      if (created) {
        await deleteCreatedTorrent(user.username, infoHash);

        await auditLog("torrent:remove", {
          resource: created.name,
          details: {
            infoHash,
            type: "created",
          },
        });
      } else {
        return { success: false, error: "Torrent not found" };
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("Remove torrent error:", error);
    return {
      success: false,
      error: "Failed to remove torrent",
    };
  }
};

export const startSeedingCreatedTorrent = async (
  infoHash: string
): Promise<ServerActionResponse<void>> => {
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

    const createdTorrents = await loadCreatedTorrents(user.username);
    const created = createdTorrents.find((ct) => ct.infoHash === infoHash);

    if (!created) {
      return { success: false, error: "Created torrent not found" };
    }

    const sessions = await loadTorrentSessions(user.username);
    const existingStored = sessions.find(
      (s) => s.metadata.infoHash === infoHash
    );

    const seedingManager = getTorrentManager();
    const activeTorrent = seedingManager.getTorrent(infoHash);

    if (activeTorrent) {
      return {
        success: false,
        error: "Torrent is already being seeded or downloaded",
      };
    }

    if (existingStored) {
      try {
        await seedingManager.removeTorrent(infoHash);
      } catch (error) {}
      await deleteTorrentSession(user.username, infoHash);
    }

    const sourcePath = path.join(UPLOADS_DIR, created.sourcePath);
    const stats = await fs.stat(sourcePath).catch(() => null);
    if (!stats) {
      return {
        success: false,
        error: "Source file/folder no longer exists",
      };
    }

    let downloadPath: string;
    if (stats.isDirectory()) {
      downloadPath = sourcePath;
    } else {
      downloadPath = path.dirname(sourcePath);
    }

    const metadata: TorrentMetadata = {
      infoHash: created.infoHash,
      name: created.name,
      magnetURI: created.magnetURI,
      torrentFilePath: created.torrentFilePath,
      size: created.size,
      files: [],
      createdAt: created.createdAt,
      createdBy: created.createdBy,
      downloadPath,
      folderPath: stats.isDirectory() ? created.sourcePath : undefined,
    };

    const state: TorrentState = {
      infoHash: created.infoHash,
      status: TorrentStatus.INITIALIZING,
      downloadSpeed: 0,
      uploadSpeed: 0,
      downloaded: 0,
      uploaded: 0,
      progress: 1,
      ratio: 0,
      numPeers: 0,
      timeRemaining: 0,
      addedAt: Date.now(),
    };

    await saveTorrentSession(user.username, metadata);

    const preferences = await getUserPreferences(user.username);
    const seedRatio = preferences.torrentPreferences?.seedRatio || 1.0;

    const session: TorrentSession = {
      metadata,
      state: {
        infoHash: metadata.infoHash,
        status: TorrentStatus.INITIALIZING,
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloaded: 0,
        uploaded: 0,
        progress: 1,
        ratio: 0,
        numPeers: 0,
        timeRemaining: 0,
        addedAt: Date.now(),
      },
      username: user.username,
    };

    await seedingManager.addTorrent(session, seedRatio, async () => {});

    await auditLog("torrent:start-seeding", {
      resource: created.name,
      details: {
        infoHash,
        sourcePath: created.sourcePath,
      },
    });

    return { success: true };
  } catch (error: any) {
    console.error("Start seeding error:", error);
    return {
      success: false,
      error: "Failed to start seeding",
    };
  }
};

export const getFileTorrents = async (): Promise<
  ServerActionResponse<Record<string, boolean>>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const createdTorrents = await loadCreatedTorrents(user.username);
    const torrentMap: Record<string, boolean> = {};

    createdTorrents.forEach((torrent) => {
      torrentMap[torrent.sourcePath] = true;
    });

    return { success: true, data: torrentMap };
  } catch (error) {
    console.error("Get file torrents error:", error);
    return { success: false, error: "Failed to get torrent status" };
  }
};
