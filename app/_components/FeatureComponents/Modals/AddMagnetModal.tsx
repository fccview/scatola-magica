"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Checkbox from "@/app/_components/GlobalComponents/Form/Checkbox";
import FolderTreeDropdown from "@/app/_components/GlobalComponents/Folders/FolderTreeDropdown";
import { addTorrent } from "@/app/_server/actions/manage-torrents";
import {
  fetchTorrentMetadata,
  TorrentMetadataInfo,
} from "@/app/_lib/torrents/torrent-metadata";

interface AddMagnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderPath?: string;
  initialMagnet?: string;
  initialTorrentFile?: File;
}

export default function AddMagnetModal({
  isOpen,
  onClose,
  folderPath,
  initialMagnet,
  initialTorrentFile,
}: AddMagnetModalProps) {
  const router = useRouter();
  const [magnetURI, setMagnetURI] = useState("");
  const [torrentFile, setTorrentFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [metadata, setMetadata] = useState<TorrentMetadataInfo | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
  const [selectedFolder, setSelectedFolder] = useState<string | null>(
    folderPath || null
  );

  useEffect(() => {
    if (isOpen) {
      if (initialMagnet) {
        setMagnetURI(initialMagnet);
        setTorrentFile(null);
        setError(null);
        setMetadata(null);
        setSelectedFiles(new Set());
      } else if (initialTorrentFile) {
        setTorrentFile(initialTorrentFile);
        setMagnetURI("");
        setError(null);
        setMetadata(null);
        setSelectedFiles(new Set());
      } else {
        setMagnetURI("");
        setTorrentFile(null);
        setError(null);
        setMetadata(null);
        setSelectedFiles(new Set());
        setSelectedFolder(folderPath || null);
      }
    }
  }, [isOpen, initialMagnet, initialTorrentFile, folderPath]);

  useEffect(() => {
    if (
      isOpen &&
      (initialMagnet || initialTorrentFile) &&
      !metadata &&
      !isLoading
    ) {
      const fetchInitialMetadata = async () => {
        if (!initialMagnet && !initialTorrentFile) return;

        setIsLoading(true);
        setError(null);
        setLoadingStatus("Connecting to DHT...");

        try {
          await new Promise((resolve) => setTimeout(resolve, 500));
          setLoadingStatus("Finding peers...");

          await new Promise((resolve) => setTimeout(resolve, 1000));
          setLoadingStatus("Fetching metadata...");

          let result;
          if (initialTorrentFile) {
            const buffer = await initialTorrentFile.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            result = await fetchTorrentMetadata(uint8Array);
          } else if (initialMagnet) {
            result = await fetchTorrentMetadata(initialMagnet);
          } else {
            return;
          }

          if (result.success && result.data) {
            setLoadingStatus("Metadata received!");
            await new Promise((resolve) => setTimeout(resolve, 300));

            setMetadata(result.data);
            setSelectedFiles(new Set());
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

      fetchInitialMetadata();
    }
  }, [isOpen, initialMagnet, initialTorrentFile]);

  const handleFetchMetadata = async () => {
    if (!magnetURI.trim() && !torrentFile) {
      setError("Provide a magnet URI or .torrent file");
      return;
    }

    if (magnetURI && !magnetURI.startsWith("magnet:")) {
      setError("Invalid magnet URI format");
      return;
    }

    setIsLoading(true);
    setError(null);
    setLoadingStatus("Connecting to DHT...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setLoadingStatus("Finding peers...");

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoadingStatus("Fetching metadata...");

      let result;
      if (torrentFile) {
        const buffer = await torrentFile.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        result = await fetchTorrentMetadata(uint8Array);
      } else {
        result = await fetchTorrentMetadata(magnetURI);
      }

      if (result.success && result.data) {
        setLoadingStatus("Metadata received!");
        await new Promise((resolve) => setTimeout(resolve, 300));

        setMetadata(result.data);
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
      let result;
      if (torrentFile) {
        const buffer = await torrentFile.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        result = await addTorrent(
          uint8Array,
          undefined,
          selectedFolder || undefined
        );
      } else {
        result = await addTorrent(
          magnetURI,
          undefined,
          selectedFolder || undefined
        );
      }

      if (result.success) {
        setSuccess(true);
        setMagnetURI("");
        setTorrentFile(null);
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
    setTorrentFile(null);
    setError(null);
    setSuccess(false);
    setMetadata(null);
    setSelectedFiles(new Set());
    setSelectedFolder(folderPath || null);
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
      title={metadata ? "Select Files to Download" : "Add Magnet"}
      headerActions={
        <>
          <Button onClick={handleClose} variant="outlined" disabled={isLoading}>
            Cancel
          </Button>
          {metadata ? (
            <Button
              onClick={handleAddTorrent}
              variant="filled"
              disabled={isLoading || selectedFiles.size === 0}
            >
              {isLoading ? "Adding..." : `Download (${selectedFiles.size})`}
            </Button>
          ) : (
            <Button
              onClick={handleFetchMetadata}
              variant="filled"
              disabled={isLoading || (!magnetURI.trim() && !torrentFile)}
            >
              {isLoading ? "Fetching..." : "Next"}
            </Button>
          )}
        </>
      }
    >
      <div className="p-6 flex flex-col gap-6">
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
              onChange={(e) => {
                setMagnetURI(e.target.value);
                if (e.target.value) setTorrentFile(null);
              }}
              placeholder="magnet:?xt=urn:btih:..."
              disabled={isLoading || success || !!torrentFile}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  magnetURI.trim() &&
                  !isLoading &&
                  !success
                ) {
                  handleFetchMetadata();
                }
              }}
            />

            {loadingStatus && (
              <div className="flex items-center gap-3 p-3 bg-surface-container rounded">
                <span className="material-symbols-outlined text-primary animate-spin inline-block">
                  progress_activity
                </span>
                <span className="text-sm text-on-surface">{loadingStatus}</span>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="p-4 bg-surface-container rounded-lg">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-2xl">
                  folder_zip
                </span>
                <div className="flex-1">
                  <div className="text-base font-medium text-on-surface mb-1">
                    {metadata.name}
                  </div>
                  <div className="text-sm text-on-surface-variant">
                    {formatBytes(metadata.size)} • {metadata.files.length} file
                    {metadata.files.length !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-on-surface mb-2">
                Download Location
              </label>
              <div className="p-3 bg-surface-container rounded-lg max-h-60 overflow-y-auto">
                <FolderTreeDropdown
                  selectedFolderId={selectedFolder}
                  onFolderSelect={setSelectedFolder}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-on-surface">
                  Select Files
                </label>
                <div className="flex gap-2">
                  <Button variant="filled" onClick={selectAll} size="sm">
                    All
                  </Button>
                  <Button variant="outlined" onClick={deselectAll} size="sm">
                    None
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {metadata.files.map((file, index) => (
                  <Checkbox
                    key={index}
                    checked={selectedFiles.has(index)}
                    onChange={() => toggleFileSelection(index)}
                    label={file.path}
                    description={formatBytes(file.length)}
                  />
                ))}
              </div>

              <div className="text-xs text-on-surface-variant mt-3">
                {selectedFiles.size} of {metadata.files.length} selected
              </div>
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
