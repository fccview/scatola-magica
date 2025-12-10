"use client";

import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface ConfirmBulkDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemCount: number;
  onConfirm: () => void;
}

export default function ConfirmBulkDeleteModal({
  isOpen,
  onClose,
  itemCount,
  onConfirm,
}: ConfirmBulkDeleteModalProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Items" size="sm">
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
              Are you sure you want to delete {itemCount} item
              {itemCount !== 1 ? "s" : ""}?
            </p>
            <p className="text-sm text-on-surface-variant mt-2">
              This action cannot be undone. All selected items will be
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
