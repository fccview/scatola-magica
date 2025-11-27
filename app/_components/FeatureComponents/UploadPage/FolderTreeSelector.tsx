"use client";

import { useState, useEffect, useRef } from "react";
import { getFolderById, type FolderMetadata } from "@/app/actions/folders";
import Card from "@/app/_components/GlobalComponents/Cards/Card";
import FolderTree from "@/app/_components/GlobalComponents/Folders/FolderTree";

interface FolderTreeSelectorProps {
  selectedFolderId?: string;
  onFolderChange: (folderId: string) => void;
  variant?: "dropdown" | "select";
}

export default function FolderTreeSelector({
  selectedFolderId,
  onFolderChange,
  variant = "select",
}: FolderTreeSelectorProps) {
  const [isOpen, setIsOpen] = useState(variant === "dropdown");
  const [selectedFolder, setSelectedFolder] = useState<FolderMetadata | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant === "dropdown") {
      setIsOpen(true);
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, variant]);

  useEffect(() => {
    if (selectedFolderId) {
      loadSelectedFolder();
    } else {
      setSelectedFolder(null);
    }
  }, [selectedFolderId]);

  const loadSelectedFolder = async () => {
    if (!selectedFolderId) return;
    const result = await getFolderById(selectedFolderId);
    if (result.success && result.data) {
      setSelectedFolder(result.data);
    }
  };

  const handleFolderSelect = (folderId: string | null) => {
    onFolderChange(folderId || "");
    if (variant === "select") {
      setIsOpen(false);
    }
  };

  if (variant === "dropdown") {
    return (
      <div className="mb-3">
        <label className="text-xs font-medium text-on-surface-variant mb-1 block">
          Destination Folder
        </label>
        <Card className="relative w-full border-dashed border-outline-variant border-2 bg-surface h-64 flex flex-col overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto">
            <FolderTree
              selectedFolderId={selectedFolderId}
              onFolderSelect={handleFolderSelect}
              variant="dropdown"
              showSearch={true}
              showCreate={true}
              maxHeight="max-h-64"
            />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-3" ref={dropdownRef}>
      <label className="text-xs font-medium text-on-surface-variant mb-1 block">
        Destination Folder
      </label>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full px-2 py-1.5 text-sm rounded border border-outline bg-surface text-on-surface flex items-center justify-between hover:border-primary/50 transition-colors"
        >
          <span className="flex items-center gap-1.5 truncate">
            <span className="material-symbols-outlined text-base">
              {selectedFolderId ? "folder" : "home"}
            </span>
            <span className="truncate text-xs">
              {selectedFolder ? selectedFolder.name : "Root"}
            </span>
          </span>
          <span className="material-symbols-outlined text-base">
            {isOpen ? "expand_less" : "expand_more"}
          </span>
        </button>

        {isOpen && (
          <Card className="absolute z-[60] w-full mt-1 shadow-lg border border-outline bg-surface max-h-64 overflow-hidden flex flex-col">
            <div className="overflow-y-auto flex-1">
              <FolderTree
                selectedFolderId={selectedFolderId}
                onFolderSelect={handleFolderSelect}
                variant="dropdown"
                showSearch={true}
                showCreate={true}
                maxHeight="max-h-64"
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
