"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import UploadDropZone from "@/app/_components/FeatureComponents/UploadPage/UploadDropZone";
import UploadFileList from "@/app/_components/FeatureComponents/UploadPage/UploadFileList";
import Warning from "@/app/_components/GlobalComponents/Layout/Warning";
import E2EPasswordModal from "@/app/_components/FeatureComponents/Modals/E2EPasswordModal";
import { useUploadPage } from "@/app/_hooks/useUploadPage";
import { UploadStatus } from "@/app/_types/enums";
import { useFolders } from "@/app/_providers/FoldersProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import { getKeyStatus } from "@/app/_server/actions/pgp";
import {
  getStoredE2EPassword,
  hasStoredE2EPassword,
} from "@/app/_lib/chunk-encryption";
import E2EInfoCard from "../../GlobalComponents/Cards/E2EInfoCard";

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
  const { e2eEncryptionOnTransfer, encryptionKey } = usePreferences();
  const {
    files,
    isDragging,
    hadInterruptedUploads,
    selectedFolderPath,
    setSelectedFolderPath,
    setE2eEncryption,
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
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<FileList | null>(null);
  const [hasKeys, setHasKeys] = useState(false);
  const [keyStatusLoaded, setKeyStatusLoaded] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setKeyStatusLoaded(false);
      getKeyStatus().then((status) => {
        setHasKeys(status.hasKeys);
        setKeyStatusLoaded(true);
      });
    } else {
      setKeyStatusLoaded(false);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedFolderPath(initialFolderPath || "");
  }, [initialFolderPath, setSelectedFolderPath]);

  const shouldUseE2E = e2eEncryptionOnTransfer && hasKeys;

  const handleE2EFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return;

      if (shouldUseE2E) {
        if (encryptionKey && hasStoredE2EPassword()) {
          const storedPassword = await getStoredE2EPassword(encryptionKey);
          if (storedPassword) {
            setE2eEncryption({ enabled: true, password: storedPassword });
            handleFileSelect(selectedFiles, undefined, {
              enabled: true,
              password: storedPassword,
            });
            return;
          }
        }

        setPendingFiles(selectedFiles);
        setShowPasswordModal(true);
      } else {
        handleFileSelect(selectedFiles);
      }
    },
    [shouldUseE2E, encryptionKey, handleFileSelect, setE2eEncryption]
  );

  const handlePasswordSubmit = useCallback(
    (password: string) => {
      setE2eEncryption({ enabled: true, password });

      if (pendingFiles) {
        handleFileSelect(pendingFiles, undefined, {
          enabled: true,
          password,
        });
        setPendingFiles(null);
      }
    },
    [pendingFiles, handleFileSelect, setE2eEncryption]
  );

  const handlePasswordModalClose = useCallback(() => {
    setShowPasswordModal(false);
    setPendingFiles(null);
  }, []);

  useEffect(() => {
    if (
      isOpen &&
      keyStatusLoaded &&
      !previousIsOpen.current &&
      initialFiles &&
      initialFiles.length > 0
    ) {
      handleE2EFileSelect(initialFiles);
    }
    if (!isOpen) {
      previousIsOpen.current = false;
    } else if (keyStatusLoaded) {
      previousIsOpen.current = true;
    }
  }, [isOpen, keyStatusLoaded, initialFiles, handleE2EFileSelect]);

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
    <>
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

          <E2EInfoCard shouldUseE2E={shouldUseE2E} />

          <UploadDropZone
            isDragging={isDragging}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onFileSelect={handleE2EFileSelect}
          />

          <UploadFileList
            files={files}
            onCancel={cancelUpload}
            onRemove={removeFile}
            onClose={onClose}
          />
        </div>
      </Modal>

      <E2EPasswordModal
        isOpen={showPasswordModal}
        onClose={handlePasswordModalClose}
        onPasswordSubmit={handlePasswordSubmit}
      />
    </>
  );
};

export default UploadModal;
