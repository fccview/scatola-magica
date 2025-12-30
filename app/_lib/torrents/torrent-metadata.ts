"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { validateEncryptionForTorrents } from "@/app/_server/actions/make-torrents";
import { getUserPreferences } from "@/app/_lib/preferences";
import { ServerActionResponse } from "@/app/_types";
import parseTorrent from "parse-torrent";
import { getTorrentClient } from "@/app/_lib/torrents/webtorrent-client";

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

    const encryptionValidation = await validateEncryptionForTorrents();
    if (!encryptionValidation.success) {
      return {
        success: false,
        error: encryptionValidation.error || "Encryption validation failed",
      };
    }

    let parsedTorrent: any;
    let magnetURI: string;

    if (typeof magnetURIOrBuffer === "string") {
      magnetURI = magnetURIOrBuffer;
      try {
        parsedTorrent = await parseTorrent(magnetURI);
      } catch (error) {
        console.error("Parse torrent metadata error:", error);
        return {
          success: false,
          error: "Invalid magnet URI format",
        };
      }
    } else {
      const buffer = Buffer.from(magnetURIOrBuffer);
      try {
        parsedTorrent = await parseTorrent(buffer);
        magnetURI = `magnet:?xt=urn:btih:${parsedTorrent.infoHash}`;
      } catch (error) {
        console.error("Parse torrent metadata error:", error);
        return {
          success: false,
          error: "Invalid torrent format",
        };
      }
    }

    if (!parsedTorrent.infoHash) {
      return {
        success: false,
        error: "Unable to extract info hash from torrent",
      };
    }

    if (parsedTorrent.name && parsedTorrent.length) {
      const files: TorrentFileInfo[] =
        parsedTorrent.files?.map((f: any) => ({
          path: Array.isArray(f.path)
            ? f.path.join("/")
            : f.path || f.name || "",
          length: f.length || 0,
          selected: true,
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
    }

    if (
      typeof magnetURIOrBuffer === "string" &&
      magnetURIOrBuffer.startsWith("magnet:")
    ) {
      const preferences = await getUserPreferences(user.username);
      const prefs = preferences.torrentPreferences!;

      return new Promise((resolve) => {
        const client = getTorrentClient(
          prefs.maxDownloadSpeed,
          prefs.maxUploadSpeed
        );
        let timeout: NodeJS.Timeout;
        let resolved = false;
        let torrent: any;

        const cleanup = () => {
          if (timeout) clearTimeout(timeout);
          if (torrent && !resolved) {
            try {
              client.remove(torrent);
            } catch (err) {
              // Torrent may already be removed
            }
          }
        };

        timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              success: false,
              error:
                "Timeout: Could not fetch metadata from peers. The torrent may have no active seeders.",
            });
          }
        }, 30000);

        torrent = client.add(magnetURI, {}, (torrentInstance: any) => {
          if (resolved) {
            try {
              client.remove(torrentInstance);
            } catch (err) {
              // Torrent may already be removed
            }
            return;
          }

          torrentInstance.pause();

          const files: TorrentFileInfo[] =
            torrentInstance.files?.map((f: any) => ({
              path: f.path || f.name || "",
              length: f.length || 0,
              selected: true,
            })) || [];

          resolved = true;
          cleanup();

          resolve({
            success: true,
            data: {
              infoHash: torrentInstance.infoHash,
              name: torrentInstance.name || "Unknown",
              size: torrentInstance.length || 0,
              files,
              announce: torrentInstance.announce,
            },
          });

          try {
            client.remove(torrentInstance);
          } catch (err) {
            // Torrent may already be removed
          }
        });

        torrent.on("error", (err: Error) => {
          if (!resolved) {
            resolved = true;
            cleanup();
            resolve({
              success: false,
              error: `Failed to fetch metadata: ${err.message}`,
            });
          }
        });
      });
    }

    const files: TorrentFileInfo[] =
      parsedTorrent.files?.map((f: any) => ({
        path: Array.isArray(f.path) ? f.path.join("/") : f.path || f.name || "",
        length: f.length || 0,
        selected: true,
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
  } catch (error: any) {
    console.error("Fetch torrent metadata error:", error);
    const errorMsg =
      error?.message?.replace(/\/[^\s]+/g, "[path]") ||
      "Failed to fetch torrent metadata";
    return {
      success: false,
      error: errorMsg,
    };
  }
};
