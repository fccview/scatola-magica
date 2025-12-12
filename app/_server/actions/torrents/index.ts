"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { validateEncryptionForTorrents } from "@/app/_server/actions/torrents/validation";
import { getTorrentManager } from "@/app/_server/lib/bittorrent-client";
import {
  saveTorrentSession,
  loadTorrentSessions,
  deleteTorrentSession,
} from "@/app/_server/lib/torrent-state";
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
const TORRENTS_DIR = process.env.TORRENTS_DIR || "./data/torrents";
const MAX_ACTIVE_TORRENTS = parseInt(
  process.env.MAX_ACTIVE_TORRENTS || "5",
  10
);

// Rate limiting map: username -> { count: number, resetTime: number }
const rateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5;

const _checkRateLimit = (username: string): boolean => {
  const now = Date.now();
  const userLimit = rateLimitMap.get(username);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(username, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
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
  customPath?: string
): Promise<string> => {
  const preferences = await getUserPreferences(username);
  const preferredPath = preferences.torrentPreferences?.preferredDownloadPath;

  if (customPath) {
    // Sanitize custom path to prevent path traversal
    const normalized = path.normalize(customPath);
    if (normalized.includes("..")) {
      throw new Error("Invalid download path");
    }
    return path.resolve(normalized);
  }

  if (preferredPath) {
    return path.resolve(preferredPath);
  }

  // Default to user's uploads directory
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

    // Validate encryption
    const encryptionValidation = await validateEncryptionForTorrents();
    if (!encryptionValidation.success) {
      return {
        success: false,
        error: encryptionValidation.error || "Encryption validation failed",
      };
    }

    // Check rate limit
    if (!_checkRateLimit(user.username)) {
      return {
        success: false,
        error: "Rate limit exceeded. Maximum 5 torrents per minute.",
      };
    }

    // Get user preferences
    const preferences = await getUserPreferences(user.username);
    const torrentPrefs = preferences.torrentPreferences || {
      seedRatio: 1.0,
      autoStartTorrents: true,
      maxActiveTorrents: 5,
    };

    // Check max active torrents
    const existingSessions = await loadTorrentSessions(user.username);
    const activeTorrents = existingSessions.filter(
      (s) =>
        s.state.status === TorrentStatus.DOWNLOADING ||
        s.state.status === TorrentStatus.SEEDING ||
        s.state.status === TorrentStatus.INITIALIZING
    );

    if (activeTorrents.length >= torrentPrefs.maxActiveTorrents) {
      return {
        success: false,
        error: `Maximum active torrents (${torrentPrefs.maxActiveTorrents}) reached. Pause or remove a torrent first.`,
      };
    }

    // Parse torrent
    let parsedTorrent: any;
    try {
      if (typeof magnetURIOrBuffer === "string") {
        parsedTorrent = await parseTorrent(magnetURIOrBuffer);
      } else {
        // Convert Uint8Array to Buffer if needed
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

    // Check if torrent already exists
    const existingTorrent = existingSessions.find(
      (s) => s.metadata.infoHash === parsedTorrent.infoHash
    );
    if (existingTorrent) {
      return {
        success: false,
        error: `Torrent "${existingTorrent.metadata.name}" already exists. Check status at /torrents`,
      };
    }

    // Determine download path
    const downloadPath = await _getDownloadPath(
      user.username,
      customDownloadPath
    );

    // Ensure download directory exists
    await fs.mkdir(downloadPath, { recursive: true });

    // Construct magnet URI if not provided
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

    // Create torrent metadata
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

    // Create initial state
    const state: TorrentState = {
      infoHash: parsedTorrent.infoHash,
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
    };

    // Save session
    const session: TorrentSession = {
      metadata,
      state,
      username: user.username,
    };

    await saveTorrentSession(user.username, session);

    // Start torrent if auto-start enabled
    if (torrentPrefs.autoStartTorrents) {
      try {
        const manager = getTorrentManager();
        await manager.addTorrent(
          session,
          torrentPrefs.seedRatio,
          async (updatedState: TorrentState) => {
            // Update callback - save state changes
            const updatedSession = { ...session, state: updatedState };
            await saveTorrentSession(user.username, updatedSession);

            // Check if completed and reached seed ratio
            if (
              updatedState.status === TorrentStatus.COMPLETED &&
              updatedState.ratio >= torrentPrefs.seedRatio
            ) {
              await auditLog("torrent:seed-complete", {
                resource: metadata.name,
                details: {
                  infoHash: metadata.infoHash,
                  finalRatio: updatedState.ratio,
                  targetRatio: torrentPrefs.seedRatio,
                },
              });
            }
          }
        );
      } catch (error) {
        console.error("Failed to start torrent manager:", error);
        // Update state to show error
        session.state.status = TorrentStatus.ERROR;
        await saveTorrentSession(user.username, session);
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
  } catch (error) {
    console.error("Add torrent error:", error);
    return {
      success: false,
      error: "Failed to add torrent",
    };
  }
};

export const getTorrents = async (
  page: number = 1,
  limit: number = 50
): Promise<ServerActionResponse<{ torrents: TorrentSession[]; total: number }>> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessions = await loadTorrentSessions(user.username);

    // Sort by addedAt descending
    const sorted = sessions.sort((a, b) => b.state.addedAt - a.state.addedAt);

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginated = sorted.slice(start, end);

    return {
      success: true,
      data: {
        torrents: paginated,
        total: sessions.length,
      },
    };
  } catch (error) {
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
    const session = sessions.find((s) => s.metadata.infoHash === infoHash);

    if (!session) {
      return { success: false, error: "Torrent not found" };
    }

    if (
      session.state.status !== TorrentStatus.DOWNLOADING &&
      session.state.status !== TorrentStatus.SEEDING
    ) {
      return { success: false, error: "Torrent is not active" };
    }

    // Pause in manager
    const manager = getTorrentManager();
    await manager.pauseTorrent(infoHash);

    // Update state
    session.state.status = TorrentStatus.PAUSED;
    session.state.pausedAt = Date.now();
    await saveTorrentSession(user.username, session);

    await auditLog("torrent:pause", {
      resource: session.metadata.name,
      details: {
        infoHash,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Pause torrent error:", error);
    return {
      success: false,
      error: "Failed to pause torrent",
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

    // Validate encryption
    const encryptionValidation = await validateEncryptionForTorrents();
    if (!encryptionValidation.success) {
      return {
        success: false,
        error: encryptionValidation.error || "Encryption validation failed",
      };
    }

    const sessions = await loadTorrentSessions(user.username);
    const session = sessions.find((s) => s.metadata.infoHash === infoHash);

    if (!session) {
      return { success: false, error: "Torrent not found" };
    }

    if (
      session.state.status !== TorrentStatus.PAUSED &&
      session.state.status !== TorrentStatus.STOPPED
    ) {
      return { success: false, error: "Torrent is not paused" };
    }

    // Get preferences for seed ratio
    const preferences = await getUserPreferences(user.username);
    const seedRatio = preferences.torrentPreferences?.seedRatio || 1.0;

    // Resume in manager
    const manager = getTorrentManager();
    await manager.addTorrent(session, seedRatio, async (updatedState) => {
      const updatedSession = { ...session, state: updatedState };
      await saveTorrentSession(user.username, updatedSession);
    });

    // Update state
    session.state.status = TorrentStatus.DOWNLOADING;
    session.state.pausedAt = undefined;
    await saveTorrentSession(user.username, session);

    await auditLog("torrent:resume", {
      resource: session.metadata.name,
      details: {
        infoHash,
      },
    });

    return { success: true };
  } catch (error) {
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
    const session = sessions.find((s) => s.metadata.infoHash === infoHash);

    if (!session) {
      return { success: false, error: "Torrent not found" };
    }

    // Remove from manager
    const manager = getTorrentManager();
    await manager.removeTorrent(infoHash);

    // Delete files if requested
    if (deleteFiles) {
      try {
        const downloadPath = session.metadata.downloadPath;
        const torrentPath = path.join(downloadPath, session.metadata.name);
        await fs.rm(torrentPath, { recursive: true, force: true });
      } catch (error) {
        console.error("Error deleting torrent files:", error);
        // Continue with removal even if file deletion fails
      }
    }

    // Delete session
    await deleteTorrentSession(user.username, infoHash);

    await auditLog("torrent:remove", {
      resource: session.metadata.name,
      details: {
        infoHash,
        deletedFiles: deleteFiles,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Remove torrent error:", error);
    return {
      success: false,
      error: "Failed to remove torrent",
    };
  }
};
