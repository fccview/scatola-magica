"use client";

import { useState } from "react";
import { useTorrents } from "@/app/_hooks/useTorrents";
import {
  removeTorrent,
  startSeedingCreatedTorrent,
  stopTorrent,
} from "@/app/_server/actions/manage-torrents";
import { TorrentStatus } from "@/app/_types/torrent";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

export default function MyTorrentsList() {
  const { torrents, isLoading, error, refresh } = useTorrents();
  const [actioningTorrent, setActioningTorrent] = useState<string | null>(null);

  const createdTorrents = torrents.filter(
    (t) => t.state.status === TorrentStatus.CREATED
  );

  const handleStartSeeding = async (infoHash: string) => {
    setActioningTorrent(infoHash);
    try {
      const result = await startSeedingCreatedTorrent(infoHash);
      if (!result.success) {
        alert(result.error || "Failed to start seeding");
      }
      await refresh();
      setTimeout(() => refresh(), 500);
    } catch (error) {
      console.error("Error starting seeding:", error);
      alert("Failed to start seeding");
    } finally {
      setActioningTorrent(null);
    }
  };

  const handleStopSeeding = async (infoHash: string) => {
    setActioningTorrent(infoHash);
    try {
      const result = await stopTorrent(infoHash);
      if (!result.success) {
        alert(result.error || "Failed to stop seeding");
      }
      await refresh();
    } catch (error) {
      console.error("Error stopping seeding:", error);
      alert("Failed to stop seeding");
    } finally {
      setActioningTorrent(null);
    }
  };

  const handleDelete = async (infoHash: string, name: string) => {
    if (
      !confirm(
        `Delete "${name}"? This will remove the torrent record and .torrent file.`
      )
    ) {
      return;
    }

    setActioningTorrent(infoHash);
    try {
      const result = await removeTorrent(infoHash, false);
      if (!result.success) {
        alert(result.error || "Failed to delete torrent");
      }
      await refresh();
    } catch (error) {
      console.error("Error deleting torrent:", error);
      alert("Failed to delete torrent");
    } finally {
      setActioningTorrent(null);
    }
  };

  const copyMagnetLink = (magnetURI: string | undefined) => {
    if (!magnetURI) return;
    navigator.clipboard.writeText(magnetURI);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Progress variant="circular" size="lg" value={50} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-error-container rounded-lg">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-on-error-container">
            error
          </span>
          <div className="text-on-error-container">{error}</div>
        </div>
      </div>
    );
  }

  if (createdTorrents.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <span className="material-symbols-outlined text-on-surface/40 text-5xl sm:text-6xl mb-4 block">
          p2p
        </span>
        <h2 className="text-lg sm:text-xl font-medium text-on-surface mb-2">
          No torrents created yet
        </h2>
        <p className="text-sm sm:text-base text-on-surface/60">
          Create a torrent from a file or folder in the file browser
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {createdTorrents.map((torrent) => {
        const { metadata, state } = torrent;
        const isActioning = actioningTorrent === metadata.infoHash;
        const seedingTorrent = torrents.find(
          (t) =>
            t.metadata.infoHash === metadata.infoHash &&
            t.state.status !== TorrentStatus.CREATED &&
            t.state.status !== TorrentStatus.STOPPED &&
            t.state.status !== TorrentStatus.ERROR &&
            t.state.status !== TorrentStatus.COMPLETED
        );
        const isSeeding = !!seedingTorrent;

        return (
          <div
            key={metadata.infoHash}
            className="flex overflow-hidden bg-surface-container rounded-lg group"
          >
            <div className="flex items-stretch max-w-[0px] overflow-hidden group-hover:max-w-[80px] group-hover:w-auto transition-all duration-300">
              <button
                onClick={() => handleDelete(metadata.infoHash, metadata.name)}
                disabled={isActioning}
                aria-label="Delete torrent"
                className="flex items-center justify-center px-2 sm:px-2 bg-error text-on-error hover:bg-error/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full h-full"
              >
                <span className="material-symbols-outlined text-sm">
                  delete
                </span>
              </button>
            </div>

            <div className="flex-1 p-4 sm:p-6 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-medium text-on-surface mb-1 truncate">
                    {metadata.name}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-on-surface/60 mb-2">
                    <span className="material-symbols-outlined text-sm text-tertiary">
                      link
                    </span>
                    <span className="text-tertiary">Created</span>
                    {isSeeding && (
                      <>
                        <span>•</span>
                        <span className="text-primary">Seeding</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{formatBytes(metadata.size)}</span>
                  </div>
                  {metadata.magnetURI && (
                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-xs text-on-surface/40 flex-shrink-0">
                        Magnet:
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <code className="text-xs text-on-surface/60 bg-surface-container-highest px-2 py-1 rounded truncate flex-1 min-w-0">
                          {metadata.magnetURI}
                        </code>
                        <IconButton
                          icon="content_copy"
                          onClick={() => copyMagnetLink(metadata.magnetURI)}
                          ariaLabel="Copy magnet link"
                          size="xs"
                          className="text-on-surface/60 flex-shrink-0"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="filled"
                    size="sm"
                    onClick={() => handleStartSeeding(metadata.infoHash)}
                    disabled={isActioning || isSeeding}
                    className={`w-full sm:w-auto ${isSeeding ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                  >
                    Start Seeding
                  </Button>
                  <Button
                    variant="filled"
                    size="sm"
                    onClick={() => handleStopSeeding(metadata.infoHash)}
                    disabled={isActioning || !isSeeding}
                    className={`w-full sm:w-auto ${!isSeeding
                      ? "opacity-50 cursor-not-allowed"
                      : "bg-error text-on-error hover:bg-error/90"
                      }`}
                  >
                    Stop Seeding
                  </Button>
                </div>
              </div>

              {isSeeding && seedingTorrent && (
                <div className="space-y-3">
                  <div className="p-3 bg-primary-container rounded text-sm text-on-primary-container">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbols-outlined text-sm">
                        upload
                      </span>
                      <span className="font-medium">Currently Seeding</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
                      <div>
                        <div className="text-on-primary-container/70 mb-1">
                          Upload Speed
                        </div>
                        <div className="font-medium">
                          {formatBytes(seedingTorrent.state.uploadSpeed || 0)}/s
                        </div>
                      </div>
                      <div>
                        <div className="text-on-primary-container/70 mb-1">
                          Peers
                        </div>
                        <div className="font-medium">
                          {seedingTorrent.state.numPeers || 0}
                        </div>
                      </div>
                      <div>
                        <div className="text-on-primary-container/70 mb-1">
                          Uploaded
                        </div>
                        <div className="font-medium">
                          {formatBytes(seedingTorrent.state.uploaded || 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-on-primary-container/70 mb-1">
                          Ratio
                        </div>
                        <div className="font-medium">
                          {seedingTorrent.state.ratio.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
