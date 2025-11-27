"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  createFolder,
  deleteFolder,
  updateFolder,
  type FolderMetadata,
} from "@/app/actions/folders";
import { useFolders } from "@/app/_providers/FoldersProvider";
import { useUsers } from "@/app/_providers/UsersProvider";

export interface FolderWithChildren extends FolderMetadata {
  children?: FolderWithChildren[];
}

interface UseFolderTreeOptions {
  currentFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  variant?: "sidebar" | "dropdown";
}

export const useFolderTree = ({
  currentFolderId,
  onFolderSelect,
  variant = "sidebar",
}: UseFolderTreeOptions) => {
  const router = useRouter();
  const { folders: allFolders, loading, refreshFolders } = useFolders();
  const { users: allUsers } = useUsers();
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [creatingInFolder, setCreatingInFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameFolderName, setRenameFolderName] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const STORAGE_KEY = "folder-tree-expanded";

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setExpandedFolders(new Set(parsed));
        }
      }
    } catch (error) {
      console.warn("Failed to load expanded folders from localStorage:", error);
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized || typeof window === "undefined") return;

    try {
      const array = Array.from(expandedFolders);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(array));
    } catch (error) {
      console.warn("Failed to save expanded folders to localStorage:", error);
    }
  }, [expandedFolders, isInitialized]);

  useEffect(() => {
    if (!currentFolderId || !allFolders.length || !isInitialized) return;

    const folderMap = new Map<string, FolderMetadata>();
    allFolders.forEach((folder) => {
      folderMap.set(folder.id, folder);
    });

    const parentIds = new Set<string>();
    let currentId: string | null = currentFolderId;

    while (currentId) {
      const folder = folderMap.get(currentId);
      if (!folder) break;

      if (folder.parentId) {
        parentIds.add(folder.parentId);
        currentId = folder.parentId;
      } else {
        break;
      }
    }

    if (parentIds.size > 0) {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);
        parentIds.forEach((id) => newSet.add(id));
        return newSet;
      });
    }
  }, [currentFolderId, allFolders, isInitialized]);

  const folderTree = useMemo(() => {
    const folderMap = new Map<string, FolderWithChildren>();
    const rootFolders: FolderWithChildren[] = [];

    allFolders.forEach((folder) => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    allFolders.forEach((folder) => {
      const folderWithChildren = folderMap.get(folder.id)!;
      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(folderWithChildren);
        }
      } else {
        rootFolders.push(folderWithChildren);
      }
    });

    const usernames = new Set(allUsers.map((u) => u.username.toLowerCase()));

    const sortFolders = (
      folders: FolderWithChildren[]
    ): FolderWithChildren[] => {
      return folders.sort((a, b) => {
        const aIsUserFolder =
          usernames.has(a.name.toLowerCase()) ||
          a.id.split("/").some((part) => usernames.has(part.toLowerCase()));
        const bIsUserFolder =
          usernames.has(b.name.toLowerCase()) ||
          b.id.split("/").some((part) => usernames.has(part.toLowerCase()));

        if (aIsUserFolder && !bIsUserFolder) return -1;
        if (!aIsUserFolder && bIsUserFolder) return 1;

        if (aIsUserFolder && bIsUserFolder) {
          return a.name.localeCompare(b.name);
        }

        return a.name.localeCompare(b.name);
      });
    };

    const sortTree = (folders: FolderWithChildren[]): FolderWithChildren[] => {
      const sorted = sortFolders(folders);
      return sorted.map((folder) => ({
        ...folder,
        children: folder.children ? sortTree(folder.children) : undefined,
      }));
    };

    return sortTree(rootFolders);
  }, [allFolders, allUsers]);

  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return folderTree;
    const query = searchQuery.toLowerCase();
    const filterTree = (
      folders: FolderWithChildren[]
    ): FolderWithChildren[] => {
      return folders
        .filter((folder) => folder.name.toLowerCase().includes(query))
        .map((folder) => ({
          ...folder,
          children: folder.children ? filterTree(folder.children) : undefined,
        }));
    };
    return filterTree(folderTree);
  }, [folderTree, searchQuery]);

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const expandFolder = (folderId: string) => {
    if (!expandedFolders.has(folderId)) {
      setExpandedFolders((prev) => {
        const newSet = new Set(prev);
        newSet.add(folderId);
        return newSet;
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const result = await createFolder(newFolderName.trim(), creatingInFolder);
    if (result.success && result.data) {
      await refreshFolders();
      setNewFolderName("");
      setCreatingInFolder(null);
      if (creatingInFolder) {
        setExpandedFolders((prev) => new Set([...prev, creatingInFolder]));
      }
      if (onFolderSelect) {
        onFolderSelect(result.data.id);
      }
    } else {
      alert(result.error || "Failed to create folder");
    }
  };

  const handleRenameFolder = async () => {
    if (!renamingFolder || !renameFolderName.trim()) return;

    const result = await updateFolder(renamingFolder, renameFolderName.trim());
    if (result.success) {
      setRenamingFolder(null);
      setRenameFolderName("");
      await refreshFolders();
    } else {
      alert(result.error || "Failed to rename folder");
    }
  };

  const handleDeleteFolder = async (folderId: string, folderName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${folderName}"? This will also delete all files and subfolders inside it.`
      )
    ) {
      return;
    }

    const result = await deleteFolder(folderId);
    if (result.success) {
      await refreshFolders();
      if (variant === "sidebar" && currentFolderId === folderId) {
        router.push("/files");
      }
    } else {
      alert(result.error || "Failed to delete folder");
    }
  };

  const isExpanded = (folderId: string) => expandedFolders.has(folderId);
  const isActive = (folderId: string) => currentFolderId === folderId;

  const startCreatingInFolder = (folderId: string) => {
    setCreatingInFolder(folderId);
    setExpandedFolders((prev) => new Set([...prev, folderId]));
  };

  const cancelCreate = () => {
    setCreatingInFolder(null);
    setNewFolderName("");
  };

  const startRenaming = (folderId: string, currentName: string) => {
    setRenamingFolder(folderId);
    setRenameFolderName(currentName);
  };

  const cancelRename = () => {
    setRenamingFolder(null);
    setRenameFolderName("");
  };

  return {
    loading,
    filteredTree,
    searchQuery,
    setSearchQuery,
    creatingInFolder,
    setCreatingInFolder,
    newFolderName,
    setNewFolderName,
    renamingFolder,
    renameFolderName,
    setRenameFolderName,
    isExpanded,
    isActive,
    toggleFolder,
    expandFolder,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    startCreatingInFolder,
    cancelCreate,
    startRenaming,
    cancelRename,
    currentFolderId,
    allUsers,
  };
};
