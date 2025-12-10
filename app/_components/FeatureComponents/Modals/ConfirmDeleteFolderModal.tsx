"use client";

import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface ConfirmDeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderName: string;
  onConfirm: () => void;
}

export default function ConfirmDeleteFolderModal({
  isOpen,
  onClose,
  folderName,
  onConfirm,
}: ConfirmDeleteFolderModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Folder" size="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-error-container flex items-center justify-center">
            <Icon
              icon="warning"
              className="text-on-error-container"
              size="lg"
            />
          </div>
          <div className="flex-1">
            <p className="text-on-surface mb-2">
              Are you sure you want to delete this folder and all its contents?
            </p>
            <p className="text-sm text-on-surface-variant font-medium">
              {folderName}
            </p>
            <p className="text-sm text-on-surface-variant mt-2">
              This action cannot be undone. All files and subfolders will be
              permanently deleted.
            </p>
          </div>
        </div>

        <div className="pt-2 flex gap-3 justify-end">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleConfirm}>
            <Icon icon="delete" size="sm" />
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
