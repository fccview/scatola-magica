"use client";

import { useState } from "react";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import { encryptTorrentMetadata, decryptTorrentMetadata } from "@/app/_server/actions/manage-torrents";
import { verifyPassword } from "@/app/_server/actions/pgp";
import {
  storeE2EPassword,
  getStoredE2EPassword,
} from "@/app/_lib/chunk-encryption";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface TorrentMetadataEncryptionButtonProps {
  isEncrypted: boolean;
  onEncryptionChange: () => void;
}

export default function TorrentMetadataEncryptionButton({
  isEncrypted,
  onEncryptionChange,
}: TorrentMetadataEncryptionButtonProps) {
  const { encryptionKey } = usePreferences();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleOpenModal = async () => {
    setPassword("");
    setError(null);

    if (encryptionKey && isEncrypted) {
      const storedPassword = await getStoredE2EPassword(encryptionKey);
      if (storedPassword) {
        setPassword(storedPassword);
      }
    }

    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (!processing) {
      setPassword("");
      setError(null);
      setIsModalOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setProcessing(true);
    setError(null);

    try {
      if (isEncrypted) {
        if (!password) {
          setError("Password is required to decrypt");
          setProcessing(false);
          return;
        }

        const verifyResult = await verifyPassword(password);
        if (!verifyResult.success) {
          setError("Invalid password");
          setProcessing(false);
          return;
        }

        const result = await decryptTorrentMetadata(password);
        if (!result.success) {
          setError(result.error || "Failed to decrypt metadata");
          setProcessing(false);
          return;
        }

        if (encryptionKey) {
          await storeE2EPassword(password, encryptionKey);
        }
      } else {
        const result = await encryptTorrentMetadata();
        if (!result.success) {
          setError(result.error || "Failed to encrypt metadata");
          setProcessing(false);
          return;
        }
      }

      setPassword("");
      setError(null);
      setProcessing(false);
      setIsModalOpen(false);
      onEncryptionChange();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operation failed");
      setProcessing(false);
    }
  };

  return (
    <>
      <Button
        variant="outlined"
        size="sm"
        onClick={handleOpenModal}
        className="flex items-center gap-2"
      >
        <Icon
          icon={isEncrypted ? "lock_open" : "lock"}
          size="sm"
        />
        {isEncrypted ? "Decrypt Metadata" : "Encrypt Metadata"}
      </Button>

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEncrypted ? "Decrypt Torrent Metadata" : "Encrypt Torrent Metadata"}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-on-surface-variant">
            {isEncrypted
              ? "Enter your PGP private key password to decrypt your torrent metadata. The file will be decrypted and you'll be able to use all torrent features."
              : "Your torrent metadata will be encrypted using your public key."}
          </p>

          {isEncrypted && (
            <Input
              type="password"
              label="Private Key Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              error={error || undefined}
              autoFocus
              disabled={processing}
            />
          )}

          {error && !isEncrypted && (
            <div className="p-3 bg-error-container rounded-lg text-sm text-on-error-container">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="filled"
              disabled={processing || (isEncrypted && !password)}
            >
              {processing
                ? isEncrypted
                  ? "Decrypting..."
                  : "Encrypting..."
                : isEncrypted
                  ? "Decrypt"
                  : "Encrypt"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              onClick={handleCloseModal}
              disabled={processing}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
