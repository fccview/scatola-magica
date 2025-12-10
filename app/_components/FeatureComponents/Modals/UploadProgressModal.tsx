"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import UploadFileList from "@/app/_components/FeatureComponents/UploadPage/UploadFileList";
import E2EPasswordModal from "@/app/_components/FeatureComponents/Modals/E2EPasswordModal";
import { useUploadPage } from "@/app/_hooks/useUploadPage";
import { UploadStatus } from "@/app/_types/enums";
import { FileWithPath } from "@/app/_lib/folder-reader";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import { getKeyStatus } from "@/app/_server/actions/pgp";
import {
  getStoredE2EPassword,
  hasStoredE2EPassword,
} from "@/app/_lib/chunk-encryption";
import { E2EEncryptionOptions } from "@/app/_lib/chunked-uploader";
import E2EInfoCard from "../../GlobalComponents/Cards/E2EInfoCard";

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
  const { e2eEncryptionOnTransfer, encryptionKey } = usePreferences();
  const {
    files,
    setSelectedFolderPath,
    setE2eEncryption,
    handleFileSelect,
    handleFilesWithPathsSelect,
    cancelUpload,
    removeFile,
  } = useUploadPage();
  const processedFilesRef = useRef<string>("");
  const uploadStartedRef = useRef(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const [keyStatusLoaded, setKeyStatusLoaded] = useState(false);
  const [pendingUpload, setPendingUpload] = useState<{
    type: "files" | "filesWithPaths";
    files?: FileList;
    filesWithPaths?: FileWithPath[];
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setKeyStatusLoaded(false);
      uploadStartedRef.current = false;
      getKeyStatus().then((status) => {
        setHasKeys(status.hasKeys);
        setKeyStatusLoaded(true);
      });
    } else {
      setKeyStatusLoaded(false);
      processedFilesRef.current = "";
      uploadStartedRef.current = false;
    }
  }, [isOpen]);

  const shouldUseE2E = e2eEncryptionOnTransfer && hasKeys;

  const startUploadWithFiles = useCallback(
    (encryption?: E2EEncryptionOptions) => {
      if (uploadStartedRef.current) return;
      uploadStartedRef.current = true;

      if (initialFilesWithPaths && initialFilesWithPaths.length > 0) {
        handleFilesWithPathsSelect(
          initialFilesWithPaths,
          rootFolderName,
          initialFolderPath
        );
      } else if (initialFiles && initialFiles.length > 0) {
        handleFileSelect(initialFiles, initialFolderPath, encryption);
      }
      setPendingUpload(null);
    },
    [
      initialFiles,
      initialFilesWithPaths,
      rootFolderName,
      initialFolderPath,
      handleFilesWithPathsSelect,
      handleFileSelect,
    ]
  );

  const handlePasswordSubmit = useCallback(
    (password: string) => {
      const encryption: E2EEncryptionOptions = { enabled: true, password };
      setE2eEncryption(encryption);
      setShowPasswordModal(false);
      startUploadWithFiles(encryption);
    },
    [setE2eEncryption, startUploadWithFiles]
  );

  const handlePasswordModalClose = useCallback(() => {
    setShowPasswordModal(false);
    setPendingUpload(null);
    setE2eEncryption(undefined);
    startUploadWithFiles();
  }, [setE2eEncryption, startUploadWithFiles]);

  useEffect(() => {
    if (!isOpen || !keyStatusLoaded || uploadStartedRef.current) return;

    if (initialFolderPath) {
      setSelectedFolderPath(initialFolderPath);
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

    if (!filesKey || filesKey === processedFilesRef.current) return;
    processedFilesRef.current = filesKey;

    if (shouldUseE2E) {
      if (encryptionKey && hasStoredE2EPassword()) {
        (async () => {
          const storedPassword = await getStoredE2EPassword(encryptionKey);
          if (storedPassword) {
            const encryption: E2EEncryptionOptions = {
              enabled: true,
              password: storedPassword,
            };
            setE2eEncryption(encryption);
            startUploadWithFiles(encryption);
            return;
          }

          setPendingUpload({
            type: initialFilesWithPaths ? "filesWithPaths" : "files",
            files: initialFiles || undefined,
            filesWithPaths: initialFilesWithPaths || undefined,
          });
          setShowPasswordModal(true);
        })();
      } else {
        setPendingUpload({
          type: initialFilesWithPaths ? "filesWithPaths" : "files",
          files: initialFiles || undefined,
          filesWithPaths: initialFilesWithPaths || undefined,
        });
        setShowPasswordModal(true);
      }
    } else {
      startUploadWithFiles();
    }
  }, [
    isOpen,
    keyStatusLoaded,
    initialFiles,
    initialFilesWithPaths,
    initialFolderPath,
    rootFolderName,
    setSelectedFolderPath,
    shouldUseE2E,
    encryptionKey,
    setE2eEncryption,
    startUploadWithFiles,
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
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Uploading Files"
        size="md"
      >
        <div className="p-6">
          <E2EInfoCard shouldUseE2E={shouldUseE2E} />
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
}
