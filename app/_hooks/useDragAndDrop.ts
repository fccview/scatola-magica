import { useState } from "react";

interface UseDragAndDropOptions {
  onDrop: (files: FileList, targetFolderId?: string | null) => void;
  detectFolder?: boolean;
  currentFolderId?: string | null;
}

export const useDragAndDrop = ({
  onDrop,
  detectFolder = false,
  currentFolderId = null,
}: UseDragAndDropOptions) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragTargetFolderId, setDragTargetFolderId] = useState<string | null>(
    null
  );
  const [dragTargetFolderName, setDragTargetFolderName] = useState<
    string | null
  >(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);

    if (detectFolder) {
      const target = e.target as HTMLElement;
      const folderElement = target.closest("[data-folder-id]");
      if (folderElement) {
        const folderId = folderElement.getAttribute("data-folder-id");
        const folderName = folderElement.textContent?.trim() || null;
        setDragTargetFolderId(folderId === "root" ? null : folderId);
        setDragTargetFolderName(folderId === "root" ? "Root" : folderName);
      } else {
        const mainContent = target.closest("[data-current-folder]");
        if (mainContent) {
          setDragTargetFolderId(currentFolderId || null);
          setDragTargetFolderName(null);
        } else {
          setDragTargetFolderId(null);
          setDragTargetFolderName(null);
        }
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const relatedTarget = e.relatedTarget as Node;
    if (!target.contains(relatedTarget)) {
      setIsDragging(false);
      setDragTargetFolderId(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const targetFolder = detectFolder
        ? dragTargetFolderId !== null
          ? dragTargetFolderId
          : currentFolderId || null
        : null;
      onDrop(files, targetFolder);
    }
    setDragTargetFolderId(null);
  };

  return {
    isDragging,
    dragTargetFolderId,
    dragTargetFolderName,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
  };
};
