import { getTorrentClient } from "./webtorrent-client";
import { getUserPreferences } from "@/app/_lib/preferences";
import {
  TorrentSession,
  TorrentState,
  TorrentStatus,
} from "@/app/_types/torrent";
import { EventEmitter } from "events";
import fs from "fs/promises";
import { auditLog } from "@/app/_server/actions/logs";

interface TorrentInstance {
  infoHash: string;
  torrent: any;
  downloadPath: string;
  seedRatio: number;
  onUpdate: (state: TorrentState) => Promise<void>;
  updateInterval?: NodeJS.Timeout;
  metadata?: {
    name: string;
  };
  username?: string;
  hasLoggedCompletion?: boolean;
  hasLoggedSeedComplete?: boolean;
}

class TorrentManager extends EventEmitter {
  private static instance: TorrentManager | null = null;
  private torrents: Map<string, TorrentInstance> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): TorrentManager {
    if (!TorrentManager.instance) {
      TorrentManager.instance = new TorrentManager();
    }
    return TorrentManager.instance;
  }

  async addTorrent(
    session: TorrentSession,
    seedRatio: number,
    onUpdate: (state: TorrentState) => Promise<void>
  ): Promise<void> {
    const { metadata, state } = session;
    const infoHash = metadata.infoHash;

    if (this.torrents.has(infoHash)) {
      throw new Error("Torrent already exists");
    }

    const preferences = await getUserPreferences(session.username);
    const prefs = preferences.torrentPreferences!;

    const client = getTorrentClient(
      prefs.maxDownloadSpeed,
      prefs.maxUploadSpeed
    );
    const downloadPath = metadata.downloadPath;

    return new Promise(async (resolve, reject) => {
      let torrentInput: string | Buffer;
      let timeout: NodeJS.Timeout;
      let resolved = false;

      const cleanup = () => {
        if (timeout) clearTimeout(timeout);
        resolved = true;
      };

      timeout = setTimeout(() => {
        if (!resolved) {
          cleanup();
          reject(new Error("Timeout: Torrent failed to initialize within 30 seconds"));
        }
      }, 30000);

      try {
      if (metadata.torrentFilePath) {
        try {
          torrentInput = await fs.readFile(metadata.torrentFilePath);
        } catch {
          torrentInput =
            metadata.magnetURI || `magnet:?xt=urn:btih:${infoHash}`;
        }
      } else {
        torrentInput = metadata.magnetURI || `magnet:?xt=urn:btih:${infoHash}`;
      }

      const torrent = client.add(
        torrentInput,
        { path: downloadPath },
        (torrentInstance: any) => {
            if (resolved) return;

          const instance: TorrentInstance = {
            infoHash,
            torrent: torrentInstance,
            downloadPath,
            seedRatio,
            onUpdate,
            metadata: {
              name: metadata.name,
            },
            username: session.username,
            hasLoggedCompletion: false,
            hasLoggedSeedComplete: false,
          };

          torrentInstance.on("download", () => {
            this.updateTorrentState(instance);
          });

          torrentInstance.on("upload", () => {
            this.updateTorrentState(instance);
          });

          torrentInstance.on("done", () => {
            this.updateTorrentState(instance);
          });

          torrentInstance.on("error", (err: Error) => {
            console.error(`Torrent error for ${metadata.name}:`, err);
            this.updateTorrentState(instance, err.message);
          });

          this.torrents.set(infoHash, instance);

          const updateInterval = setInterval(() => {
            this.updateTorrentState(instance);
          }, 2000);

          instance.updateInterval = updateInterval;

          this.updateTorrentState(instance);
            cleanup();
          resolve();
        }
      );

      torrent.on("error", (err: Error) => {
          if (!resolved) {
            cleanup();
        console.error(`Failed to add torrent ${metadata.name}:`, err);
        reject(err);
          }
      });
      } catch (error) {
        cleanup();
        reject(error);
      }
    });
  }

  private async updateTorrentState(
    instance: TorrentInstance,
    error?: string
  ): Promise<void> {
    const { torrent, seedRatio, onUpdate, infoHash } = instance;
    const torrentInstance = torrent;

    if (!torrentInstance) return;

    const downloaded = torrentInstance.downloaded || 0;
    const uploaded = torrentInstance.uploaded || 0;
    const progress = torrentInstance.progress || 0;
    const ratio = downloaded > 0 ? uploaded / downloaded : 0;
    const numPeers = torrentInstance.numPeers || 0;
    const downloadSpeed = torrentInstance.downloadSpeed || 0;
    const uploadSpeed = torrentInstance.uploadSpeed || 0;
    const isPaused = torrentInstance.paused || false;

    let status = TorrentStatus.DOWNLOADING;
    if (error) {
      status = TorrentStatus.ERROR;

      if (instance.metadata && instance.username) {
        await auditLog("torrent:error", {
          resource: instance.metadata.name,
          details: {
            infoHash,
            error,
          },
          success: false,
          errorMessage: error,
        });
      }
    } else if (isPaused) {
      if (progress >= 1) {
        status = TorrentStatus.PAUSED;
      } else {
        status = TorrentStatus.PAUSED;
      }
    } else if (progress >= 1) {
      if (!instance.hasLoggedCompletion && instance.metadata && instance.username) {
        await auditLog("torrent:complete", {
          resource: instance.metadata.name,
          details: {
            infoHash,
            downloaded,
            uploaded,
            ratio,
          },
        });
        instance.hasLoggedCompletion = true;
      }

      if (ratio >= seedRatio && seedRatio > 0) {
        status = TorrentStatus.COMPLETED;

        if (!instance.hasLoggedSeedComplete && instance.metadata && instance.username) {
          await auditLog("torrent:seed-complete", {
            resource: instance.metadata.name,
            details: {
              infoHash,
              finalRatio: ratio,
              targetRatio: seedRatio,
              uploaded,
              downloaded,
            },
          });
          instance.hasLoggedSeedComplete = true;
        }
      } else {
        status = TorrentStatus.SEEDING;
      }
    }

    const timeRemaining =
      downloadSpeed > 0
        ? (torrentInstance.length - downloaded) / downloadSpeed
        : 0;

    const updatedState: TorrentState = {
      infoHash,
      status,
      downloadSpeed,
      uploadSpeed,
      downloaded,
      uploaded,
      progress,
      ratio,
      numPeers,
      timeRemaining,
      addedAt: Date.now(),
      error,
    };

    await onUpdate(updatedState);

    if (status === TorrentStatus.COMPLETED && instance.updateInterval) {
      clearInterval(instance.updateInterval);
      instance.updateInterval = undefined;
    }
  }

  getTorrent(infoHash: string): any {
    const instance = this.torrents.get(infoHash);
    return instance?.torrent;
  }

  async pauseTorrent(infoHash: string): Promise<void> {
    const instance = this.torrents.get(infoHash);
    if (instance?.torrent) {
      instance.torrent.pause();
      this.updateTorrentState(instance).catch((err) => {
        console.error(`Error updating torrent state for ${infoHash}:`, err);
      });
    }
  }

  async resumeTorrent(infoHash: string): Promise<void> {
    const instance = this.torrents.get(infoHash);
    if (instance?.torrent) {
      instance.torrent.resume();
      this.updateTorrentState(instance).catch((err) => {
        console.error(`Error updating torrent state for ${infoHash}:`, err);
      });
    }
  }

  async removeTorrent(infoHash: string): Promise<void> {
    const instance = this.torrents.get(infoHash);
    if (instance) {
      if (instance.updateInterval) {
        clearInterval(instance.updateInterval);
      }
      if (instance.torrent) {
        const client = getTorrentClient();
        client.remove(instance.torrent);
      }
      this.torrents.delete(infoHash);
    }
  }

  async stopTorrent(infoHash: string): Promise<void> {
    const instance = this.torrents.get(infoHash);
    if (instance) {
      if (instance.updateInterval) {
        clearInterval(instance.updateInterval);
      }
      if (instance.torrent) {
        instance.torrent.pause();
        const client = getTorrentClient();
        client.remove(instance.torrent);
      }
      this.torrents.delete(infoHash);
    }
  }

  getAllTorrents(): TorrentInstance[] {
    return Array.from(this.torrents.values());
  }
}

export const getTorrentManager = () => TorrentManager.getInstance();
