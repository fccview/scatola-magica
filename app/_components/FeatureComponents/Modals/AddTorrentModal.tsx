"use client";

import { useState } from "react";
import { addTorrent } from "@/app/_server/actions/torrents";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Input from "@/app/_components/GlobalComponents/Form/Input";

interface AddTorrentModalProps {
  onClose: () => void;
  initialMagnet?: string;
}

export default function AddTorrentModal({
  onClose,
  initialMagnet,
}: AddTorrentModalProps) {
  const [magnetURI, setMagnetURI] = useState(initialMagnet || "");
  const [torrentFile, setTorrentFile] = useState<File | null>(null);
  const [customPath, setCustomPath] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".torrent")) {
        setError("Please select a .torrent file");
        return;
      }
      setTorrentFile(file);
      setMagnetURI(""); // Clear magnet if file is selected
      setError(null);
    }
  };

  const handleMagnetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMagnetURI(value);
    if (value) {
      setTorrentFile(null); // Clear file if magnet is entered
    }
    setError(null);
  };

  const handleSubmit = async () => {
    if (!magnetURI && !torrentFile) {
      setError("Please provide a magnet link or select a .torrent file");
      return;
    }

    setIsAdding(true);
    setError(null);

    try {
      let result;

      if (torrentFile) {
        // Read file as buffer
        const buffer = await torrentFile.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        result = await addTorrent(uint8Array, customPath || undefined);
      } else {
        result = await addTorrent(magnetURI, customPath || undefined);
      }

      if (result.success) {
        onClose();
      } else {
        setError(result.error || "Failed to add torrent");
      }
    } catch (err) {
      console.error("Error adding torrent:", err);
      setError("Failed to add torrent");
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Modal onClose={onClose} title="Add Torrent">
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-error-container rounded-lg">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-error-container">
                error
              </span>
              <div className="text-on-error-container text-sm">{error}</div>
            </div>
          </div>
        )}

        <div>
          <Input
            id="magnet-uri"
            type="text"
            value={magnetURI}
            onChange={handleMagnetChange}
            label="Magnet Link"
            placeholder="magnet:?xt=urn:btih:..."
            disabled={!!torrentFile || isAdding}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-outline"></div>
          <span className="text-sm text-on-surface/60">OR</span>
          <div className="flex-1 h-px bg-outline"></div>
        </div>

        <div>
          <label
            htmlFor="torrent-file"
            className="block text-sm font-medium text-on-surface mb-2"
          >
            Torrent File
          </label>
          <div className="relative">
            <input
              id="torrent-file"
              type="file"
              accept=".torrent"
              onChange={handleFileChange}
              disabled={!!magnetURI || isAdding}
              className="block w-full text-sm text-on-surface
                file:mr-4 file:py-2 file:px-4
                file:rounded-full file:border-0
                file:text-sm file:font-medium
                file:bg-primary file:text-on-primary
                hover:file:bg-primary/90
                disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          {torrentFile && (
            <div className="mt-2 text-sm text-on-surface/80">
              Selected: {torrentFile.name}
            </div>
          )}
        </div>

        <div>
          <Input
            id="custom-path"
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            label="Download Path (Optional)"
            placeholder="Leave empty for default"
            description="Custom location for this torrent. Leave empty to use your preferred download path or uploads folder."
            disabled={isAdding}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="text" onClick={onClose} disabled={isAdding}>
            Cancel
          </Button>
          <Button
            variant="filled"
            onClick={handleSubmit}
            disabled={isAdding || (!magnetURI && !torrentFile)}
          >
            {isAdding ? "Adding..." : "Add Torrent"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
