"use client";

import FolderTreeSelector from "@/app/_components/FeatureComponents/UploadPage/FolderTreeSelector";

interface MultipleDropzonesConfigProps {
  dropzones: {
    zone1?: string;
    zone2?: string;
    zone3?: string;
    zone4?: string;
  };
  onChange: (dropzones: MultipleDropzonesConfigProps["dropzones"]) => void;
}

export default function MultipleDropzonesConfig({
  dropzones,
  onChange,
}: MultipleDropzonesConfigProps) {
  const handleZoneChange = (
    zone: keyof MultipleDropzonesConfigProps["dropzones"],
    value: string
  ) => {
    onChange({
      ...dropzones,
      [zone]: value,
    });
  };

  const zoneConfig = [
    { id: "zone1" as const, label: "Zone 1 (Top-Left)" },
    { id: "zone2" as const, label: "Zone 2 (Top-Right)" },
    { id: "zone3" as const, label: "Zone 3 (Bottom-Left)" },
    { id: "zone4" as const, label: "Zone 4 (Bottom-Right)" },
  ];

  return (
    <div className="mt-4">
      <div className="mb-4 p-4 bg-surface rounded-lg">
        <p className="text-sm text-on-surface-variant mb-2">
          <span className="material-symbols-outlined text-base align-middle">
            info
          </span>{" "}
          Configure upload destinations
        </p>
        <p className="text-xs text-on-surface-variant">
          Select a folder for each zone. Leave as Root to upload to your root
          directory.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zoneConfig.map((zone) => (
          <div
            key={zone.id}
            className="p-4 border-2 border-dashed border-outline rounded-lg bg-surface"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-on-surface-variant">
                upload_file
              </span>
              <h4 className="text-sm font-medium text-on-surface">
                {zone.label}
              </h4>
            </div>
            <FolderTreeSelector
              selectedFolderId={dropzones[zone.id] || ""}
              onFolderChange={(folderId) => handleZoneChange(zone.id, folderId)}
              variant="select"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
