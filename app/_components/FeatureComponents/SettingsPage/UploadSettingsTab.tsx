"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateUserPreferences } from "@/app/_lib/preferences";
import { getAppSettings, updateAppSettings } from "@/app/_lib/app-settings";
import type { AppSettings } from "@/app/_lib/app-settings";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import MultipleDropzonesConfig from "./MultipleDropzonesConfig";

export default function UploadSettingsTab() {
  const router = useRouter();
  const { user, dropzones: initialDropzones } = usePreferences();

  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [maxChunkSize, setMaxChunkSize] = useState(100);
  const [parallelUploads, setParallelUploads] = useState(12);
  const [maxFileSize, setMaxFileSize] = useState(0);
  const [isSavingApp, setIsSavingApp] = useState(false);

  const [dropzonesEnabled, setDropzonesEnabled] = useState(
    initialDropzones?.enabled ?? false
  );
  const [dropzones, setDropzones] = useState({
    zone1: initialDropzones?.zone1 || "",
    zone2: initialDropzones?.zone2 || "",
    zone3: initialDropzones?.zone3 || "",
    zone4: initialDropzones?.zone4 || "",
  });
  const [isSavingUser, setIsSavingUser] = useState(false);

  useEffect(() => {
    if (user?.isAdmin) {
      getAppSettings().then((settings) => {
        setAppSettings(settings);
        setMaxChunkSize(settings.upload.maxChunkSize / 1024 / 1024);
        setParallelUploads(settings.upload.parallelUploads);
        setMaxFileSize(settings.upload.maxFileSize / 1024 / 1024 / 1024);
      });
    }
  }, [user?.isAdmin]);

  const handleSaveAppSettings = async () => {
    if (!user?.isAdmin) return;

    setIsSavingApp(true);
    try {
      await updateAppSettings({
        upload: {
          maxChunkSize: Number(maxChunkSize) * 1024 * 1024,
          parallelUploads: Number(parallelUploads),
          maxFileSize: Number(maxFileSize) * 1024 * 1024 * 1024,
        },
      });
      router.refresh();
    } catch (error) {
      console.error("Error saving app settings:", error);
    } finally {
      setIsSavingApp(false);
    }
  };

  const handleResetAppSettings = () => {
    if (appSettings) {
      setMaxChunkSize(appSettings.upload.maxChunkSize / 1024 / 1024);
      setParallelUploads(appSettings.upload.parallelUploads);
      setMaxFileSize(appSettings.upload.maxFileSize / 1024 / 1024 / 1024);
    }
  };

  const handleSaveUserSettings = async () => {
    if (!user?.username) return;

    setIsSavingUser(true);
    try {
      await updateUserPreferences(user.username, {
        dropzones: {
          enabled: dropzonesEnabled,
          zone1: dropzones.zone1,
          zone2: dropzones.zone2,
          zone3: dropzones.zone3,
          zone4: dropzones.zone4,
        },
      });
      router.refresh();
    } catch (error) {
      console.error("Error saving dropzone preferences:", error);
    } finally {
      setIsSavingUser(false);
    }
  };

  const handleResetUserSettings = () => {
    setDropzonesEnabled(initialDropzones?.enabled ?? false);
    setDropzones({
      zone1: initialDropzones?.zone1 || "",
      zone2: initialDropzones?.zone2 || "",
      zone3: initialDropzones?.zone3 || "",
      zone4: initialDropzones?.zone4 || "",
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-8">
      {user.isAdmin && (
        <div>
          <h2 className="text-xl font-medium text-on-surface mb-4">
            Upload Performance (Admin Only)
          </h2>
          <div className="p-6 bg-surface-container rounded-lg space-y-6">
            <Input
              secondary
              id="max-chunk-size"
              type="number"
              min="1"
              max="1000"
              value={maxChunkSize}
              onChange={(e) =>
                setMaxChunkSize(parseFloat(e.target.value) || 100)
              }
              label="Max Chunk Size (MB)"
              description="Maximum size for upload chunks. Default: 100 MB"
            />

            <Input
              secondary
              id="parallel-uploads"
              type="number"
              min="1"
              max="20"
              value={parallelUploads}
              onChange={(e) =>
                setParallelUploads(parseInt(e.target.value) || 12)
              }
              label="Parallel Upload Chunks"
              description="Number of chunks to upload simultaneously. Default: 12"
            />

            <Input
              secondary
              id="max-file-size"
              type="number"
              min="0"
              value={maxFileSize}
              onChange={(e) =>
                setMaxFileSize(parseFloat(e.target.value) || 0)
              }
              label="Max File Size (GB)"
              description="Maximum file size allowed for uploads. Set to 0 for unlimited. Default: 0"
            />

            <div className="flex gap-3 pt-4">
              <Button
                variant="filled"
                onClick={handleSaveAppSettings}
                disabled={isSavingApp}
              >
                {isSavingApp ? "Saving..." : "Save App Settings"}
              </Button>
              <Button
                variant="outlined"
                onClick={handleResetAppSettings}
                disabled={isSavingApp}
              >
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-4">
          Multiple Dropzones
        </h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Switch
            id="multiple-dropzones"
            checked={dropzonesEnabled}
            onChange={() => setDropzonesEnabled(!dropzonesEnabled)}
            label="Enable Multiple Dropzones"
            description="When enabled, dragging files shows 4 drop zones for quick uploads to configured folders."
          />

          {dropzonesEnabled && (
            <MultipleDropzonesConfig
              dropzones={dropzones}
              onChange={(newDropzones) =>
                setDropzones({
                  zone1: newDropzones.zone1 || "",
                  zone2: newDropzones.zone2 || "",
                  zone3: newDropzones.zone3 || "",
                  zone4: newDropzones.zone4 || "",
                })
              }
            />
          )}

          <div className="flex gap-3 pt-4">
            <Button
              variant="filled"
              onClick={handleSaveUserSettings}
              disabled={isSavingUser}
            >
              {isSavingUser ? "Saving..." : "Save Dropzone Settings"}
            </Button>
            <Button
              variant="outlined"
              onClick={handleResetUserSettings}
              disabled={isSavingUser}
            >
              Reset
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
