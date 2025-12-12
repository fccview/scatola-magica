"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { validateEncryptionForTorrents } from "@/app/_server/actions/torrents/validation";
import { ServerActionResponse } from "@/app/_types";
import parseTorrent from "parse-torrent";

export interface TorrentFileInfo {
  path: string;
  length: number;
  selected: boolean;
}

export interface TorrentMetadataInfo {
  infoHash: string;
  name: string;
  size: number;
  files: TorrentFileInfo[];
  announce?: string[];
}

export const fetchTorrentMetadata = async (
  magnetURIOrBuffer: string | Uint8Array
): Promise<ServerActionResponse<TorrentMetadataInfo>> => {
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

    // Parse torrent to get metadata
    let parsedTorrent: any;
    try {
      if (typeof magnetURIOrBuffer === "string") {
        parsedTorrent = await parseTorrent(magnetURIOrBuffer);
      } else {
        const buffer = Buffer.from(magnetURIOrBuffer);
        parsedTorrent = await parseTorrent(buffer);
      }
    } catch (error) {
      console.error("Parse torrent metadata error:", error);
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

    const files: TorrentFileInfo[] =
      parsedTorrent.files?.map((f: any) => ({
        path: f.path,
        length: f.length,
        selected: true, // All selected by default
      })) || [];

    return {
      success: true,
      data: {
        infoHash: parsedTorrent.infoHash,
        name: parsedTorrent.name || "Unknown",
        size: parsedTorrent.length || 0,
        files,
        announce: parsedTorrent.announce,
      },
    };
  } catch (error) {
    console.error("Fetch torrent metadata error:", error);
    return {
      success: false,
      error: "Failed to fetch torrent metadata",
    };
  }
};
