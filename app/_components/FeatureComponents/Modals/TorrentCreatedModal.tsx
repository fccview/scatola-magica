"use client";

import { useState, useEffect } from "react";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import RadioGroup from "@/app/_components/GlobalComponents/Form/RadioGroup";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import { getKeyStatus } from "@/app/_server/actions/pgp";

interface CreateTorrentModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  onCreate: (options: {
    isAnnounced: boolean;
    trackers: string[];
    encryptBeforeCreate: boolean;
    useOwnKey: boolean;
    customPublicKey?: string;
  }) => Promise<{ magnetURI: string; torrentFile: string } | null>;
}

type ModalStep = "create" | "success";

interface TorrentResult {
  magnetURI: string;
  torrentFile: string;
}

export default function CreateTorrentModal({
  isOpen,
  onClose,
  fileName,
  onCreate,
}: CreateTorrentModalProps) {
  const { torrentPreferences } = usePreferences();
  const [step, setStep] = useState<ModalStep>("create");
  const [isAnnounced, setIsAnnounced] = useState(false);
  const [encryptBeforeCreate, setEncryptBeforeCreate] = useState(false);
  const [useOwnKey, setUseOwnKey] = useState(true);
  const [customPublicKey, setCustomPublicKey] = useState("");
  const [hasOwnKeys, setHasOwnKeys] = useState(false);
  const [wasEncrypted, setWasEncrypted] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [torrentResult, setTorrentResult] = useState<TorrentResult | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  const configuredTrackers = torrentPreferences?.trackers || [];

  useEffect(() => {
    if (isOpen) {
      getKeyStatus().then((status) => {
        setHasOwnKeys(status.hasKeys);
        if (!status.hasKeys) {
          setUseOwnKey(false);
        }
      });
    }
  }, [isOpen]);

  const handleCreate = async () => {
    if (encryptBeforeCreate && !useOwnKey && !customPublicKey.trim()) {
      return;
    }

    setIsCreating(true);
    try {
      const trackerList = isAnnounced ? configuredTrackers : [];

      const result = await onCreate({
        isAnnounced,
        trackers: trackerList,
        encryptBeforeCreate,
        useOwnKey,
        customPublicKey:
          encryptBeforeCreate && !useOwnKey ? customPublicKey : undefined,
      });
      if (result) {
        setTorrentResult(result);
        setStep("success");
      }
    } catch (error) {
      console.error("Error creating torrent:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyMagnet = () => {
    if (torrentResult) {
      navigator.clipboard.writeText(torrentResult.magnetURI);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTorrent = () => {
    if (!torrentResult) return;
    const binaryString = atob(torrentResult.torrentFile);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: "application/x-bittorrent" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${fileName}.torrent`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClose = () => {
    if (isCreating) return;
    setStep("create");
    setIsAnnounced(false);
    setEncryptBeforeCreate(false);
    setUseOwnKey(true);
    setCustomPublicKey("");
    setWasEncrypted(false);
    setTorrentResult(null);
    setCopied(false);
    onClose();
  };

  if (step === "success" && torrentResult) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Torrent Created"
        size="lg"
      >
        <div className="p-6 flex flex-col gap-6">
          <div className="flex items-center gap-3 p-3 bg-success-container rounded">
            <span className="material-symbols-outlined text-on-success-container">
              check_circle
            </span>
            <span className="text-on-success-container">
              Torrent created successfully for {fileName}
            </span>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-on-surface">
              Magnet Link
            </label>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-surface-container rounded text-xs font-mono break-all text-on-surface max-h-24 overflow-y-auto">
                {torrentResult.magnetURI}
              </div>
              <IconButton
                icon={copied ? "check" : "content_copy"}
                onClick={handleCopyMagnet}
                ariaLabel="Copy magnet link"
                size="sm"
              />
            </div>
            {copied && <span className="text-xs text-primary">Copied!</span>}
          </div>

          <Button
            variant="filled"
            onClick={handleDownloadTorrent}
            className="w-full"
          >
            <span className="material-symbols-outlined">download</span>
            <span>Download .torrent File</span>
          </Button>

          <div className="text-xs text-on-surface-variant p-3 bg-surface-container rounded space-y-2">
            {wasEncrypted && (
              <div className="flex items-start gap-2">
                <span className="material-symbols-outlined text-primary text-base">
                  lock
                </span>
                <p>
                  <strong>File is encrypted:</strong> The file was encrypted
                  with PGP before creating the torrent. Even if others download
                  the torrent, they cannot decrypt it without your private key
                  and password. This provides the strongest protection.
                </p>
              </div>
            )}
            <div>
              {isAnnounced
                ? "This torrent is public and discoverable via trackers. Share the magnet link or .torrent file with others."
                : "This torrent is private and can only be accessed by people who have the magnet link or .torrent file directly."}
            </div>
            <div className="pt-2 border-t border-outline-variant">
              <p className="font-medium mb-1">Important:</p>
              <p>
                Once shared, you cannot revoke this torrent. The magnet link and
                .torrent file are permanent. Even if you stop seeding, others
                who have the file can continue sharing it.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
            <Button variant="filled" onClick={handleClose}>
              Done
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Torrent"
      size="lg"
    >
      <div className="p-6 flex flex-col gap-6">
        <div className="mb-4 p-3 bg-primary-container text-on-primary rounded-lg text-sm flex items-center gap-2">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-on-warning-container text-lg">
              warning
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-on-warning-container mb-1">
                This action is irreversible
              </p>
              <p className="text-xs text-on-warning-container/80">
                Once a torrent is created and shared, you cannot revoke it. The
                magnet link and .torrent file are permanent. Even if you stop
                seeding, others who already have the file can continue sharing
                it. Only share torrents for files you're comfortable having
                permanently accessible to anyone with the link.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-on-surface/80">
            Create a torrent for <span className="font-medium">{fileName}</span>
          </p>
        </div>

        <div className="p-4 bg-surface-container rounded-lg">
          <Switch
            checked={isAnnounced}
            onChange={setIsAnnounced}
            label={
              isAnnounced
                ? "Remove trackers from torrent"
                : "Add trackers to torrent"
            }
            description={
              isAnnounced
                ? "Torrent will only be accessible to people who have the magnet link or .torrent file directly. More secure but requires manual sharing."
                : "If enabled, the torrent will be discoverable via trackers and DHT. Anyone with the magnet link can download."
            }
          />

          {isAnnounced && (
            <div className="flex items-start gap-3 mt-4 max-w-full overflow-x-auto">
              <span className="material-symbols-outlined text-primary text-md">
                p2p
              </span>
              <div className="flex-1">
                <p className="text-sm font-medium text-on-surface mb-2">
                  Configured Trackers ({configuredTrackers.length})
                </p>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {configuredTrackers.map((tracker, i) => (
                    <div
                      key={i}
                      className="text-xs font-mono text-on-surface-variant bg-surface px-2 py-1 rounded"
                    >
                      {tracker}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-on-surface-variant mt-3">
                  These trackers are configured in your{" "}
                  <a
                    href="/settings?tab=torrents"
                    className="text-primary underline"
                  >
                    Torrent Settings
                  </a>
                  . To add or remove trackers, update your settings.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-surface-container rounded-lg">
          <Switch
            checked={encryptBeforeCreate}
            onChange={setEncryptBeforeCreate}
            label="Encrypt file before creating torrent"
            description={
              encryptBeforeCreate
                ? "The file will be encrypted with PGP before creating the torrent. Even if others download the torrent, they cannot decrypt it without your private key. This provides the strongest protection."
                : "The file will be shared as-is. Anyone with the torrent can access the original file content."
            }
            disabled={isCreating}
          />
        </div>

        {encryptBeforeCreate && (
          <div className="p-4 bg-surface-container rounded-lg space-y-4">
            <RadioGroup
              options={[
                ...(hasOwnKeys
                  ? [
                      {
                        value: "own",
                        label: "Use my public key",
                        description:
                          "Encrypt with your PGP public key. Only you can decrypt.",
                      },
                    ]
                  : []),
                {
                  value: "custom",
                  label: "Use a custom public key",
                  description:
                    "Encrypt for someone else by providing their public key.",
                },
              ]}
              value={useOwnKey ? "own" : "custom"}
              onChange={(value) => setUseOwnKey(value === "own")}
              disabled={isCreating}
            />

            {!useOwnKey && (
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Public Key (ASCII Armored)
                </label>
                <textarea
                  value={customPublicKey}
                  onChange={(e) => setCustomPublicKey(e.target.value)}
                  rows={6}
                  placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-surface text-on-surface focus:outline-none font-mono"
                  disabled={isCreating}
                />
              </div>
            )}

            {!hasOwnKeys && useOwnKey && (
              <div className="p-3 bg-warning-container text-on-warning-container rounded-lg flex gap-2">
                <Icon icon="info" className="flex-shrink-0" />
                <p className="text-xs">
                  You don't have PGP keys. Generate them in{" "}
                  <a href="/settings?tab=encryption" className="underline">
                    Settings &gt; Encryption
                  </a>{" "}
                  or use a custom public key.
                </p>
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
          <Button variant="text" onClick={handleClose} disabled={isCreating}>
            Cancel
          </Button>
          <Button
            variant="filled"
            onClick={handleCreate}
            disabled={
              isCreating ||
              (encryptBeforeCreate && !useOwnKey && !customPublicKey.trim())
            }
          >
            {isCreating ? "Creating..." : "Create Torrent"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
