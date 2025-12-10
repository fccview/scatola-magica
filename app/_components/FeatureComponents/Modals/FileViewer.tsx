"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFileViewer } from "@/app/_providers/FileViewerProvider";
import { useShortcuts } from "@/app/_providers/ShortcutsProvider";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import TextEditor, {
  type TextEditorHandle,
} from "../FileManipulation/TextEditor";
import PdfViewer from "../FileManipulation/PdfViewer";
import CsvViewer from "../FileManipulation/CsvViewer";
import EncryptedFileViewer from "../FileManipulation/EncryptedFileViewer";
import DecryptFileModal from "./DecryptFileModal";
import { decryptFile } from "@/app/_server/actions/files/encryption";
import {
  TEXT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  PDF_EXTENSIONS,
  CSV_EXTENSIONS,
  MARKDOWN_EXTENSIONS,
} from "@/app/_lib/constants";

export default function FileViewer() {
  const router = useRouter();
  const { isOpen, currentFile, closeViewer } = useFileViewer();
  const { registerActions, unregisterActions } = useShortcuts();
  const [isEditing, setIsEditing] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDecryptModalOpen, setIsDecryptModalOpen] = useState(false);
  const textEditorRef = useRef<TextEditorHandle>(null);

  const handleSave = useCallback(async () => {
    await textEditorRef.current?.save();
  }, []);

  const handleCancelEdit = useCallback(() => {
    textEditorRef.current?.cancel();
  }, []);

  const handleDecrypt = async (password: string, outputName: string, deleteEncrypted: boolean, customPrivateKey?: string) => {
    if (!currentFile) return;

    try {
      const result = await decryptFile(currentFile.id, password, outputName, deleteEncrypted, customPrivateKey);
      if (result.success) {
        closeViewer();
        router.refresh();
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      throw error;
    }
  };

  const handleClose = () => {
    if (isDirty) {
      if (confirm("You have unsaved changes. Discard them?")) {
        closeViewer();
        setIsEditing(false);
        setIsDirty(false);
      }
    } else {
      closeViewer();
      setIsEditing(false);
      setIsDirty(false);
    }
  };

  useEffect(() => {
    if (isOpen && isEditing) {
      registerActions({
        onSave: handleSave,
      });
    } else {
      unregisterActions();
    }

    return () => unregisterActions();
  }, [isOpen, isEditing, handleSave, registerActions, unregisterActions]);

  if (!currentFile) return null;

  const extension = currentFile.name.split(".").pop()?.toLowerCase() || "";
  const isText = TEXT_EXTENSIONS.includes(extension);
  const isImage = IMAGE_EXTENSIONS.includes(extension);
  const isVideo = VIDEO_EXTENSIONS.includes(extension);
  const isPdf = PDF_EXTENSIONS.includes(extension);
  const isCsv = CSV_EXTENSIONS.includes(extension);
  const isMarkdown = MARKDOWN_EXTENSIONS.includes(extension);
  const isEncrypted = currentFile.name.endsWith(".gpg");

  const viewUrl = `${currentFile.url}?view=true`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title={`${currentFile.name}${isDirty ? " *" : ""}`}
        size="xl"
        headerActions={
          <>
            {isText && !isEditing && !isEncrypted && (
              <IconButton icon="edit" onClick={() => setIsEditing(true)} />
            )}
            {isEditing && !isEncrypted && (
              <>
                <IconButton
                  icon="save"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                />
                <IconButton icon="arrow_back" onClick={handleCancelEdit} />
              </>
            )}
            {!isEditing && !isEncrypted && (
              <a href={currentFile.url} download={currentFile.name}>
                <IconButton icon="download" />
              </a>
            )}
          </>
        }
      >
        <div className="p-6">
          {isEncrypted && (
            <EncryptedFileViewer
              fileName={currentFile.name}
              onDecryptClick={() => setIsDecryptModalOpen(true)}
            />
          )}

          {!isEncrypted && isText && (
            <TextEditor
              ref={textEditorRef}
              fileId={currentFile.id}
              fileName={currentFile.name}
              fileUrl={viewUrl}
              isEditing={isEditing}
              isMarkdown={isMarkdown}
              onEditingChange={setIsEditing}
              onDirtyChange={setIsDirty}
              onSavingChange={setIsSaving}
            />
          )}

          {!isEncrypted && isImage && (
            <div className="flex items-center justify-center">
              <img
                src={viewUrl}
                alt={currentFile.name}
                className="max-w-full max-h-[70vh] object-contain rounded"
              />
            </div>
          )}

          {!isEncrypted && isVideo && (
            <div className="flex items-center justify-center">
              <video
                src={viewUrl}
                controls
                className="max-w-full max-h-[70vh] rounded"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {!isEncrypted && isPdf && <PdfViewer fileUrl={viewUrl} fileName={currentFile.name} />}

          {!isEncrypted && isCsv && <CsvViewer fileUrl={viewUrl} />}

          {!isEncrypted && !isText && !isImage && !isVideo && !isPdf && !isCsv && (
            <div className="flex items-center justify-center py-12">
              <div className="text-on-surface-variant">
                This file type cannot be previewed. Please download it to view.
              </div>
            </div>
          )}
        </div>
      </Modal>

      {isEncrypted && (
        <DecryptFileModal
          isOpen={isDecryptModalOpen}
          onClose={() => setIsDecryptModalOpen(false)}
          fileName={currentFile.name}
          fileId={currentFile.id}
          onDecrypt={handleDecrypt}
        />
      )}
    </>
  );
}
