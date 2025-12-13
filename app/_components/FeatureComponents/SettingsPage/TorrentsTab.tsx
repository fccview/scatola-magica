"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateUserPreferences } from "@/app/_lib/preferences";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Textarea from "@/app/_components/GlobalComponents/Form/Textarea";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import { getKeyStatus } from "@/app/_server/actions/pgp";
import { getEncryptionKey } from "@/app/_server/actions/user";
import { migrateTorrentMetadataEncryption } from "@/app/_server/actions/manage-torrents";
import E2EPasswordModal from "@/app/_components/FeatureComponents/Modals/E2EPasswordModal";
import { getStoredE2EPassword } from "@/app/_lib/chunk-encryption";

export default function TorrentsTab() {
  const router = useRouter();
  const { user, torrentPreferences, encryptionKey } = usePreferences();

  const [seedRatio, setSeedRatio] = useState(
    torrentPreferences?.seedRatio ?? 1.0
  );
  const [preferredDownloadPath, setPreferredDownloadPath] = useState(
    torrentPreferences?.preferredDownloadPath ?? ""
  );
  const [autoStartTorrents, setAutoStartTorrents] = useState(
    torrentPreferences?.autoStartTorrents ?? true
  );
  const [encryptMetadata, setEncryptMetadata] = useState(
    torrentPreferences?.encryptMetadata ?? true
  );
  const [maxActiveTorrents, setMaxActiveTorrents] = useState(
    torrentPreferences?.maxActiveTorrents ?? 5
  );

  const [maxTorrentFileSize, setMaxTorrentFileSize] = useState(
    (torrentPreferences?.maxTorrentFileSize ?? 10 * 1024 * 1024) / 1024 / 1024
  );
  const [maxSingleFileSize, setMaxSingleFileSize] = useState(
    (torrentPreferences?.maxSingleFileSize ?? 50 * 1024 * 1024 * 1024) /
      1024 /
      1024 /
      1024
  );
  const [maxTotalTorrentSize, setMaxTotalTorrentSize] = useState(
    (torrentPreferences?.maxTotalTorrentSize ?? 100 * 1024 * 1024 * 1024) /
      1024 /
      1024 /
      1024
  );
  const [maxFolderFileCount, setMaxFolderFileCount] = useState(
    torrentPreferences?.maxFolderFileCount ?? 10000
  );
  const [maxPathDepth, setMaxPathDepth] = useState(
    torrentPreferences?.maxPathDepth ?? 10
  );

  const [maxDownloadSpeed, setMaxDownloadSpeed] = useState(
    torrentPreferences?.maxDownloadSpeed ?? -1
  );
  const [maxUploadSpeed, setMaxUploadSpeed] = useState(
    torrentPreferences?.maxUploadSpeed ?? -1
  );

  const [trackers, setTrackers] = useState<string[]>(
    torrentPreferences?.trackers || []
  );
  const [trackersText, setTrackersText] = useState(
    (torrentPreferences?.trackers || []).join("\n")
  );
  const [allowCustomTrackers, setAllowCustomTrackers] = useState(
    torrentPreferences?.allowCustomTrackers ?? false
  );

  const [hasEncryption, setHasEncryption] = useState<boolean | null>(null);
  const [isCheckingEncryption, setIsCheckingEncryption] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingEncryptValue, setPendingEncryptValue] = useState<
    boolean | null
  >(null);

  useEffect(() => {
    const checkEncryption = async () => {
      try {
        const keyResult = await getEncryptionKey();
        console.log(
          "TorrentsTab - Encryption key result:",
          keyResult.hasEncryptionKey
        );

        if (!keyResult.hasEncryptionKey) {
          console.log("TorrentsTab - No encryption key found");
          setHasEncryption(false);
          setIsCheckingEncryption(false);
          return;
        }

        console.log("TorrentsTab - Checking PGP key status...");
        const keyStatus = await getKeyStatus();
        console.log("TorrentsTab - PGP key status result:", keyStatus.hasKeys);
        setHasEncryption(keyStatus.hasKeys);
      } catch (error) {
        console.error("TorrentsTab - Error checking encryption:", error);
        setHasEncryption(false);
      } finally {
        setIsCheckingEncryption(false);
      }
    };

    checkEncryption();
  }, [user]);

  const handleEncryptionToggle = async (encrypt: boolean, password: string) => {
    if (!user?.username) return;

    setIsSaving(true);
    try {
      const result = await migrateTorrentMetadataEncryption(encrypt, password);
      if (!result.success) {
        alert(result.error || "Failed to migrate encryption");
        return;
      }
      setEncryptMetadata(encrypt);
      await updateUserPreferences(user.username, {
        torrentPreferences: {
          encryptMetadata: encrypt,
        },
      });
      router.refresh();
    } catch (error) {
      console.error("Error toggling encryption:", error);
      alert("Failed to toggle encryption");
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordSubmit = async (password: string) => {
    if (pendingEncryptValue !== null) {
      await handleEncryptionToggle(pendingEncryptValue, password);
      setPendingEncryptValue(null);
    }
    setShowPasswordModal(false);
  };

  const handleSave = async () => {
    if (!user?.username) return;

    const trackerList = trackersText
      .split("\n")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    setIsSaving(true);
    try {
      await updateUserPreferences(user.username, {
        torrentPreferences: {
          seedRatio: Number(seedRatio),
          preferredDownloadPath: preferredDownloadPath || undefined,
          autoStartTorrents,
          encryptMetadata,
          maxActiveTorrents: Number(maxActiveTorrents),
          maxTorrentFileSize: Number(maxTorrentFileSize) * 1024 * 1024,
          maxSingleFileSize: Number(maxSingleFileSize) * 1024 * 1024 * 1024,
          maxTotalTorrentSize: Number(maxTotalTorrentSize) * 1024 * 1024 * 1024,
          maxFolderFileCount: Number(maxFolderFileCount),
          maxPathDepth: Number(maxPathDepth),
          maxDownloadSpeed: Number(maxDownloadSpeed),
          maxUploadSpeed: Number(maxUploadSpeed),
          trackers: trackerList,
          allowCustomTrackers,
        },
      });
      setTrackers(trackerList);
      router.refresh();
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSeedRatio(torrentPreferences?.seedRatio ?? 1.0);
    setPreferredDownloadPath(torrentPreferences?.preferredDownloadPath ?? "");
    setAutoStartTorrents(torrentPreferences?.autoStartTorrents ?? true);
    setEncryptMetadata(torrentPreferences?.encryptMetadata ?? true);
    setMaxActiveTorrents(torrentPreferences?.maxActiveTorrents ?? 5);
    setMaxTorrentFileSize(
      (torrentPreferences?.maxTorrentFileSize ?? 10 * 1024 * 1024) / 1024 / 1024
    );
    setMaxSingleFileSize(
      (torrentPreferences?.maxSingleFileSize ?? 50 * 1024 * 1024 * 1024) /
        1024 /
        1024 /
        1024
    );
    setMaxTotalTorrentSize(
      (torrentPreferences?.maxTotalTorrentSize ?? 100 * 1024 * 1024 * 1024) /
        1024 /
        1024 /
        1024
    );
    setMaxFolderFileCount(torrentPreferences?.maxFolderFileCount ?? 10000);
    setMaxPathDepth(torrentPreferences?.maxPathDepth ?? 10);
    setMaxDownloadSpeed(torrentPreferences?.maxDownloadSpeed ?? -1);
    setMaxUploadSpeed(torrentPreferences?.maxUploadSpeed ?? -1);
    const resetTrackers = torrentPreferences?.trackers || [];
    setTrackers(resetTrackers);
    setTrackersText(resetTrackers.join("\n"));
    setAllowCustomTrackers(torrentPreferences?.allowCustomTrackers ?? false);
  };

  if (isCheckingEncryption) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-on-surface/60">Checking encryption status...</div>
      </div>
    );
  }

  if (hasEncryption === false) {
    return (
      <div className="space-y-6">
        <div className="p-6 bg-error-container rounded-lg">
          <div className="flex items-start gap-4">
            <span className="material-symbols-outlined text-on-error-container text-3xl">
              lock
            </span>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-on-error-container mb-2">
                Encryption Required
              </h3>
              <p className="text-on-error-container/80 mb-4">
                Torrent features require encryption to be configured. Please set
                up PGP encryption keys in the Encryption tab before using
                torrents.
              </p>
              <p className="text-sm text-on-error-container/70 mb-4">
                This ensures your torrent activity is secure and your downloads
                are protected with end-to-end encryption.
              </p>
              <Button
                variant="filled"
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set("tab", "encryption");
                  router.push(url.toString());
                }}
              >
                Go to Encryption Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-4">
          Basic Settings
        </h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Input
            secondary
            id="seed-ratio"
            type="number"
            step="0.1"
            min="0"
            value={seedRatio}
            onChange={(e) => setSeedRatio(parseFloat(e.target.value) || 0)}
            label="Seed Ratio Target"
            description="Torrents will stop seeding after reaching this upload/download ratio. Set to 0 for unlimited."
          />

          <Input
            secondary
            id="max-active-torrents"
            type="number"
            min="1"
            max="20"
            value={maxActiveTorrents}
            onChange={(e) =>
              setMaxActiveTorrents(parseInt(e.target.value) || 1)
            }
            label="Max Active Torrents"
            description="Maximum number of torrents that can download/seed simultaneously"
          />

          <Switch
            id="auto-start-torrents"
            checked={autoStartTorrents}
            onChange={() => setAutoStartTorrents(!autoStartTorrents)}
            label="Auto-start Torrents"
            description="Automatically start downloading torrents when added"
          />

          <Switch
            id="encrypt-metadata"
            checked={encryptMetadata}
            onChange={async () => {
              const newValue = !encryptMetadata;
              const { encryptionKey } = usePreferences();

              const password = encryptionKey
                ? await getStoredE2EPassword(encryptionKey)
                : null;
              if (!password) {
                setPendingEncryptValue(newValue);
                setShowPasswordModal(true);
                return;
              }
              await handleEncryptionToggle(newValue, password);
            }}
            label="Encrypt Metadata"
            description="Encrypt torrent metadata with PGP. Disable to avoid password prompts, but metadata will be stored in plain text."
          />

          <div className="p-4 bg-surface rounded-lg">
            <p className="text-sm text-on-surface-variant mb-2">
              <span className="material-symbols-outlined text-base align-middle">
                info
              </span>{" "}
              Preferred Download Path
            </p>
            <p className="text-xs text-on-surface-variant">
              Currently set to:{" "}
              {preferredDownloadPath || "Default (your uploads folder)"}. To
              change this, use the folder selector when adding torrents.
            </p>
          </div>
        </div>
      </div>

      {/* Resource Limits */}
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-4">
          Resource Limits
        </h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Input
            secondary
            id="max-torrent-file-size"
            type="number"
            min="1"
            max="100"
            value={maxTorrentFileSize}
            onChange={(e) =>
              setMaxTorrentFileSize(parseFloat(e.target.value) || 10)
            }
            label="Max Torrent File Size (MB)"
            description="Maximum size for .torrent files"
          />

          <Input
            secondary
            id="max-single-file-size"
            type="number"
            min="1"
            max="1000"
            value={maxSingleFileSize}
            onChange={(e) =>
              setMaxSingleFileSize(parseFloat(e.target.value) || 50)
            }
            label="Max Single File Size (GB)"
            description="Maximum size for individual files within torrents"
          />

          <Input
            secondary
            id="max-total-torrent-size"
            type="number"
            min="1"
            max="10000"
            value={maxTotalTorrentSize}
            onChange={(e) =>
              setMaxTotalTorrentSize(parseFloat(e.target.value) || 100)
            }
            label="Max Total Torrent Size (GB)"
            description="Maximum total size for entire torrent"
          />

          <Input
            secondary
            id="max-folder-file-count"
            type="number"
            min="100"
            max="100000"
            value={maxFolderFileCount}
            onChange={(e) =>
              setMaxFolderFileCount(parseInt(e.target.value) || 10000)
            }
            label="Max Files Per Torrent"
            description="Maximum number of files in a folder torrent"
          />

          <Input
            secondary
            id="max-path-depth"
            type="number"
            min="5"
            max="50"
            value={maxPathDepth}
            onChange={(e) => setMaxPathDepth(parseInt(e.target.value) || 10)}
            label="Max Directory Depth"
            description="Maximum nested folder depth allowed"
          />
        </div>
      </div>

      {/* Bandwidth Limits */}
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-4">
          Bandwidth Limits
        </h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Input
            secondary
            id="max-download-speed"
            type="number"
            min="-1"
            value={maxDownloadSpeed}
            onChange={(e) =>
              setMaxDownloadSpeed(parseInt(e.target.value) || -1)
            }
            label="Max Download Speed (KB/s)"
            description="Maximum download speed. Set to -1 for unlimited."
          />

          <Input
            secondary
            id="max-upload-speed"
            type="number"
            min="-1"
            value={maxUploadSpeed}
            onChange={(e) => setMaxUploadSpeed(parseInt(e.target.value) || -1)}
            label="Max Upload Speed (KB/s)"
            description="Maximum upload speed. Set to -1 for unlimited."
          />
        </div>
      </div>

      {/* Trackers */}
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-4">Trackers</h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-on-warning-container">
              security
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium text-on-warning-container mb-1">
                Security Notice
              </p>
              <p className="text-xs text-on-warning-container/80">
                These trackers will be used for ALL public torrents you create.
                Only add trusted trackers to prevent SSRF attacks.
              </p>
            </div>
          </div>

          <Textarea
            secondary
            id="trackers"
            rows={8}
            value={trackersText}
            onChange={(e) => setTrackersText(e.target.value)}
            label="Tracker URLs (one per line)"
            description="These trackers will be used when creating public torrents. Torrent creation will use only these trackers."
            placeholder="udp://tracker.example.com:6969/announce"
          />

          <div className="text-sm text-on-surface-variant">
            <p className="mb-2 font-medium">
              Configured Trackers: {trackers.length}
            </p>
            <p className="text-xs">
              When creating torrents, these trackers will be shown and
              automatically applied. No custom trackers allowed during creation.
            </p>
          </div>
        </div>
      </div>

      {/* Save/Reset Buttons */}
      <div className="flex gap-3">
        <Button variant="filled" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save All Settings"}
        </Button>
        <Button variant="outlined" onClick={handleReset} disabled={isSaving}>
          Reset to Current
        </Button>
      </div>

      <E2EPasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setPendingEncryptValue(null);
        }}
        onPasswordSubmit={handlePasswordSubmit}
      />
    </div>
  );
}
