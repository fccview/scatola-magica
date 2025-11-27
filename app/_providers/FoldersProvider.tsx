"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { getAllFolders, type FolderMetadata } from "@/app/actions/folders";

interface FoldersContextValue {
  folders: FolderMetadata[];
  loading: boolean;
  refreshFolders: () => Promise<void>;
}

const FoldersContext = createContext<FoldersContextValue | null>(null);

export const useFolders = () => {
  const context = useContext(FoldersContext);
  if (!context) {
    throw new Error("useFolders must be used within FoldersProvider");
  }
  return context;
};

export default function FoldersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFolders = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const result = await getAllFolders();
    if (result.success && result.data) {
      setFolders(result.data);
    }
    if (showLoading) setLoading(false);
  }, []);

  const refreshFolders = useCallback(async () => {
    await loadFolders(false);
  }, [loadFolders]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  return (
    <FoldersContext.Provider value={{ folders, loading, refreshFolders }}>
      {children}
    </FoldersContext.Provider>
  );
}
