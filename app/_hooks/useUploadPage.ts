import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ChunkedUploader } from "@/app/_lib/chunked-uploader";
import { UploadStatus } from "@/app/_types/enums";
import { UploadProgress } from "@/app/_types";
import {
  FileWithPath,
  extractFolderPaths,
  readFilesFromDataTransfer,
} from "@/app/_lib/folder-reader";
import { createFolder } from "@/app/actions/folders";

interface UploadingFile {
  id: string;
  file: File;
  relativePath?: string;
  progress: UploadProgress | null;
  uploader: ChunkedUploader | null;
  status: UploadStatus;
  fileId?: string;
  folderPath?: string;
}

const ACTIVE_UPLOADS_KEY = "scatola-active-uploads";

export const useUploadPage = () => {
  const router = useRouter();
  const [files, setFiles] = useState<UploadingFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [hadInterruptedUploads, setHadInterruptedUploads] = useState(false);
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>("");

  useEffect(() => {
    const hadActiveUploads =
      localStorage.getItem(ACTIVE_UPLOADS_KEY) === "true";
    if (hadActiveUploads) {
      setHadInterruptedUploads(true);
      localStorage.removeItem(ACTIVE_UPLOADS_KEY);
    }
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
      localStorage.setItem(ACTIVE_UPLOADS_KEY, "true");
      window.addEventListener("beforeunload", handleBeforeUnload);
    } else {
      localStorage.removeItem(ACTIVE_UPLOADS_KEY);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [files]);

  const uploadFile = async (
    fileToUpload: UploadingFile,
    targetFolderPath?: string
  ) => {
    console.log(`[${fileToUpload.file.name}] Starting upload function`);
    try {
      const uploader = new ChunkedUploader(
        fileToUpload.file,
        undefined,
        undefined,
        targetFolderPath || undefined
      );

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

      console.log(`[${fileToUpload.file.name}] Calling uploader.upload()`);
      const fileId = await uploader.upload();
      console.log(`[${fileToUpload.file.name}] Upload completed`);

      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id
            ? {
                ...f,
                status: UploadStatus.COMPLETED,
                fileId: fileId,
                folderPath: targetFolderPath || selectedFolderPath,
              }
            : f
        )
      );
    } catch (error) {
      console.error("Upload failed:", error);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileToUpload.id ? { ...f, status: UploadStatus.FAILED } : f
        )
      );
    }
  };

  const handleFileSelect = (
    selectedFiles: FileList | null,
    targetFolderPath?: string
  ) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    const folderPath =
      targetFolderPath !== undefined ? targetFolderPath : selectedFolderPath;

    const filesArray = Array.from(selectedFiles);
    console.log(
      "handleFileSelect called with",
      filesArray.length,
      "files:",
      filesArray.map((f) => f.name)
    );

    const newFiles: UploadingFile[] = filesArray.map((file, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(36).substring(2)}`,
      file,
      progress: null,
      uploader: null,
      status: UploadStatus.PENDING,
    }));

    console.log(
      "Created",
      newFiles.length,
      "uploading files:",
      newFiles.map((f) => f.file.name)
    );

    setFiles((prev) => {
      const updated = [...prev, ...newFiles];
      console.log("Total files in state:", updated.length);
      return updated;
    });

    for (const f of newFiles) {
      console.log(`Starting upload for:`, f.file.name);
      uploadFile(f, folderPath || undefined).catch((error) => {
        console.error(`Upload failed for ${f.file.name}:`, error);
      });
    }
  };

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

      newFiles.forEach((f) => uploadFile(f, f.folderPath || undefined));
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
    hadInterruptedUploads,
    selectedFolderPath,
    setSelectedFolderPath,
    dismissInterruptedWarning: () => setHadInterruptedUploads(false),
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
