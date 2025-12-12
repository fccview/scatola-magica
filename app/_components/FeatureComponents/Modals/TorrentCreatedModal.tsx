"use client";

import { useState } from "react";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";

interface TorrentCreatedModalProps {
  onClose: () => void;
  magnetURI: string;
  torrentFile: Buffer;
  fileName: string;
}

export default function TorrentCreatedModal({
  onClose,
  magnetURI,
  torrentFile,
  fileName,
}: TorrentCreatedModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyMagnet = () => {
    navigator.clipboard.writeText(magnetURI);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTorrent = () => {
    // Convert Buffer object to Uint8Array
    const uint8Array = new Uint8Array(
      Object.values(torrentFile) as number[]
    );
    const blob = new Blob([uint8Array], { type: "application/x-bittorrent" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.torrent`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Torrent Created"
      actions={
        <Button onClick={onClose} variant="text">
          Close
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 bg-success-container rounded">
          <span className="material-symbols-outlined text-on-success-container">
            check_circle
          </span>
          <span className="text-on-success-container">Torrent created successfully for {fileName}</span>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-on-surface">
            Magnet Link
          </label>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-surface-container rounded text-xs font-mono break-all text-on-surface max-h-24 overflow-y-auto">
              {magnetURI}
            </div>
            <IconButton
              icon={copied ? "check" : "content_copy"}
              onClick={handleCopyMagnet}
              ariaLabel="Copy magnet link"
              size="sm"
            />
          </div>
          {copied && (
            <span className="text-xs text-primary">Copied!</span>
          )}
        </div>

        <Button variant="filled" onClick={handleDownloadTorrent} className="w-full">
          <span className="material-symbols-outlined">download</span>
          <span>Download .torrent File</span>
        </Button>

        <div className="text-xs text-on-surface-variant p-3 bg-surface-container rounded">
          Share the magnet link or .torrent file with others to enable downloads.
        </div>
      </div>
    </Modal>
  );
}
