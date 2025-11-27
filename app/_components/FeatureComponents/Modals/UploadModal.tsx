"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import UploadDropZone from "@/app/_components/FeatureComponents/UploadPage/UploadDropZone";
import UploadFileList from "@/app/_components/FeatureComponents/UploadPage/UploadFileList";
import Warning from "@/app/_components/GlobalComponents/Layout/Warning";
import { useUploadPage } from "@/app/_hooks/useUploadPage";
import { UploadStatus } from "@/app/_types/enums";
import { useFolders } from "@/app/_providers/FoldersProvider";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialFolderPath?: string;
  initialFiles?: FileList | null;
}

const UploadModal = ({
  isOpen,
  onClose,
  initialFolderPath = "",
  initialFiles = null,
}: UploadModalProps) => {
  const router = useRouter();
  const { refreshFolders } = useFolders();
  const {
    files,
    isDragging,
    hadInterruptedUploads,
    selectedFolderPath,
    setSelectedFolderPath,
    dismissInterruptedWarning,
    handleFileSelect,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    cancelUpload,
    removeFile,
  } = useUploadPage();
  const previousIsOpen = useRef(false);

  useEffect(() => {
    setSelectedFolderPath(initialFolderPath || "");
  }, [initialFolderPath, setSelectedFolderPath]);

  useEffect(() => {
    if (
      isOpen &&
      !previousIsOpen.current &&
      initialFiles &&
      initialFiles.length > 0
    ) {
      handleFileSelect(initialFiles);
    }
    previousIsOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    const allComplete =
      files.length > 0 &&
      files.every(
        (f) =>
          f.status === UploadStatus.COMPLETED ||
          f.status === UploadStatus.FAILED ||
          f.status === UploadStatus.CANCELLED
      );
    if (allComplete && files.length > 0) {
      const timer = setTimeout(async () => {
        if (files.some((f) => f.status === UploadStatus.COMPLETED)) {
          await refreshFolders();
          router.refresh();
          onClose();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [files, router, onClose, refreshFolders]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Upload Files" size="lg">
      <div className="p-6">
        {hadInterruptedUploads && (
          <Warning
            variant="error"
            title="Uploads Interrupted"
            message="Your uploads were interrupted by a page refresh. Please upload your files again."
            onDismiss={dismissInterruptedWarning}
          />
        )}
        <UploadDropZone
          isDragging={isDragging}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
        />

        <UploadFileList
          files={files}
          onCancel={cancelUpload}
          onRemove={removeFile}
          onClose={onClose}
        />
      </div>
    </Modal>
  );
};

export default UploadModal;
