"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface FileViewerContextValue {
  openFile: (fileId: string, fileName: string, fileUrl: string) => void;
  closeViewer: () => void;
  isOpen: boolean;
  currentFile: {
    id: string;
    name: string;
    url: string;
  } | null;
}

const FileViewerContext = createContext<FileViewerContextValue | null>(null);

export const useFileViewer = () => {
  const context = useContext(FileViewerContext);
  if (!context) {
    throw new Error("useFileViewer must be used within FileViewerProvider");
  }
  return context;
};

export default function FileViewerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<{
    id: string;
    name: string;
    url: string;
  } | null>(null);

  const openFile = useCallback((fileId: string, fileName: string, fileUrl: string) => {
    setCurrentFile({ id: fileId, name: fileName, url: fileUrl });
    setIsOpen(true);
  }, []);

  const closeViewer = useCallback(() => {
    setIsOpen(false);
    setTimeout(() => setCurrentFile(null), 200);
  }, []);

  return (
    <FileViewerContext.Provider value={{ openFile, closeViewer, isOpen, currentFile }}>
      {children}
    </FileViewerContext.Provider>
  );
}
