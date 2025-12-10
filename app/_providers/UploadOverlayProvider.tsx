"use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import DragOverlay from "@/app/_components/GlobalComponents/Layout/DragOverlay";
import UploadProgressModal from "@/app/_components/FeatureComponents/Modals/UploadProgressModal";
import {
  readFilesFromDataTransfer,
  FileWithPath,
} from "@/app/_lib/folder-reader";
import { useFolders } from "@/app/_providers/FoldersProvider";

interface UploadOverlayContextValue {
  openUploadWithFiles: (files: FileList, folderId?: string | null) => void;
  isDragging: boolean;
}

const UploadOverlayContext = createContext<UploadOverlayContextValue | null>(
  null
);

function createFileList(files: File[]): FileList {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer.files;
}

export const useUploadOverlay = () => {
  const context = useContext(UploadOverlayContext);
  if (!context) {
    throw new Error(
      "useUploadOverlay must be used within UploadOverlayProvider"
    );
  }
  return context;
};

export default function UploadOverlayProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { refreshFolders } = useFolders();
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadFilesWithPaths, setUploadFilesWithPaths] = useState<
    FileWithPath[] | null
  >(null);
  const [uploadFolderPath, setUploadFolderPath] = useState<string>("");
  const [rootFolderName, setRootFolderName] = useState<string>("");
  const isModalOpenRef = useRef(false);

  const openUploadWithFiles = useCallback(
    (files: FileList, folderId?: string | null) => {
      setUploadFiles(files);
      setUploadFolderPath(folderId || "");
      setIsUploadModalOpen(true);
    },
    []
  );

  const handleDragEnter = useCallback((e: DragEvent) => {
    if (isModalOpenRef.current) return;

    e.preventDefault();

    if (e.dataTransfer?.types?.includes("Files")) {
      setDragCounter((prev) => prev + 1);
      setIsDragging(true);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    if (isModalOpenRef.current) return;

    e.preventDefault();

    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    if (isModalOpenRef.current) return;

    e.preventDefault();

    setDragCounter((prev) => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragging(false);
      }
      return newCount;
    });
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      isModalOpenRef.current = true;

      setIsDragging(false);
      setDragCounter(0);

      if (!e.dataTransfer) return;

      try {
        let currentFolderId: string | null = null;

        if (pathname.startsWith("/files/")) {
          const pathAfterFiles = pathname.slice(7);
          if (pathAfterFiles) {
            const pathParts = pathAfterFiles.split("/").map(decodeURIComponent);
            currentFolderId = pathParts.join("/");
          }
        } else if (pathname === "/files") {
          currentFolderId = null;
        }

        const { files: filesWithPaths, rootFolderName: folderName } =
          await readFilesFromDataTransfer(e.dataTransfer);

        if (filesWithPaths.length > 0) {
          if (folderName) {
            setUploadFilesWithPaths(filesWithPaths);
            setRootFolderName(folderName);
            setUploadFiles(null);
          } else {
            const allFiles = filesWithPaths.map((f) => f.file);
            const fileList = createFileList(allFiles);
            setUploadFiles(fileList);
            setUploadFilesWithPaths(null);
            setRootFolderName("");
          }
          setUploadFolderPath(currentFolderId || "");
          setIsUploadModalOpen(true);
        } else {
          isModalOpenRef.current = false;
        }
      } catch (error) {
        console.error("Error processing dropped files:", error);
        isModalOpenRef.current = false;
        alert("Failed to process dropped files. Please try again.");
      }
    },
    [pathname, router]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (isModalOpenRef.current) return;

      const target = e.target as HTMLElement;
      const isTypingInInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isTypingInInput) return;

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const files: File[] = [];
      let hasFiles = false;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file") {
          hasFiles = true;
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (!hasFiles) {
        const textItem = Array.from(items).find(
          (item) => item.kind === "string" && item.type === "text/plain"
        );

        if (textItem) {
          e.preventDefault();

          textItem.getAsString((text) => {
            if (!text.trim()) return;

            const timestamp = new Date()
              .toISOString()
              .replace(/[:.]/g, "-")
              .slice(0, -5);
            const filename = `pasted-text-${timestamp}.txt`;
            const blob = new Blob([text], { type: "text/plain" });
            const file = new File([blob], filename, { type: "text/plain" });

            let currentFolderId: string | null = null;
            if (pathname.startsWith("/files/")) {
              const pathAfterFiles = pathname.slice(7);
              if (pathAfterFiles) {
                const pathParts = pathAfterFiles
                  .split("/")
                  .map(decodeURIComponent);
                currentFolderId = pathParts.join("/");
              }
            } else if (pathname === "/files") {
              currentFolderId = null;
            }

            const fileList = createFileList([file]);
            setUploadFiles(fileList);
            setUploadFilesWithPaths(null);
            setRootFolderName("");
            setUploadFolderPath(currentFolderId || "");
            setIsUploadModalOpen(true);
            isModalOpenRef.current = true;
          });
        }
        return;
      }

      if (files.length === 0) return;

      e.preventDefault();

      let currentFolderId: string | null = null;
      if (pathname.startsWith("/files/")) {
        const pathAfterFiles = pathname.slice(7);
        if (pathAfterFiles) {
          const pathParts = pathAfterFiles.split("/").map(decodeURIComponent);
          currentFolderId = pathParts.join("/");
        }
      } else if (pathname === "/files") {
        currentFolderId = null;
      }

      const fileList = createFileList(files);
      setUploadFiles(fileList);
      setUploadFilesWithPaths(null);
      setRootFolderName("");
      setUploadFolderPath(currentFolderId || "");
      setIsUploadModalOpen(true);
      isModalOpenRef.current = true;
    },
    [pathname]
  );

  useEffect(() => {
    window.addEventListener("dragenter", handleDragEnter, true);
    window.addEventListener("dragover", handleDragOver, true);
    window.addEventListener("dragleave", handleDragLeave, true);
    window.addEventListener("drop", handleDrop, true);
    window.addEventListener("paste", handlePaste, true);

    return () => {
      window.removeEventListener("dragenter", handleDragEnter, true);
      window.removeEventListener("dragover", handleDragOver, true);
      window.removeEventListener("dragleave", handleDragLeave, true);
      window.removeEventListener("drop", handleDrop, true);
      window.removeEventListener("paste", handlePaste, true);
    };
  }, [
    handleDragEnter,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
  ]);

  useEffect(() => {
    const handleMouseUp = () => {
      if (dragCounter > 0) {
        setDragCounter(0);
        setIsDragging(false);
      }
    };

    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, [dragCounter]);

  return (
    <UploadOverlayContext.Provider value={{ openUploadWithFiles, isDragging }}>
      {!isUploadModalOpen && (
        <DragOverlay isVisible={isDragging} targetFolderName={null} />
      )}

      <UploadProgressModal
        isOpen={isUploadModalOpen}
        onClose={async () => {
          isModalOpenRef.current = false;
          setIsUploadModalOpen(false);
          setUploadFiles(null);
          setUploadFilesWithPaths(null);
          setRootFolderName("");
          setUploadFolderPath("");
          await refreshFolders();
          router.refresh();
        }}
        initialFolderPath={uploadFolderPath}
        initialFiles={uploadFiles}
        initialFilesWithPaths={uploadFilesWithPaths}
        rootFolderName={rootFolderName}
      />

      {children}
    </UploadOverlayContext.Provider>
  );
}
