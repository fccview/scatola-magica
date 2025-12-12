"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateUserPreferences } from "@/app/_lib/preferences";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import { getKeyStatus } from "@/app/_server/actions/pgp";
import { getEncryptionKey } from "@/app/_server/actions/user";

export default function TorrentsTab() {
  const router = useRouter();
  const { user, torrentPreferences } = usePreferences();

  const [seedRatio, setSeedRatio] = useState(torrentPreferences?.seedRatio ?? 1.0);
  const [preferredDownloadPath, setPreferredDownloadPath] = useState(
    torrentPreferences?.preferredDownloadPath ?? ""
  );
  const [autoStartTorrents, setAutoStartTorrents] = useState(
    torrentPreferences?.autoStartTorrents ?? true
  );
  const [maxActiveTorrents, setMaxActiveTorrents] = useState(
    torrentPreferences?.maxActiveTorrents ?? 5
  );
  const [hasEncryption, setHasEncryption] = useState<boolean | null>(null);
  const [isCheckingEncryption, setIsCheckingEncryption] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const checkEncryption = async () => {
      try {
        const keyResult = await getEncryptionKey();
        console.log("TorrentsTab - Encryption key result:", keyResult.hasEncryptionKey);

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

  const handleSave = async () => {
    if (!user?.username) return;

    setIsSaving(true);
    try {
      await updateUserPreferences(user.username, {
        torrentPreferences: {
          seedRatio: Number(seedRatio),
          preferredDownloadPath: preferredDownloadPath || undefined,
          autoStartTorrents,
          maxActiveTorrents: Number(maxActiveTorrents),
        },
      });
      router.refresh();
    } catch (error) {
      console.error("Error saving preferences:", error);
    } finally {
      setIsSaving(false);
    }
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
                Torrent features require encryption to be configured. Please set up
                PGP encryption keys in the Encryption tab before using torrents.
              </p>
              <p className="text-sm text-on-error-container/70 mb-4">
                This ensures your torrent activity is secure and your downloads are
                protected with end-to-end encryption.
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
    <div className="space-y-12">
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">
          Torrent Settings
        </h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Input
            id="seed-ratio"
            type="number"
            step="0.1"
            min="0"
            value={seedRatio}
            onChange={(e) => setSeedRatio(parseFloat(e.target.value) || 0)}
            label="Seed Ratio Target"
            description="Torrents will stop seeding after reaching this upload/download ratio. Set to 0 for unlimited seeding."
          />

          <Input
            id="preferred-download-path"
            type="text"
            value={preferredDownloadPath}
            onChange={(e) => setPreferredDownloadPath(e.target.value)}
            label="Preferred Download Path (Optional)"
            description="Default location for torrent downloads. Leave empty to use your uploads folder. You can override this per torrent."
            placeholder="Leave empty for default"
          />

          <Input
            id="max-active-torrents"
            type="number"
            min="1"
            max="20"
            value={maxActiveTorrents}
            onChange={(e) => setMaxActiveTorrents(parseInt(e.target.value) || 1)}
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

          <div className="pt-4 flex gap-3">
            <Button
              variant="filled"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? "Saving..." : "Save Settings"}
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setSeedRatio(torrentPreferences?.seedRatio ?? 1.0);
                setPreferredDownloadPath(torrentPreferences?.preferredDownloadPath ?? "");
                setAutoStartTorrents(torrentPreferences?.autoStartTorrents ?? true);
                setMaxActiveTorrents(torrentPreferences?.maxActiveTorrents ?? 5);
              }}
              disabled={isSaving}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">
          Seeding
        </h2>
        <div className="p-6 bg-surface-container rounded-lg">
          <p className="text-on-surface/80 mb-3">
            Seeding helps keep torrents alive by sharing downloaded files. A 1.0 ratio means you've uploaded as much as you downloaded.
          </p>
          <p className="text-on-surface/80">
            You can pause or stop seeding at any time.
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">
          Share Your Files via Torrents
        </h2>
        <div className="p-6 bg-surface-container rounded-lg">
          <p className="text-on-surface/80 mb-3">
            Generate magnet links and .torrent files for your uploaded files and folders.
          </p>
          <p className="text-sm text-on-surface/60">
            Available in file browser (coming soon)
          </p>
        </div>
      </div>
    </div>
  );
}
