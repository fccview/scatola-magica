import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ChunkedUploader,
  E2EEncryptionOptions,
  isAbortError,
} from "@/app/_lib/chunked-uploader";
import { UploadStatus } from "@/app/_types/enums";
import {
  ResumeInfo,
  UploadStructure,
  UploadingFile,
} from "@/app/_types/upload";
import {
  FileWithPath,
  extractFolderPaths,
  readFilesFromDataTransfer,
} from "@/app/_lib/folder-reader";
import { createFolder } from "@/app/_server/actions/folders";
import { getAppSettings } from "@/app/_lib/app-settings";
import { UPLOAD_QUEUE } from "@/app/_lib/constants";
import { isSettled } from "@/app/_lib/upload-tally";
import { logger } from "@/app/_lib/logger";

const SCOPE = "upload-queue";

type AppSettings = Awaited<ReturnType<typeof getAppSettings>>;

interface ResumableUpload extends ResumeInfo {
  fileName: string;
  fileSize: number;
  progress: number;
}

const _fileKey = (file: File): string => `${file.name}-${file.size}`;

const _storageKey = (file: File): string =>
  `upload-${file.name}-${file.size}`;

const _newId = (): string =>
  `${Date.now()}-${Math.random().toString(36).substring(2)}`;

const _errorText = (error: unknown): string =>
  error instanceof Error ? error.message : "Something went wrong";

