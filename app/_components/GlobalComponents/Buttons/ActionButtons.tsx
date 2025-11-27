"use client";

import { useState } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import CreateFolderModal from "@/app/_components/FeatureComponents/Modals/CreateFolderModal";

interface ActionButtonsProps {
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onUpload: () => void;
  parentId?: string | null;
}

export default function ActionButtons({
  onCreateFolder,
  onUpload,
  parentId = null,
}: ActionButtonsProps) {
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-6 right-6 items-center gap-2 z-30 medium:flex hidden">
        <IconButton
          icon="create_new_folder"
          onClick={() => setIsCreateFolderModalOpen(true)}
          title="New Folder"
          size="lg"
          className="bg-surface-container text-on-surface"
        />
        <IconButton
          icon="add"
          onClick={onUpload}
          title="Upload Files"
          size="lg"
          className="bg-primary text-on-primary"
        />
      </div>

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={onCreateFolder}
        currentFolderId={parentId}
      />
    </>
  );
}
