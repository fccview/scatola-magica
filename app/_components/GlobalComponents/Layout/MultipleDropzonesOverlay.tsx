"use client";

import { useState, DragEvent } from "react";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";

interface MultipleDropzonesOverlayProps {
  isVisible: boolean;
  dropzones: {
    zone1?: string;
    zone2?: string;
    zone3?: string;
    zone4?: string;
  };
  onDrop: (
    zone: "zone1" | "zone2" | "zone3" | "zone4",
    dataTransfer: DataTransfer
  ) => void;
}

export default function MultipleDropzonesOverlay({
  isVisible,
  dropzones,
  onDrop,
}: MultipleDropzonesOverlayProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null);

  if (!isVisible) return null;

  const zones = [
    { id: "zone1" as const, label: "1", path: dropzones.zone1 || "Root" },
    { id: "zone2" as const, label: "2", path: dropzones.zone2 || "Root" },
    { id: "zone3" as const, label: "3", path: dropzones.zone3 || "Root" },
    { id: "zone4" as const, label: "4", path: dropzones.zone4 || "Root" },
  ];

  const handleZoneDragOver = (
    e: DragEvent<HTMLDivElement>,
    zoneId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (hoveredZone !== zoneId) {
      setHoveredZone(zoneId);
    }
  };

  const handleZoneDrop = (
    e: DragEvent<HTMLDivElement>,
    zoneId: "zone1" | "zone2" | "zone3" | "zone4"
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setHoveredZone(null);

    if (e.dataTransfer) {
      onDrop(zoneId, e.dataTransfer);
    }
  };

  return (
    <div className="fixed w-[calc(100vw-10px)] h-[calc(100vh-10px)] top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-[100] backdrop-blur-[1.5px] pointer-events-none">
      <div className="grid grid-cols-2 grid-rows-2 h-full w-full pointer-events-auto">
        {zones.map((zone, index) => (
          <div
            key={zone.id}
            className={`
              relative flex flex-col items-center justify-center
              transition-all duration-150 border-dashed border-outline
            `}
            onDragOver={(e) => handleZoneDragOver(e, zone.id)}
            onDrop={(e) => handleZoneDrop(e, zone.id)}
          >
            <div
              className={`text-center pointer-events-none transition-opacity duration-150 ${hoveredZone === zone.id ? "opacity-100" : "opacity-20"
                }`}
            >
              <span className="material-symbols-outlined text-on-surface text-5xl mb-3 block">
                upload_file
              </span>
              <div className="text-on-surface text-2xl font-medium mb-1">
                Zone {zone.label}
              </div>
              <div className="text-on-surface-variant text-sm">{zone.path}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="absolute top-[55%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
        <Logo
          className="w-32 h-32 md:w-48 md:h-48"
          hideBox={false}
          hoverEffect={true}
        />
      </div>
    </div>
  );
}
