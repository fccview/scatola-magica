"use client";

import { useState } from "react";
import { useTorrents } from "@/app/_hooks/useTorrents";
import {
  pauseTorrent,
  resumeTorrent,
  removeTorrent,
  stopTorrent,
} from "@/app/_server/actions/manage-torrents";
import { TorrentStatus } from "@/app/_types/torrent";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

const formatSpeed = (bytesPerSecond: number): string => {
  return `${formatBytes(bytesPerSecond)}/s`;
};

const formatTime = (seconds: number): string => {
  if (seconds === 0 || !isFinite(seconds)) return "Unknown";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
};

const getStatusColor = (status: TorrentStatus): string => {
  switch (status) {
    case TorrentStatus.DOWNLOADING:
      return "text-primary";
    case TorrentStatus.SEEDING:
      return "text-tertiary";
    case TorrentStatus.COMPLETED:
      return "text-on-surface/60";
    case TorrentStatus.PAUSED:
    case TorrentStatus.STOPPED:
      return "text-on-surface/40";
    case TorrentStatus.ERROR:
      return "text-error";
    default:
      return "text-on-surface/60";
  }
};

const getStatusIcon = (status: TorrentStatus): string => {
  switch (status) {
    case TorrentStatus.INITIALIZING:
      return "schedule";
    case TorrentStatus.DOWNLOADING:
      return "download";
    case TorrentStatus.SEEDING:
      return "upload";
    case TorrentStatus.COMPLETED:
      return "check_circle";
    case TorrentStatus.PAUSED:
    case TorrentStatus.STOPPED:
      return "pause_circle";
    case TorrentStatus.ERROR:
      return "error";
    default:
      return "help";
  }
};

