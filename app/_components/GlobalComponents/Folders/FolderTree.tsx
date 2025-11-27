"use client";

import FolderTreeSidebar from "@/app/_components/GlobalComponents/Folders/FolderTreeSidebar";
import FolderTreeDropdown from "@/app/_components/GlobalComponents/Folders/FolderTreeDropdown";

interface FolderTreeProps {
  currentFolderId?: string | null;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  showSearch?: boolean;
  showCreate?: boolean;
  maxHeight?: string;
  variant?: "sidebar" | "dropdown";
}

export default function FolderTree({
  currentFolderId,
  selectedFolderId,
  onFolderSelect,
  showSearch = false,
  showCreate = true,
  maxHeight,
  variant = "sidebar",
}: FolderTreeProps) {
  if (variant === "sidebar") {
    return (
      <FolderTreeSidebar showSearch={showSearch} showCreate={showCreate} />
    );
  }

  return (
    <FolderTreeDropdown
      selectedFolderId={selectedFolderId}
      onFolderSelect={onFolderSelect}
      maxHeight={maxHeight}
    />
  );
}
