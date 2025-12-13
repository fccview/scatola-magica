"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import { verifyPassword } from "@/app/_server/actions/pgp";
import {
  storeE2EPassword,
  getStoredE2EPassword,
} from "@/app/_lib/chunk-encryption";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

interface TorrentPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordSubmit: (password: string) => void;
}

export default function TorrentPasswordModal({
  isOpen,
  onClose,
  onPasswordSubmit,
}: TorrentPasswordModalProps) {
  const { encryptionKey } = usePreferences();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (encryptionKey) {
        (async () => {
          const storedPassword = await getStoredE2EPassword(encryptionKey);
          if (storedPassword) {
            onPasswordSubmit(storedPassword);
            onClose();
            return;
          }
        })();
      }
    } else {
      setPassword("");
      setError(null);
    }
  }, [isOpen, encryptionKey, onPasswordSubmit, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError("Password is required");
      return;
    }

    setVerifying(true);
    setError(null);

    const result = await verifyPassword(password);

    if (!result.success) {
      setError("Invalid password");
      setVerifying(false);
      return;
    }

    if (encryptionKey) {
      await storeE2EPassword(password, encryptionKey);
    }

    onPasswordSubmit(password);
    setPassword("");
    setError(null);
    setVerifying(false);
    onClose();
  };

  const handleClose = () => {
    setPassword("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Torrent Metadata Encryption"
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        <p className="text-sm text-on-surface-variant">
          Your torrent metadata is encrypted. Enter your PGP private key
          password to decrypt and view your torrents. The password will be
          stored encrypted in your browser session.
        </p>

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
        />

        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="filled" disabled={verifying}>
            {verifying ? "Verifying..." : "Continue"}
          </Button>
          <Button
            type="button"
            variant="outlined"
            onClick={handleClose}
            disabled={verifying}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