export default function DownloadsList() {
  const { torrents, isLoading, error, refresh } = useTorrents();
  const [actioningTorrent, setActioningTorrent] = useState<string | null>(null);

  const downloadTorrents = torrents.filter(
    (t) => t.state.status !== TorrentStatus.CREATED && !t.isFromCreatedTorrent
  );

  const handlePause = async (infoHash: string) => {
    setActioningTorrent(infoHash);
    try {
      const result = await pauseTorrent(infoHash);
      if (!result.success) {
        alert(result.error || "Failed to pause torrent");
      }
      await refresh();
    } catch (error) {
      console.error("Error pausing torrent:", error);
      alert("Failed to pause torrent");
    } finally {
      setActioningTorrent(null);
    }
  };

  const handleResume = async (infoHash: string) => {
    setActioningTorrent(infoHash);
    try {
      const result = await resumeTorrent(infoHash);
      if (!result.success) {
        alert(result.error || "Failed to resume torrent");
      }
      await refresh();
    } catch (error) {
      console.error("Error resuming torrent:", error);
      alert("Failed to resume torrent");
    } finally {
      setActioningTorrent(null);
    }
  };

  const handleStop = async (infoHash: string) => {
    setActioningTorrent(infoHash);
    try {
      const result = await stopTorrent(infoHash);
      if (!result.success) {
        alert(result.error || "Failed to stop torrent");
      }
      await refresh();
    } catch (error) {
      console.error("Error stopping torrent:", error);
      alert("Failed to stop torrent");
    } finally {
      setActioningTorrent(null);
    }
  };

  const handleRemove = async (infoHash: string, name: string) => {
    if (!confirm(`Remove "${name}"? Files will not be deleted.`)) {
      return;
    }

    setActioningTorrent(infoHash);
    try {
      const result = await removeTorrent(infoHash, false);
      if (!result.success) {
        alert(result.error || "Failed to remove torrent");
      }
      await refresh();
    } catch (error) {
      console.error("Error removing torrent:", error);
      alert("Failed to remove torrent");
    } finally {
      setActioningTorrent(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-on-surface/60">Loading...</div>
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

  if (downloadTorrents.length === 0) {
    return (
      <div className="text-center py-8 sm:py-12 px-4">
        <span className="material-symbols-outlined text-on-surface/40 text-5xl sm:text-6xl mb-4 block">
          cloud_download
        </span>
        <h2 className="text-lg sm:text-xl font-medium text-on-surface mb-2">
          No downloads yet
        </h2>
        <p className="text-sm sm:text-base text-on-surface/60 mb-6">
          Add a torrent using the button below to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {downloadTorrents.map((torrent) => {
        const { metadata, state } = torrent;
        const isActioning = actioningTorrent === metadata.infoHash;
        const canPause =
          state.status === TorrentStatus.DOWNLOADING ||
          state.status === TorrentStatus.SEEDING;
        const canResume =
          state.status === TorrentStatus.PAUSED ||
          state.status === TorrentStatus.STOPPED;
        const canStop =
          state.status === TorrentStatus.DOWNLOADING ||
          state.status === TorrentStatus.SEEDING ||
          state.status === TorrentStatus.PAUSED;

        return (
          <div
            key={metadata.infoHash}
            className="flex overflow-hidden bg-surface-container rounded-lg group"
          >
            <div className="flex items-stretch max-w-[0px] overflow-hidden group-hover:max-w-[120px] group-hover:w-auto transition-all duration-300">
              <button
                onClick={() => handleRemove(metadata.infoHash, metadata.name)}
                disabled={isActioning}
                aria-label="Remove torrent"
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
                  <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-on-surface/60">
                    <span
                      className={`material-symbols-outlined text-sm ${getStatusColor(
                        state.status
                      )}`}
                    >
                      {getStatusIcon(state.status)}
                    </span>
                    <span className={getStatusColor(state.status)}>
                      {state.status}
                    </span>
                    <span>•</span>
                    <span>{formatBytes(metadata.size)}</span>
                    {state.numPeers > 0 && (
                      <>
                        <span>•</span>
                        <span>{state.numPeers} peers</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {canPause && (
                    <IconButton
                      icon="pause"
                      onClick={() => handlePause(metadata.infoHash)}
                      disabled={isActioning}
                      ariaLabel="Pause torrent"
                    />
                  )}
                  {canResume && (
                    <IconButton
                      icon="play_arrow"
                      onClick={() => handleResume(metadata.infoHash)}
                      disabled={isActioning}
                      ariaLabel="Resume torrent"
                    />
                  )}
                  {canStop && (
                    <IconButton
                      icon="stop"
                      onClick={() => handleStop(metadata.infoHash)}
                      disabled={isActioning}
                      ariaLabel="Stop torrent"
                    />
                  )}
                </div>
              </div>

              <div className="mb-3">
                <Progress
                  value={state.progress * 100}
                  variant="linear"
                  size="sm"
                  className={
                    state.status === TorrentStatus.SEEDING
                      ? "[&>div>div]:!bg-tertiary"
                      : ""
                  }
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-xs sm:text-sm">
                <div>
                  <div className="text-on-surface/60 mb-1">Progress</div>
                  <div className="text-on-surface font-medium">
                    {(state.progress * 100).toFixed(1)}%
                  </div>
                </div>

                <div>
                  <div className="text-on-surface/60 mb-1">Downloaded</div>
                  <div className="text-on-surface font-medium">
                    {formatBytes(state.downloaded)}
                  </div>
                </div>

                <div>
                  <div className="text-on-surface/60 mb-1">Uploaded</div>
                  <div className="text-on-surface font-medium">
                    {formatBytes(state.uploaded)}
                  </div>
                </div>

                <div>
                  <div className="text-on-surface/60 mb-1">Ratio</div>
                  <div className="text-on-surface font-medium">
                    {state.ratio.toFixed(2)}
                  </div>
                </div>

                {state.status === TorrentStatus.DOWNLOADING && (
                  <>
                    <div>
                      <div className="text-on-surface/60 mb-1">
                        <span className="hidden sm:inline">Download Speed</span>
                        <span className="sm:hidden">DL Speed</span>
                      </div>
                      <div className="text-on-surface font-medium">
                        {formatSpeed(state.downloadSpeed)}
                      </div>
                    </div>

                    <div>
                      <div className="text-on-surface/60 mb-1">
                        <span className="hidden sm:inline">Time Remaining</span>
                        <span className="sm:hidden">Time Left</span>
                      </div>
                      <div className="text-on-surface font-medium">
                        {formatTime(state.timeRemaining)}
                      </div>
                    </div>
                  </>
                )}

                {state.status === TorrentStatus.SEEDING && (
                  <div>
                    <div className="text-on-surface/60 mb-1">
                      <span className="hidden sm:inline">Upload Speed</span>
                      <span className="sm:hidden">UL Speed</span>
                    </div>
                    <div className="text-on-surface font-medium">
                      {formatSpeed(state.uploadSpeed)}
                    </div>
                  </div>
                )}
              </div>

              {state.error && (
                <div className="mt-4 p-3 bg-error-container rounded text-sm text-on-error-container">
                  {state.error}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
