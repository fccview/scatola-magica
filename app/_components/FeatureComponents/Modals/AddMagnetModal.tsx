"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import { addTorrent } from "@/app/_server/actions/torrents";
import { fetchTorrentMetadata, TorrentMetadataInfo } from "@/app/_server/actions/torrents/metadata";

interface AddMagnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderPath?: string;
}

export default function AddMagnetModal({
  isOpen,
  onClose,
  folderPath,
}: AddMagnetModalProps) {
  const router = useRouter();
  const [magnetURI, setMagnetURI] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [metadata, setMetadata] = useState<TorrentMetadataInfo | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());

  const handleFetchMetadata = async () => {
    if (!magnetURI.trim()) {
      setError("Magnet URI is required");
      return;
    }

    if (!magnetURI.startsWith("magnet:")) {
      setError("Invalid magnet URI format");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStatus("Connecting to DHT...");

    try {
      // Simulate progressive loading states
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoadingStatus("Finding peers...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoadingStatus("Fetching metadata...");

      const result = await fetchTorrentMetadata(magnetURI);

      if (result.success && result.data) {
        setLoadingStatus("Metadata received!");
        await new Promise((resolve) => setTimeout(resolve, 300));

        setMetadata(result.data);
        // Select all files by default
        const allFiles = new Set(result.data.files.map((_, i) => i));
        setSelectedFiles(allFiles);
        setLoadingStatus("");
      } else {
        setError(result.error || "Failed to fetch torrent metadata");
        setLoadingStatus("");
      }
    } catch (err) {
      console.error("Error fetching metadata:", err);
      setError("Failed to fetch torrent metadata");
      setLoadingStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddTorrent = async () => {
    if (!metadata) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const result = await addTorrent(magnetURI, undefined, folderPath);

      if (result.success) {
        setSuccess(true);
        setMagnetURI("");
        setMetadata(null);
        setSelectedFiles(new Set());
        setTimeout(() => {
          onClose();
          setSuccess(false);
        }, 1500);
      } else {
        setError(result.error || "Failed to add torrent");
      }
    } catch (err) {
      console.error("Error adding torrent:", err);
      setError("Failed to add torrent");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFileSelection = (index: number) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedFiles(newSelected);
  };

  const selectAll = () => {
    if (!metadata) return;
    setSelectedFiles(new Set(metadata.files.map((_, i) => i)));
  };

  const deselectAll = () => {
    setSelectedFiles(new Set());
  };

  const handleClose = () => {
    if (isLoading) return;
    setMagnetURI("");
    setError(null);
    setSuccess(false);
    setMetadata(null);
    setSelectedFiles(new Set());
    onClose();
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={metadata ? "Select Files to Download" : "Add Magnet Link"}
      actions={
        <>
          <Button onClick={handleClose} variant="text" disabled={isLoading}>
            Cancel
          </Button>
          {metadata ? (
            <Button
              onClick={handleAddTorrent}
              variant="filled"
              disabled={isLoading || selectedFiles.size === 0}
            >
              {isLoading ? "Adding..." : `Download (${selectedFiles.size} files)`}
            </Button>
          ) : (
            <Button
              onClick={handleFetchMetadata}
              variant="filled"
              disabled={isLoading || !magnetURI.trim()}
            >
              {isLoading ? "Fetching..." : "Next"}
            </Button>
          )}
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {success && (
          <div className="flex flex-col gap-2 text-sm text-on-success-container bg-success-container p-3 rounded">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              <span>Torrent added!</span>
            </div>
            <Button
              variant="text"
              onClick={() => router.push("/torrents")}
              className="text-on-success-container underline self-start"
            >
              View Torrents →
            </Button>
          </div>
        )}

        {!metadata ? (
          <>
            <Input
              label="Magnet URI"
              value={magnetURI}
              onChange={(e) => setMagnetURI(e.target.value)}
              placeholder="magnet:?xt=urn:btih:..."
              disabled={isLoading || success}
              onKeyDown={(e) => {
                if (e.key === "Enter" && magnetURI.trim() && !isLoading && !success) {
                  handleFetchMetadata();
                }
              }}
            />

            {loadingStatus && (
              <div className="flex items-center gap-3 p-3 bg-surface-container rounded">
                <div className="animate-spin">
                  <span className="material-symbols-outlined text-primary">progress_activity</span>
                </div>
                <span className="text-sm text-on-surface">{loadingStatus}</span>
              </div>
            )}

            {folderPath && !success && !loadingStatus && (
              <div className="flex items-center gap-2 text-xs text-on-surface-variant bg-surface-container p-2 rounded">
                <span className="material-symbols-outlined text-sm">folder</span>
                <span>Download to: {folderPath}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-on-surface">{metadata.name}</div>
                  <div className="text-xs text-on-surface-variant">{formatBytes(metadata.size)} • {metadata.files.length} files</div>
                </div>
                <div className="flex gap-2">
                  <Button variant="text" onClick={selectAll} size="sm">
                    Select All
                  </Button>
                  <Button variant="text" onClick={deselectAll} size="sm">
                    Deselect All
                  </Button>
                </div>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto border border-outline rounded">
              {metadata.files.map((file, index) => (
                <div
                  key={index}
                  className={`flex items-center gap-3 p-2 cursor-pointer hover:bg-surface-container ${
                    selectedFiles.has(index) ? "bg-surface-container" : ""
                  }`}
                  onClick={() => toggleFileSelection(index)}
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(index)}
                    onChange={() => toggleFileSelection(index)}
                    className="cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-on-surface truncate">{file.path}</div>
                    <div className="text-xs text-on-surface-variant">{formatBytes(file.length)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {error && (
          <div className="flex items-center gap-2 text-sm text-error bg-error-container p-3 rounded">
            <span className="material-symbols-outlined">error</span>
            <span>{error}</span>
          </div>
        )}
      </div>
    </Modal>
  );
}
