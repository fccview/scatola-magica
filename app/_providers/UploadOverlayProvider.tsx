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
import MultipleDropzonesOverlay from "@/app/_components/GlobalComponents/Layout/MultipleDropzonesOverlay";
import UploadProgressModal from "@/app/_components/FeatureComponents/Modals/UploadProgressModal";
import {
  readFilesFromDataTransfer,
  FileWithPath,
} from "@/app/_lib/folder-reader";
import { useFolders } from "@/app/_providers/FoldersProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

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
  const { torrentPreferences, dropzones } = usePreferences();
  const torrentsEnabled = torrentPreferences?.enabled ?? false;
  const multipleDropzonesEnabled = dropzones?.enabled ?? false;
  const [isDragging, setIsDragging] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadFilesWithPaths, setUploadFilesWithPaths] = useState<
    FileWithPath[] | null
  >(null);
  const [uploadFolderPath, setUploadFolderPath] = useState<string>("");
  const [rootFolderName, setRootFolderName] = useState<string>("");
  const [resumableUploads, setResumableUploads] = useState<Array<{
    uploadId: string;
    fileName: string;
    progress: number;
    localStorageKey: string;
  }>>([]);
  const [showResumableModal, setShowResumableModal] = useState(false);
  const isModalOpenRef = useRef(false);

  useEffect(() => {
    const loadResumableUploads = async () => {
      const { listResumableUploads } = await import("@/app/_server/actions/upload");
      const result = await listResumableUploads();

      if (result.success && result.data) {
        const uploads = result.data.uploads.map(upload => ({
          uploadId: upload.uploadId,
          fileName: upload.fileName,
          progress: upload.progress,
          localStorageKey: "",
        }));
        setResumableUploads(uploads);
        if (uploads.length === 0) {
          setShowResumableModal(false);
        }
      }
    };

    loadResumableUploads();
  }, []);

  useEffect(() => {
    if (isUploadModalOpen) {
      const interval = setInterval(async () => {
        const { listResumableUploads } = await import("@/app/_server/actions/upload");
        const result = await listResumableUploads();
        if (result.success && result.data) {
          const uploads = result.data.uploads.map(upload => ({
            uploadId: upload.uploadId,
            fileName: upload.fileName,
            progress: upload.progress,
            localStorageKey: "",
          }));
          setResumableUploads(uploads);
          if (uploads.length === 0) {
            setShowResumableModal(false);
          }
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isUploadModalOpen]);

  const handleDeleteResumableUpload = async (uploadId: string) => {
    const { deleteUploadSessionAction } = await import("@/app/_server/actions/upload");

    try {
      await deleteUploadSessionAction(uploadId);
      setResumableUploads(prev => prev.filter(u => u.uploadId !== uploadId));
    } catch (error) {
      console.error("Failed to delete upload session:", error);
    }
  };

  const openUploadWithFiles = useCallback(
    (files: FileList, folderId?: string | null) => {
      setUploadFiles(files);
      setUploadFolderPath(folderId || "");
      setIsUploadModalOpen(true);
    },
    []
  );

  const isAnyModalOpen = useCallback(() => {
    if (isModalOpenRef.current) return true;
    return document.querySelector(".modal-overlay") !== null;
  }, []);

  const handleDragEnter = useCallback(
    (e: DragEvent) => {
      if (isAnyModalOpen()) return;

      e.preventDefault();

      if (e.dataTransfer?.types?.includes("Files")) {
        setDragCounter((prev) => prev + 1);
        setIsDragging(true);
      }
    },
    [isAnyModalOpen]
  );

  const handleDragOver = useCallback(
    (e: DragEvent) => {
      if (isAnyModalOpen()) return;

      e.preventDefault();

      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [isAnyModalOpen]
  );

  const handleDragLeave = useCallback(
    (e: DragEvent) => {
      if (isAnyModalOpen()) return;

      e.preventDefault();

      setDragCounter((prev) => {
        const newCount = prev - 1;
        if (newCount === 0) {
          setIsDragging(false);
        }
        return newCount;
      });
    },
    [isAnyModalOpen]
  );

  const handleMultipleDropzoneDrop = useCallback(
    async (zone: "zone1" | "zone2" | "zone3" | "zone4", dataTransfer: DataTransfer) => {
      isModalOpenRef.current = true;
      setIsDragging(false);
      setDragCounter(0);

      const targetFolderPath = dropzones?.[zone] || "";

      try {
        const files = dataTransfer.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.endsWith(".torrent")) {
              if (!torrentsEnabled) {
                const fileList = createFileList([file]);
                setUploadFiles(fileList);
                setUploadFilesWithPaths(null);
                setRootFolderName("");
                setUploadFolderPath(targetFolderPath);
                setIsUploadModalOpen(true);
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                sessionStorage.setItem("pendingTorrentFile", reader.result as string);
                sessionStorage.setItem("pendingTorrentFileName", file.name);
                if (pathname === "/torrents") {
                  window.dispatchEvent(new CustomEvent("torrent-paste", { detail: { torrentFile: file.name } }));
                  router.replace("/torrents?tab=downloads&action=add");
                } else {
                  router.push("/torrents?tab=downloads&action=add");
                }
              };
              reader.readAsDataURL(file);
              return;
            }
          }
        }

        const { files: filesWithPaths, rootFolderName: folderName } =
          await readFilesFromDataTransfer(dataTransfer);

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
          setUploadFolderPath(targetFolderPath);
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
    [dropzones, torrentsEnabled, router, pathname]
  );

  const handleDrop = useCallback(
    async (e: DragEvent) => {
      if (isAnyModalOpen()) return;

      if (multipleDropzonesEnabled) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      isModalOpenRef.current = true;

      setIsDragging(false);
      setDragCounter(0);

      if (!e.dataTransfer) return;

      try {
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.name.endsWith(".torrent")) {
              if (!torrentsEnabled) {
                const fileList = createFileList([file]);
                setUploadFiles(fileList);
                setUploadFilesWithPaths(null);
                setRootFolderName("");

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

                setUploadFolderPath(currentFolderId || "");
                setIsUploadModalOpen(true);
                isModalOpenRef.current = true;
                return;
              }
              const reader = new FileReader();
              reader.onload = () => {
                sessionStorage.setItem(
                  "pendingTorrentFile",
                  reader.result as string
                );
                sessionStorage.setItem("pendingTorrentFileName", file.name);
                if (pathname === "/torrents") {
                  window.dispatchEvent(
                    new CustomEvent("torrent-paste", {
                      detail: { torrentFile: file.name },
                    })
                  );
                  router.replace("/torrents?tab=downloads&action=add");
                } else {
                  router.push("/torrents?tab=downloads&action=add");
                }
              };
              reader.readAsDataURL(file);
              return;
            }
          }
        }

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
    [pathname, router, torrentsEnabled]
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      if (isAnyModalOpen()) return;

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
            if (file.name.endsWith(".torrent")) {
              e.preventDefault();
              if (!torrentsEnabled) {
                files.push(file);
              } else {
                const reader = new FileReader();
                reader.onload = () => {
                  sessionStorage.setItem(
                    "pendingTorrentFile",
                    reader.result as string
                  );
                  sessionStorage.setItem("pendingTorrentFileName", file.name);
                  if (pathname === "/torrents") {
                    window.dispatchEvent(
                      new CustomEvent("torrent-paste", {
                        detail: { torrentFile: file.name },
                      })
                    );
                    router.replace("/torrents?tab=downloads&action=add");
                  } else {
                    router.push("/torrents?tab=downloads&action=add");
                  }
                };
                reader.readAsDataURL(file);
                return;
              }
            } else {
              files.push(file);
            }
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

            if (text.trim().startsWith("magnet:")) {
              if (!torrentsEnabled) {
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
                return;
              }

              const magnet = text.trim();
              if (pathname === "/torrents") {
                sessionStorage.setItem("pendingMagnet", magnet);
                window.dispatchEvent(
                  new CustomEvent("torrent-paste", { detail: { magnet } })
                );
                router.replace(
                  `/torrents?tab=downloads&action=add&magnet=${encodeURIComponent(
                    magnet
                  )}`
                );
              } else {
                router.push(
                  `/torrents?tab=downloads&action=add&magnet=${encodeURIComponent(
                    magnet
                  )}`
                );
              }
              isModalOpenRef.current = true;
              return;
            }

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
    [pathname, router, isAnyModalOpen, multipleDropzonesEnabled]
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
      {resumableUploads.length > 0 && (
        <>
          {!showResumableModal && (
            <button
              onClick={() => setShowResumableModal(true)}
              className="lg:hidden fixed top-1/2 -translate-y-1/2 right-0 z-[9999] bg-primary hover:bg-primary/90 text-on-primary p-3 transition-all"
            >
              <div className="relative">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                <span className="absolute -top-1 -left-1 bg-error text-on-error text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {resumableUploads.length}
                </span>
              </div>
            </button>
          )}

          <div className={`fixed z-[9999] bg-surface text-on-surface rounded-lg bottom-4 left-4 max-w-md w-auto min-w-[320px] ${showResumableModal ? 'block' : 'hidden'} lg:block`}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-dashed border-outline-variant">
              <div className="font-semibold text-sm">Interrupted Uploads</div>
              <button
                onClick={() => setShowResumableModal(false)}
                className="lg:hidden text-on-surface-variant hover:text-on-surface"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-3 space-y-2">
              {resumableUploads.map((upload) => (
                <div key={upload.uploadId} className="flex items-center justify-between gap-3 p-3 bg-sidebar rounded-lg transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{upload.fileName}</div>
                    <div className="text-xs text-on-surface-variant mt-1">
                      {upload.progress.toFixed(1)}% · Drag file to resume
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteResumableUpload(upload.uploadId)}
                    className="px-3 py-1.5 bg-error hover:bg-error/90 text-on-error rounded-lg text-xs font-medium transition-colors"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!isUploadModalOpen && (
        <>
          {multipleDropzonesEnabled ? (
            <MultipleDropzonesOverlay
              isVisible={isDragging}
              dropzones={dropzones || {}}
              onDrop={handleMultipleDropzoneDrop}
            />
          ) : (
            <DragOverlay isVisible={isDragging} targetFolderName={null} />
          )}
        </>
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
