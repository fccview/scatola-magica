"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileMetadata } from "@/app/_types";
import { FileViewMode, SortBy } from "@/app/_types/enums";
import { deleteFile, getFiles, renameFile } from "@/app/_server/actions/files";
import {
  deleteFolder,
  updateFolder,
  type FolderMetadata,
} from "@/app/_server/actions/folders";
import {
  encryptFile,
  decryptFile,
  encryptFolder,
  decryptFolder,
} from "@/app/_server/actions/files/encryption";
import { useShortcuts } from "@/app/_providers/ShortcutsProvider";
import { useContextMenu } from "@/app/_providers/ContextMenuProvider";
import { useFileViewer } from "@/app/_providers/FileViewerProvider";

interface UseFileListProps {
  initialFiles: FileMetadata[];
  folders: FolderMetadata[];
  initialRecursive: boolean;
  folderPath: string;
  search: string;
  sortBy: SortBy;
  initialHasMore: boolean;
}

export const useFileList = ({
  initialFiles,
  folders,
  initialRecursive,
  folderPath,
  search,
  sortBy,
  initialHasMore,
}: UseFileListProps) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { registerActions } = useShortcuts();
  const { openFile } = useFileViewer();
  const currentFolderId = searchParams.get("folderId");
  const [viewMode, setViewMode] = useState<FileViewMode>(FileViewMode.GRID);
  const [allFiles, setAllFiles] = useState<FileMetadata[]>(initialFiles);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
  const [encryptingFileId, setEncryptingFileId] = useState<string | null>(null);
  const [decryptingFileId, setDecryptingFileId] = useState<string | null>(null);
  const [encryptingFolderId, setEncryptingFolderId] = useState<string | null>(
    null
  );
  const [decryptingFolderId, setDecryptingFolderId] = useState<string | null>(
    null
  );
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(
    new Set()
  );
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(
    new Set()
  );
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isRecursive, setIsRecursive] = useState(initialRecursive);
  const [confirmDeleteFileId, setConfirmDeleteFileId] = useState<string | null>(
    null
  );
  const [confirmDeleteFolderId, setConfirmDeleteFolderId] = useState<
    string | null
  >(null);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    message: string;
    variant?: "error" | "info" | "warning";
  }>({
    isOpen: false,
    message: "",
    variant: "error",
  });

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

  const handleDeleteFile = (id: string) => {
    setConfirmDeleteFileId(id);
  };

  const confirmDeleteFile = async () => {
    if (!confirmDeleteFileId) return;

    const fileId = confirmDeleteFileId;
    setDeletingFileId(fileId);
    setConfirmDeleteFileId(null);
    try {
      const result = await deleteFile(fileId);
      if (result.success) {
        router.refresh();
      } else {
        setErrorModal({
          isOpen: true,
          message: result.error || "Failed to delete file",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Delete failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to delete file",
        variant: "error",
      });
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDeleteFolder = (id: string) => {
    setConfirmDeleteFolderId(id);
  };

  const confirmDeleteFolder = async () => {
    if (!confirmDeleteFolderId) return;

    const folderId = confirmDeleteFolderId;
    setDeletingFolderId(folderId);
    setConfirmDeleteFolderId(null);
    try {
      const result = await deleteFolder(folderId);
      if (result.success) {
        router.refresh();
      } else {
        setErrorModal({
          isOpen: true,
          message: result.error || "Failed to delete folder",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Delete failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to delete folder",
        variant: "error",
      });
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
        setErrorModal({
          isOpen: true,
          message: result.error || "Failed to rename folder",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Rename failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to rename folder",
        variant: "error",
      });
    }
  };

  const handleRenameFile = async (id: string, newName: string) => {
    try {
      const result = await renameFile(id, newName);
      if (result.success) {
        router.refresh();
      } else {
        setErrorModal({
          isOpen: true,
          message: result.error || "Failed to rename file",
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Rename failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to rename file",
        variant: "error",
      });
    }
  };

  const handleDownload = (id: string) => {
    window.open(`/api/download/${encodeURIComponent(id)}`, "_blank");
  };

  const handleFileOpen = (id: string) => {
    const file = allFiles.find((f) => f.id === id);
    if (file) {
      const fileUrl = `/api/download/${encodeURIComponent(id)}`;
      openFile(id, file.originalName, fileUrl);
    }
  };

  const handleEncrypt = async (
    deleteOriginal: boolean,
    customPublicKey?: string
  ) => {
    if (!encryptingFileId) return;

    try {
      const result = await encryptFile(
        encryptingFileId,
        deleteOriginal,
        customPublicKey
      );
      if (result.success) {
        router.refresh();
      } else {
        setErrorModal({
          isOpen: true,
          message: result.message,
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Encryption failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to encrypt file",
        variant: "error",
      });
    }
  };

  const handleDecrypt = async (
    password: string,
    outputName: string,
    deleteEncrypted: boolean,
    customPrivateKey?: string
  ) => {
    if (!decryptingFileId) return;

    try {
      const result = await decryptFile(
        decryptingFileId,
        password,
        outputName,
        deleteEncrypted,
        customPrivateKey
      );
      if (result.success) {
        router.refresh();
      } else {
        setErrorModal({
          isOpen: true,
          message: result.message,
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Decryption failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to decrypt file",
        variant: "error",
      });
    }
  };

  const handleEncryptFolder = async (
    deleteOriginal: boolean,
    customPublicKey?: string
  ) => {
    if (!encryptingFolderId) return;

    try {
      const result = await encryptFolder(
        encryptingFolderId,
        deleteOriginal,
        customPublicKey
      );
      if (result.success) {
        router.refresh();
      } else {
        setErrorModal({
          isOpen: true,
          message: result.message,
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Folder encryption failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to encrypt folder",
        variant: "error",
      });
    }
  };

  const handleDecryptFolder = async (
    password: string,
    outputName: string,
    deleteEncrypted: boolean,
    customPrivateKey?: string
  ) => {
    if (!decryptingFolderId) return;

    try {
      const result = await decryptFolder(
        decryptingFolderId,
        password,
        outputName,
        deleteEncrypted,
        customPrivateKey
      );
      if (result.success) {
        router.refresh();
      } else {
        setErrorModal({
          isOpen: true,
          message: result.message,
          variant: "error",
        });
      }
    } catch (error) {
      console.error("Folder decryption failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to decrypt folder",
        variant: "error",
      });
    }
  };

  const handleDownloadArchive = async (paths: string[]) => {
    try {
      const response = await fetch("/api/download/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paths }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to download archive");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch
        ? decodeURIComponent(filenameMatch[1])
        : "download.zip";

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download archive failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to download archive",
        variant: "error",
      });
    }
  };

  const handleFolderDownload = (id: string) => {
    handleDownloadArchive([id]);
  };

  const handleBulkDownload = () => {
    if (totalSelected === 0) return;

    const paths = [
      ...Array.from(selectedFileIds),
      ...Array.from(selectedFolderIds),
    ];

    handleDownloadArchive(paths);
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

  const handleBulkDelete = () => {
    if (totalSelected === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (totalSelected === 0) return;

    setShowBulkDeleteConfirm(false);
    try {
      await Promise.all([
        ...Array.from(selectedFileIds).map((id) => deleteFile(id)),
        ...Array.from(selectedFolderIds).map((id) => deleteFolder(id)),
      ]);
      clearSelection();
      router.refresh();
    } catch (error) {
      console.error("Bulk delete failed:", error);
      setErrorModal({
        isOpen: true,
        message: "Failed to delete some items",
        variant: "error",
      });
    }
  };

  const handleBulkMove = () => {
    if (selectedFileIds.size === 0) return;
    setMoveFileIds(Array.from(selectedFileIds));
  };

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

  return {
    viewMode,
    allFiles,
    isLoadingMore,
    hasMore,
    currentFolderId,
    sentinelRef,
    deletingFileId,
    deletingFolderId,
    moveFileIds,
    setMoveFileIds,
    encryptingFileId,
    setEncryptingFileId,
    decryptingFileId,
    setDecryptingFileId,
    encryptingFolderId,
    setEncryptingFolderId,
    decryptingFolderId,
    setDecryptingFolderId,
    selectedFileIds,
    selectedFolderIds,
    isSelectionMode,
    setIsSelectionMode,
    isRecursive,
    totalSelected,
    confirmDeleteFileId,
    setConfirmDeleteFileId,
    confirmDeleteFolderId,
    setConfirmDeleteFolderId,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    errorModal,
    setErrorModal,
    toggleRecursive,
    handleDeleteFile,
    confirmDeleteFile,
    handleDeleteFolder,
    confirmDeleteFolder,
    handleRenameFolder,
    handleRenameFile,
    handleDownload,
    handleFileOpen,
    handleEncrypt,
    handleDecrypt,
    handleEncryptFolder,
    handleDecryptFolder,
    handleFolderDownload,
    handleBulkDownload,
    toggleFileSelection,
    toggleFolderSelection,
    selectAll,
    clearSelection,
    exitSelectionMode,
    handleBulkDelete,
    confirmBulkDelete,
    handleBulkMove,
    handleViewModeChange,
  };
}
