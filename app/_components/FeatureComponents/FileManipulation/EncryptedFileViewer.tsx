"use client";

import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface EncryptedFileViewerProps {
  fileName: string;
  onDecryptClick: () => void;
}

export default function EncryptedFileViewer({
  fileName,
  onDecryptClick,
}: EncryptedFileViewerProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6">
      <div className="w-24 h-24 rounded-full bg-surface-container flex items-center justify-center">
        <Icon icon="lock" className="text-on-surface text-6xl" />
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-on-surface">
          This file is encrypted
        </h3>
      </div>
      <Button variant="filled" onClick={onDecryptClick} className="px-6">
        <Icon icon="lock_open" size="sm" />
        Decrypt File
      </Button>
    </div>
  );
}
