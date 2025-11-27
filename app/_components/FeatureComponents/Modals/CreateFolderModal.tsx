"use client";

import { useState } from "react";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Input from "@/app/_components/GlobalComponents/Form/Input";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  currentFolderId?: string | null;
}

export default function CreateFolderModal({
  isOpen,
  onClose,
  onCreateFolder,
  currentFolderId,
}: CreateFolderModalProps) {
  const [folderName, setFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim() || isCreating) return;

    setIsCreating(true);
    try {
      await onCreateFolder(folderName.trim(), currentFolderId);
      setFolderName("");
      onClose();
    } catch (error) {
      console.error("Failed to create folder:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setFolderName("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Folder"
      size="md"
    >
      <div className="p-6 space-y-6 flex flex-col">
        <div className="flex-shrink-0">
          <Input
            label="Folder Name"
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Enter folder name..."
            onKeyDown={(e) => {
              if (e.key === "Enter" && folderName.trim() && !isCreating) {
                handleCreate();
              } else if (e.key === "Escape") {
                handleClose();
              }
            }}
            autoFocus
            disabled={isCreating}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 flex-shrink-0">
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={isCreating}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            onClick={handleCreate}
            disabled={!folderName.trim() || isCreating}
            className="px-6"
          >
            {isCreating ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Icon icon="check" size="sm" />
                Create Folder
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
