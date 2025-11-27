"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import UploadFileList from "@/app/_components/FeatureComponents/UploadPage/UploadFileList";
import { useUploadPage } from "@/app/_hooks/useUploadPage";
import { UploadStatus } from "@/app/_types/enums";
import { FileWithPath } from "@/app/_lib/folder-reader";

interface UploadProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolderPath?: string;
  initialFiles?: FileList | null;
  initialFilesWithPaths?: FileWithPath[] | null;
  rootFolderName?: string;
}

export default function UploadProgressModal({
  isOpen,
  onClose,
  initialFolderPath = "",
  initialFiles = null,
  initialFilesWithPaths = null,
  rootFolderName = "",
}: UploadProgressModalProps) {
  const router = useRouter();
  const {
    files,
    setSelectedFolderPath,
    handleFileSelect,
    handleFilesWithPathsSelect,
    cancelUpload,
    removeFile,
  } = useUploadPage();
  const previousIsOpen = useRef(false);
  const processedFilesRef = useRef<string>("");

  useEffect(() => {
    if (isOpen) {
      if (!previousIsOpen.current) {
        if (initialFolderPath) {
          setSelectedFolderPath(initialFolderPath);
        }
      }

      const filesKey = initialFiles
        ? Array.from(initialFiles)
            .map((f) => `${f.name}-${f.size}-${f.lastModified}`)
            .join("|")
        : initialFilesWithPaths
        ? initialFilesWithPaths
            .map((f) => `${f.file.name}-${f.file.size}-${f.file.lastModified}`)
            .join("|")
        : "";

      if (filesKey && filesKey !== processedFilesRef.current) {
        processedFilesRef.current = filesKey;

        if (initialFilesWithPaths && initialFilesWithPaths.length > 0) {
          handleFilesWithPathsSelect(
            initialFilesWithPaths,
            rootFolderName,
            initialFolderPath
          );
        } else if (initialFiles && initialFiles.length > 0) {
          console.log(
            "Processing files:",
            initialFiles.length,
            Array.from(initialFiles).map((f) => f.name)
          );
          handleFileSelect(initialFiles, initialFolderPath);
        }
      }
    } else {
      processedFilesRef.current = "";
    }
    previousIsOpen.current = isOpen;
  }, [
    isOpen,
    initialFiles,
    initialFilesWithPaths,
    initialFolderPath,
    rootFolderName,
    handleFileSelect,
    handleFilesWithPathsSelect,
    setSelectedFolderPath,
  ]);

  const hasActiveUploads = files.some(
    (f) =>
      f.status === UploadStatus.UPLOADING || f.status === UploadStatus.PENDING
  );

  const handleClose = () => {
    if (hasActiveUploads) {
      const confirmed = window.confirm(
        "You have uploads in progress. Closing this window will cancel all active uploads. Are you sure you want to continue?"
      );
      if (!confirmed) {
        return;
      }
      files.forEach((file) => {
        if (
          file.status === UploadStatus.UPLOADING ||
          file.status === UploadStatus.PENDING
        ) {
          cancelUpload(file.id);
        }
      });
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Uploading Files"
      size="md"
    >
      <div className="p-6">
        <UploadFileList
          files={files}
          onCancel={cancelUpload}
          onRemove={removeFile}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
}