export const useUploadPage = () => {
  const router = useRouter();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [resumableUploads, setResumableUploads] = useState<
    Map<string, ResumableUpload>
  >(new Map());
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [e2eEncryption, setE2eEncryption] = useState<
    E2EEncryptionOptions | undefined
  >(undefined);
  const [structure, setStructure] = useState<UploadStructure | null>(null);
  const uploadersRef = useRef(new Map<string, ChunkedUploader>());
  const startedRef = useRef(new Set<string>());
  const settingsRef = useRef<Promise<AppSettings> | null>(null);

  useEffect(() => {
    const loadResumableUploads = async () => {
      try {
        const { listResumableUploads } = await import(
          "@/app/_server/actions/upload"
        );
        const result = await listResumableUploads();
        if (!result.success || !result.data) return;

        const resumable = new Map<string, ResumableUpload>();
        for (const upload of result.data.uploads) {
          resumable.set(`${upload.fileName}-${upload.fileSize}`, {
            uploadId: upload.uploadId,
            uploadedChunks: [],
            fileName: upload.fileName,
            fileSize: upload.fileSize,
            progress: upload.progress,
          });
        }
        setResumableUploads(resumable);
      } catch (error) {
        logger.error(SCOPE, "Failed to load resumable uploads", error);
      }
    };

    loadResumableUploads();
  }, []);

  useEffect(() => {
    const hasActiveUploads = files.some((f) => !isSettled(f.status));

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    if (hasActiveUploads) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [files]);

  const patchFile = useCallback(
    (id: string, patch: (file: UploadingFile) => UploadingFile) => {
      setFiles((prev) => prev.map((f) => (f.id === id ? patch(f) : f)));
    },
    []
  );

  const loadSettings = useCallback((): Promise<AppSettings> => {
    if (!settingsRef.current) {
      settingsRef.current = getAppSettings().catch((error) => {
        settingsRef.current = null;
        throw error;
      });
    }
    return settingsRef.current;
  }, []);

  const runUpload = useCallback(
    async (entry: UploadingFile) => {
      const storageKey = _storageKey(entry.file);

      try {
        const appSettings = await loadSettings();
        const uploader = new ChunkedUploader(
          entry.file,
          entry.resume?.uploadId,
          entry.resume?.uploadedChunks,
          entry.folderPath || undefined,
          entry.encryption,
          appSettings.upload
        );
        uploadersRef.current.set(entry.id, uploader);

        if (!entry.resume) {
          localStorage.setItem(storageKey, uploader.getUploadId());
        }

        uploader.onProgress((progress) => {
          patchFile(entry.id, (f) =>
            f.status === UploadStatus.CANCELLED
              ? f
              : { ...f, progress, status: UploadStatus.UPLOADING }
          );
        });

        const fileId = await uploader.upload();

        patchFile(entry.id, (f) => ({
          ...f,
          progress: f.progress ? { ...f.progress, progress: 100 } : null,
          status: UploadStatus.COMPLETED,
          fileId,
        }));
        localStorage.removeItem(storageKey);
      } catch (error) {
        if (isAbortError(error)) {
          logger.info(SCOPE, `Upload of ${entry.file.name} was cancelled`);
        } else {
          logger.error(SCOPE, `Upload failed for ${entry.file.name}`, error);
        }

        patchFile(entry.id, (f) =>
          f.status === UploadStatus.CANCELLED
            ? f
            : { ...f, status: UploadStatus.FAILED, error: _errorText(error) }
        );
      } finally {
        uploadersRef.current.delete(entry.id);
      }
    },
    [loadSettings, patchFile]
  );

  useEffect(() => {
    const started = startedRef.current;
    const running = files.filter(
      (f) => started.has(f.id) && !isSettled(f.status)
    ).length;
    const slots = UPLOAD_QUEUE.MAX_PARALLEL_FILES - running;
    if (slots <= 0) return;

    files
      .filter((f) => f.status === UploadStatus.PENDING && !started.has(f.id))
      .slice(0, slots)
      .forEach((f) => {
        started.add(f.id);
        runUpload(f);
      });
  }, [files, runUpload]);

  const enqueue = useCallback((entries: UploadingFile[]) => {
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const handleFileSelect = useCallback(
    (
      selectedFiles: FileList | null,
      targetFolderPath?: string,
      encryption?: E2EEncryptionOptions
    ) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      const folderPath =
        targetFolderPath !== undefined ? targetFolderPath : selectedFolderPath;
      const uploadEncryption = encryption || e2eEncryption;

      const entries: UploadingFile[] = Array.from(selectedFiles).map(
        (file) => {
          const resumable = resumableUploads.get(_fileKey(file));
          if (resumable) {
            logger.info(
              SCOPE,
              `Resuming upload for ${file.name} from ${resumable.progress}%`
            );
            resumableUploads.delete(_fileKey(file));
          }

          return {
            id: _newId(),
            file,
            progress: null,
            status: UploadStatus.PENDING,
            folderPath: folderPath || undefined,
            encryption: uploadEncryption,
            isResumed: !!resumable,
            resume: resumable
              ? {
                  uploadId: resumable.uploadId,
                  uploadedChunks: resumable.uploadedChunks,
                }
              : undefined,
          };
        }
      );

      enqueue(entries);
    },
    [selectedFolderPath, e2eEncryption, resumableUploads, enqueue]
  );

  const buildFolders = async (
    filesWithPaths: FileWithPath[],
    rootFolderName: string,
    folderPath: string
  ): Promise<{ root: string; map: Map<string, string> }> => {
    const folderPaths = extractFolderPaths(filesWithPaths);
    const total = folderPaths.length + (rootFolderName ? 1 : 0);
    const map = new Map<string, string>();
    let created = 0;
    let root = folderPath;

    setStructure({ created, total, fileCount: filesWithPaths.length });

    if (rootFolderName) {
      const result = await createFolder(rootFolderName, folderPath || null);
      if (!result.success || !result.data?.id) {
        throw new Error(`Couldn't create folder "${rootFolderName}"`);
      }
      root = result.data.id;
      created++;
      setStructure({ created, total, fileCount: filesWithPaths.length });
    }

    for (const subFolderPath of folderPaths) {
      const pathParts = subFolderPath.split("/");
      const folderName = pathParts[pathParts.length - 1];
      const parentPath = pathParts.slice(0, -1).join("/");
      const parentFolderId = parentPath
        ? map.get(parentPath)
        : root || null;

      const result = await createFolder(folderName, parentFolderId);
      if (result.success && result.data?.id) {
        map.set(subFolderPath, result.data.id);
      } else {
        logger.warn(SCOPE, `Couldn't create folder ${subFolderPath}`);
      }
      created++;
      setStructure({ created, total, fileCount: filesWithPaths.length });
    }

    return { root, map };
  };

  const handleFilesWithPathsSelect = async (
    filesWithPaths: FileWithPath[],
    rootFolderName: string,
    targetFolderPath?: string,
    encryption?: E2EEncryptionOptions
  ) => {
    if (!filesWithPaths || filesWithPaths.length === 0) return;

    const folderPath =
      targetFolderPath !== undefined ? targetFolderPath : selectedFolderPath;

    try {
      const { root, map } = await buildFolders(
        filesWithPaths,
        rootFolderName,
        folderPath || ""
      );
      router.refresh();

      const entries: UploadingFile[] = filesWithPaths.map((fileWithPath) => {
        const pathParts = fileWithPath.relativePath.split("/");
        const subFolderPath = pathParts.slice(0, -1).join("/");
        const targetPath =
          pathParts.length > 1 ? map.get(subFolderPath) || root : root;

        return {
          id: _newId(),
          file: fileWithPath.file,
          relativePath: fileWithPath.relativePath,
          progress: null,
          status: UploadStatus.PENDING,
          folderPath: targetPath || undefined,
          encryption: encryption || e2eEncryption,
        };
      });

      setStructure(null);
      enqueue(entries);
    } catch (error) {
      logger.error(SCOPE, "Failed to create folder structure", error);
      setStructure((prev) => ({
        created: prev?.created ?? 0,
        total: prev?.total ?? 0,
        fileCount: filesWithPaths.length,
        error: _errorText(error),
      }));
    }
  };

  const cancelUpload = (id: string) => {
    patchFile(id, (f) =>
      isSettled(f.status) ? f : { ...f, status: UploadStatus.CANCELLED }
    );
    uploadersRef.current.get(id)?.cancel();
  };

  const cancelAll = () => {
    setFiles((prev) =>
      prev.map((f) =>
        isSettled(f.status) ? f : { ...f, status: UploadStatus.CANCELLED }
      )
    );
    uploadersRef.current.forEach((uploader) => uploader.cancel());
  };

  const retryUpload = (id: string) => {
    startedRef.current.delete(id);
    patchFile(id, (f) => ({
      ...f,
      status: UploadStatus.PENDING,
      progress: null,
      error: undefined,
    }));
  };

  const retryFailed = () => {
    files
      .filter((f) => f.status === UploadStatus.FAILED)
      .forEach((f) => retryUpload(f.id));
  };

  const removeFile = (id: string) => {
    startedRef.current.delete(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const dismissStructure = () => setStructure(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
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
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!e.dataTransfer) return;

    try {
      const { files: filesWithPaths, rootFolderName } =
        await readFilesFromDataTransfer(e.dataTransfer);

      if (filesWithPaths.length > 0 && rootFolderName) {
        await handleFilesWithPathsSelect(
          filesWithPaths,
          rootFolderName,
          selectedFolderPath
        );
      } else {
        handleFileSelect(e.dataTransfer.files);
      }
    } catch (error) {
      logger.error(SCOPE, "Error processing dropped files", error);
      handleFileSelect(e.dataTransfer.files);
    }
  };

  return {
    files,
    isDragging,
    resumableUploads,
    selectedFolderPath,
    setSelectedFolderPath,
    e2eEncryption,
    setE2eEncryption,
    structure,
    dismissStructure,
    handleFileSelect,
    handleFilesWithPathsSelect,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    cancelUpload,
    cancelAll,
    retryUpload,
    retryFailed,
    removeFile,
  };
};
