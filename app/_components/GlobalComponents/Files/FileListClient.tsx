"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileMetadata, User } from "@/app/_types";
import { FileViewMode, SortBy } from "@/app/_types/enums";
import { deleteFile, getFiles, renameFile } from "@/app/actions/files";
import {
  deleteFolder,
  updateFolder,
  type FolderMetadata,
} from "@/app/actions/folders";
import FileCard from "@/app/_components/GlobalComponents/Cards/FileCard";
import FileListSelectionBar from "@/app/_components/GlobalComponents/Files/FileListSelectionBar";
import FileListToolbar from "@/app/_components/GlobalComponents/Files/FileListToolbar";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import MoveFileDialog from "@/app/_components/FeatureComponents/FilesPage/MoveFileDialog";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import { useShortcuts } from "@/app/_providers/ShortcutsProvider";
import { useContextMenu } from "@/app/_providers/ContextMenuProvider";

interface FileListClientProps {
  files: FileMetadata[];
  folders?: FolderMetadata[];
  initialRecursive: boolean;
  folderPath?: string;
  search?: string;
  sortBy?: SortBy;
  hasMore?: boolean;
  total?: number;
  allUsers?: User[];
}

export default function FileListClient({
  files: initialFiles,
  folders = [],
  initialRecursive,
  folderPath = "",
  search = "",
  sortBy = SortBy.DATE_DESC,
  hasMore: initialHasMore = false,
  total: initialTotal = 0,
  allUsers = [],
}: FileListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerActions } = useShortcuts();
  const { showContextMenu } = useContextMenu();
  const currentFolderId = searchParams.get("folderId");
  const [viewMode, setViewMode] = useState<FileViewMode>(FileViewMode.GRID);
  const [isMounted, setIsMounted] = useState(false);
  const [allFiles, setAllFiles] = useState<FileMetadata[]>(initialFiles);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem("view-mode");
    if (saved === "list") {
      setViewMode(FileViewMode.LIST);
    }
  }, []);

  useEffect(() => {
    setAllFiles(initialFiles);
    setCurrentPage(1);
    setHasMore(initialHasMore);
  }, [initialFiles, initialHasMore, folderPath, search, sortBy]);

  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [moveFileIds, setMoveFileIds] = useState<string[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set()
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isRecursive, setIsRecursive] = useState(initialRecursive);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      const result = await getFiles({
        page: nextPage,
        pageSize: 15,
        search,
        sortBy,
        folderPath,
        recursive: isRecursive || !!search,
      });

      if (result.success && result.data) {
        const data = result.data;
        setAllFiles((prev) => [...prev, ...data.items]);
        setCurrentPage(nextPage);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error("Failed to load more files:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    currentPage,
    hasMore,
    isLoadingMore,
    search,
    sortBy,
    folderPath,
    isRecursive,
  ]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasMore && !isLoadingMore) {
          loadMore();
        }
      },
      {
        rootMargin: "100px",
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMore]);

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || isLoadingMore) return;

      const sentinel = sentinelRef.current;
      if (!sentinel) return;

      const rect = sentinel.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      if (rect.top <= windowHeight + 200) {
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, isLoadingMore, loadMore]);

  const totalSelected = selectedFileIds.size + selectedFolderIds.size;

  const toggleRecursive = () => {
    const newRecursive = !isRecursive;
    setIsRecursive(newRecursive);

    document.cookie = `recursive-view=${newRecursive}; path=/; max-age=31536000`;

    router.refresh();
  };

  const handleDeleteFile = async (id: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    setDeletingFileId(id);
    try {
      const result = await deleteFile(id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Failed to delete file");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete file");
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDeleteFolder = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this folder and all its contents?"
      )
    )
      return;

    setDeletingFolderId(id);
    try {
      const result = await deleteFolder(id);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Failed to delete folder");
      }
    } catch (error) {
      console.error("Delete failed:", error);
      alert("Failed to delete folder");
    } finally {
      setDeletingFolderId(null);
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    try {
      const result = await updateFolder(id, newName);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Failed to rename folder");
      }
    } catch (error) {
      console.error("Rename failed:", error);
      alert("Failed to rename folder");
    }
  };

  const handleRenameFile = async (id: string, newName: string) => {
    try {
      const result = await renameFile(id, newName);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || "Failed to rename file");
      }
    } catch (error) {
      console.error("Rename failed:", error);
      alert("Failed to rename file");
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/download/${id}`, "_blank");
  };

  const toggleFileSelection = (id: string) => {
    setSelectedFileIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      if (newSet.size === 0 && selectedFolderIds.size === 0) {
        setIsSelectionMode(false);
      }
      return newSet;
    });
  };

  const toggleFolderSelection = (id: string) => {
    setSelectedFolderIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      if (newSet.size === 0 && selectedFileIds.size === 0) {
        setIsSelectionMode(false);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    setSelectedFileIds(new Set(allFiles.map((f) => f.id)));
    setSelectedFolderIds(new Set(folders.map((f) => f.id)));
    setIsSelectionMode(true);
  };

  const clearSelection = () => {
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
    setIsSelectionMode(false);
  };

  const exitSelectionMode = () => {
    clearSelection();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isSelectionMode) {
        exitSelectionMode();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSelectionMode]);

  const handleBulkDelete = async () => {
    if (totalSelected === 0) return;

    if (!confirm(`Are you sure you want to delete ${totalSelected} item(s)?`))
      return;

    try {
      await Promise.all([
        ...Array.from(selectedFileIds).map((id) => deleteFile(id)),
        ...Array.from(selectedFolderIds).map((id) => deleteFolder(id)),
      ]);
      clearSelection();
      router.refresh();
    } catch (error) {
      console.error("Bulk delete failed:", error);
      alert("Failed to delete some items");
    }
  };

  const handleBulkMove = () => {
    if (selectedFileIds.size === 0) return;
    setMoveFileIds(Array.from(selectedFileIds));
  };

  if (allFiles.length === 0 && folders.length === 0 && !isLoadingMore) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="folder_open"
            size="2xl"
            className="text-on-surface-variant mb-4 block"
          />
          <p className="text-xl text-on-surface-variant">No files yet</p>
          <p className="text-sm text-on-surface-variant mt-2">
            Upload your first file to get started
          </p>
        </div>
      </div>
    );
  }

  const handleViewModeChange = (mode: FileViewMode) => {
    setViewMode(mode);
    localStorage.setItem(
      "view-mode",
      mode === FileViewMode.LIST ? "list" : "grid"
    );
  };

  const toggleViewMode = () => {
    const newMode =
      viewMode === FileViewMode.GRID ? FileViewMode.LIST : FileViewMode.GRID;
    handleViewModeChange(newMode);
  };

  useEffect(() => {
    registerActions({
      onSearch: () => {
        const input = document.getElementById(
          "files-search-input"
        ) as HTMLInputElement | null;
        input?.focus();
      },
      onToggleRecursive: () => {
        const newRecursive = !isRecursive;
        setIsRecursive(newRecursive);
        document.cookie = `recursive-view=${newRecursive}; path=/; max-age=31536000`;
        router.refresh();
      },
      onToggleSelect: () => setIsSelectionMode((prev) => !prev),
      onToggleViewMode: () => {
        const newMode =
          viewMode === FileViewMode.GRID
            ? FileViewMode.LIST
            : FileViewMode.GRID;
        setViewMode(newMode);
        localStorage.setItem(
          "view-mode",
          newMode === FileViewMode.LIST ? "list" : "grid"
        );
      },
    });
  }, [registerActions, isRecursive, viewMode, router]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {isSelectionMode && (
        <FileListSelectionBar
          totalSelected={totalSelected}
          totalItems={allFiles.length + folders.length}
          onClear={exitSelectionMode}
          onDelete={handleBulkDelete}
          onMove={handleBulkMove}
          onSelectAll={selectAll}
        />
      )}
      {!isSelectionMode && (
        <FileListToolbar
          filesCount={initialTotal || allFiles.length}
          foldersCount={folders.length}
          isRecursive={isRecursive}
          viewMode={viewMode}
          isSelectionMode={isSelectionMode}
          onToggleRecursive={toggleRecursive}
          onEnterSelectionMode={() => setIsSelectionMode(true)}
          onSelectAll={selectAll}
          onViewModeChange={handleViewModeChange}
        />
      )}

      <div
        className={`flex-1 overflow-y-auto ${
          viewMode === FileViewMode.GRID
            ? "grid grid-cols-3 medium:grid-cols-2 expanded:grid-cols-3 large:grid-cols-4 xlarge:grid-cols-5 gap-3 content-start lg:p-2"
            : "flex flex-col gap-1"
        }`}
      >
        {!isRecursive &&
          folders.map((folder) => (
            <FileCard
              key={folder.id}
              folder={folder}
              viewMode={viewMode === FileViewMode.GRID ? "grid" : "list"}
              onDelete={
                deletingFolderId === folder.id ? undefined : handleDeleteFolder
              }
              onRename={handleRenameFolder}
              isSelectionMode={isSelectionMode}
              isSelected={selectedFolderIds.has(folder.id)}
              onToggleSelect={() => toggleFolderSelection(folder.id)}
              allUsers={allUsers}
              recursive={isRecursive}
            />
          ))}

        {allFiles.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            viewMode={viewMode === FileViewMode.GRID ? "grid" : "list"}
            onDelete={deletingFileId === file.id ? undefined : handleDeleteFile}
            onDownload={handleDownload}
            onMove={() => setMoveFileIds([file.id])}
            onRename={handleRenameFile}
            isSelectionMode={isSelectionMode}
            isSelected={selectedFileIds.has(file.id)}
            onToggleSelect={() => toggleFileSelection(file.id)}
            recursive={isRecursive}
          />
        ))}

        {isLoadingMore && (
          <div className="col-span-full flex items-center justify-center py-8">
            <Progress variant="circular" size="md" value={50} />
          </div>
        )}

        <div
          ref={sentinelRef}
          className={
            viewMode === FileViewMode.GRID
              ? "col-span-full h-10"
              : "h-10 w-full"
          }
        />
      </div>

      {moveFileIds.length > 0 && (
        <MoveFileDialog
          fileIds={moveFileIds}
          currentFolderId={currentFolderId}
          onClose={() => {
            setMoveFileIds([]);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}
