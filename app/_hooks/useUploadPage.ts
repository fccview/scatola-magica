import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ChunkedUploader,
  E2EEncryptionOptions,
} from "@/app/_lib/chunked-uploader";
import { UploadStatus } from "@/app/_types/enums";
import { UploadProgress } from "@/app/_types";
import {
  FileWithPath,
  extractFolderPaths,
  readFilesFromDataTransfer,
} from "@/app/_lib/folder-reader";
import { createFolder } from "@/app/_server/actions/folders";

interface UploadingFile {
  id: string;
  file: File;
  relativePath?: string;
  progress: UploadProgress | null;
  uploader: ChunkedUploader | null;
  status: UploadStatus;
  fileId?: string;
  folderPath?: string;
  isResumed?: boolean;
}

const ACTIVE_UPLOADS_KEY = "scatola-active-uploads";

export const useUploadPage = () => {
  const router = useRouter();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [resumableUploads, setResumableUploads] = useState<Map<string, any>>(new Map());
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");
  const [e2eEncryption, setE2eEncryption] = useState<
    E2EEncryptionOptions | undefined
  >(undefined);

  useEffect(() => {
    const loadResumableUploads = async () => {
      const { listResumableUploads } = await import("@/app/_server/actions/upload");
      const result = await listResumableUploads();

      if (result.success && result.data) {
        const resumable = new Map();
        for (const upload of result.data.uploads) {
          const fileKey = `${upload.fileName}-${upload.fileSize}`;
          resumable.set(fileKey, {
            uploadId: upload.uploadId,
            fileName: upload.fileName,
            fileSize: upload.fileSize,
            progress: upload.progress,
            uploadedChunks: [],
          });
        }
        setResumableUploads(resumable);
      }
    };

    loadResumableUploads();
  }, []);

  useEffect(() => {
    const hasActiveUploads = files.some(
      (f) => f.status === UploadStatus.UPLOADING
    );

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

  const uploadFile = async (
    fileToUpload: UploadingFile,
    targetFolderPath?: string,
    encryption?: E2EEncryptionOptions,
    existingUploadId?: string,
    uploadedChunks?: number[]
  ) => {
    try {
      const uploader = new ChunkedUploader(
        fileToUpload.file,
        existingUploadId,
        uploadedChunks,
        targetFolderPath || undefined,
        encryption || e2eEncryption
      );

      const uploadIdKey = `upload-${fileToUpload.file.name}-${fileToUpload.file.size}`;

      if (!existingUploadId) {
        localStorage.setItem(uploadIdKey, uploader.getUploadId());
      }

      uploader.onProgress((progress) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileToUpload.id
              ? { ...f, progress, status: UploadStatus.UPLOADING, uploader }
              : f
          )
        );
      });

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? { ...f, status: UploadStatus.UPLOADING, uploader }
            : f
        )
      );

      const fileId = await uploader.upload();

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? {
              ...f,
              progress: f.progress ? { ...f.progress, progress: 100 } : null,
              status: UploadStatus.COMPLETED,
              fileId: fileId,
              folderPath: targetFolderPath || selectedFolderPath,
            }
            : f
        )
      );

      localStorage.removeItem(uploadIdKey);
    } catch (error) {
      console.error("Upload failed:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id ? { ...f, status: UploadStatus.FAILED } : f
        )
      );
    }
  };

  const handleFileSelect = useCallback(
    (
    selectedFiles: FileList | null,
      targetFolderPath?: string,
      encryption?: E2EEncryptionOptions
  ) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const folderPath =
      targetFolderPath !== undefined ? targetFolderPath : selectedFolderPath;

    const filesArray = Array.from(selectedFiles);

    const newFiles: UploadingFile[] = filesArray.map((file, index) => {
      const fileKey = `${file.name}-${file.size}`;
      const resumable = resumableUploads.get(fileKey);

      if (resumable) {
        console.log(`Resuming upload for ${file.name} from ${resumable.progress}%`);
        return {
          id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2)}`,
          file,
          progress: null,
          uploader: null,
          status: UploadStatus.PENDING,
          isResumed: true,
        };
      }

      return {
        id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2)}`,
        file,
        progress: null,
        uploader: null,
        status: UploadStatus.PENDING,
        isResumed: false,
      };
    });

    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      return updated;
    });

    for (const f of newFiles) {
      const fileKey = `${f.file.name}-${f.file.size}`;
      const resumable = resumableUploads.get(fileKey);

      const uploadEncryption = encryption || e2eEncryption;

      if (resumable) {
        uploadFile(
          f,
          folderPath || undefined,
          uploadEncryption,
          resumable.uploadId,
          resumable.uploadedChunks
        ).catch((error) => {
          console.error(`Upload failed for ${f.file.name}:`, error);
        });
        resumableUploads.delete(fileKey);
        localStorage.removeItem(resumable.localStorageKey);
      } else {
        uploadFile(f, folderPath || undefined, uploadEncryption).catch((error) => {
          console.error(`Upload failed for ${f.file.name}:`, error);
        });
      }
    }
    },
    [selectedFolderPath, e2eEncryption, resumableUploads]
  );

  const handleFilesWithPathsSelect = async (
    filesWithPaths: FileWithPath[],
    rootFolderName: string,
    targetFolderPath?: string
  ) => {
    if (!filesWithPaths || filesWithPaths.length === 0) return;

    try {
      const folderPath =
        targetFolderPath !== undefined ? targetFolderPath : selectedFolderPath;
      let rootFolderPath = folderPath || "";

      if (rootFolderName) {
        const parentId = folderPath || null;
        const result = await createFolder(rootFolderName, parentId);
        if (result.success && result.data?.id) {
          rootFolderPath = result.data.id;
          router.refresh();
        } else {
          throw new Error("Failed to create root folder");
        }
      }

      const folderPaths = extractFolderPaths(filesWithPaths);
      const folderPathMap = new Map<string, string>();

      for (const subFolderPath of folderPaths) {
        const pathParts = subFolderPath.split("/");
        const folderName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join("/");
        const parentFolderId = parentPath
          ? folderPathMap.get(parentPath)
          : rootFolderPath || null;

        const result = await createFolder(folderName, parentFolderId);
        if (result.success && result.data?.id) {
          folderPathMap.set(subFolderPath, result.data.id);
        }
      }

      if (folderPaths.length > 0) {
        router.refresh();
      }

      const newFiles: UploadingFile[] = filesWithPaths.map((fileWithPath) => {
        let targetPath = rootFolderPath;
        const pathParts = fileWithPath.relativePath.split("/");
        if (pathParts.length > 1) {
          const subFolderPath = pathParts.slice(0, -1).join("/");
          targetPath = folderPathMap.get(subFolderPath) || rootFolderPath;
        }

        return {
          id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
          file: fileWithPath.file,
          relativePath: fileWithPath.relativePath,
          progress: null,
          uploader: null,
          status: UploadStatus.PENDING,
          folderPath: targetPath,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);

      newFiles.forEach((f) => {
        const uploadEncryption = e2eEncryption;
        uploadFile(f, f.folderPath || undefined, uploadEncryption);
      });
    } catch (error) {
      console.error("Failed to create folder structure:", error);
    }
  };

  const cancelUpload = (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.uploader) {
      file.uploader.cancel();
    }
    setFiles((prev) =>
      prev.map((f) =>
        f.id === id ? { ...f, status: UploadStatus.CANCELLED } : f
      )
    );
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

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
      console.error("Error processing dropped files:", error);
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
    handleFileSelect,
    handleFilesWithPathsSelect,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    cancelUpload,
    removeFile,
  };
};
