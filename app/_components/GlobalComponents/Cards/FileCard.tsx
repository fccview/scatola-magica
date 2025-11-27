"use client";

import { FileMetadata, User } from "@/app/_types";
import { FolderMetadata } from "@/app/actions/folders";
import ListCard from "@/app/_components/GlobalComponents/Cards/ListCard";
import GridCard from "@/app/_components/GlobalComponents/Cards/GridCard";

interface FileCardProps {
  file?: FileMetadata;
  folder?: FolderMetadata;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onMove?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  viewMode?: "grid" | "list";
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  currentUser?: User;
  allUsers?: User[];
  recursive?: boolean;
}

export default function FileCard({
  file,
  folder,
  onDelete,
  onDownload,
  onMove,
  onRename,
  viewMode = "grid",
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  currentUser,
  allUsers = [],
  recursive = false,
}: FileCardProps) {
  if (viewMode === "list") {
    return (
      <ListCard
        file={file}
        folder={folder}
        onDelete={onDelete}
        onDownload={onDownload}
        onMove={onMove}
        onRename={onRename}
        isSelectionMode={isSelectionMode}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        currentUser={currentUser}
        allUsers={allUsers}
        recursive={recursive}
      />
    );
  }

  return (
    <GridCard
      file={file}
      folder={folder}
      onDelete={onDelete}
      onDownload={onDownload}
      onMove={onMove}
      onRename={onRename}
      isSelectionMode={isSelectionMode}
      isSelected={isSelected}
      onToggleSelect={onToggleSelect}
      currentUser={currentUser}
      allUsers={allUsers}
      recursive={recursive}
    />
  );
}
