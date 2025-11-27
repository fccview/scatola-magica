"use client";

import { useState } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import SearchBar from "@/app/_components/GlobalComponents/Form/SearchBar";
import CreateFolderModal from "@/app/_components/FeatureComponents/Modals/CreateFolderModal";

interface MobileBottomBarProps {
  onUpload: () => void;
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onToggleSidebar: () => void;
  currentFolderId?: string | null;
}

export default function MobileBottomBar({
  onUpload,
  onCreateFolder,
  onToggleSidebar,
  currentFolderId,
}: MobileBottomBarProps) {
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  if (showSearch) {
    return (
      <div className="medium:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-outline/30 p-3 z-50 safe-area-bottom">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <SearchBar />
          </div>
          <IconButton
            icon="close"
            onClick={() => setShowSearch(false)}
            size="md"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="medium:hidden fixed bottom-0 left-0 right-0 bg-surface border-t-2 border-dashed border-outline-variant safe-area-bottom z-40">
        <div className="flex items-center justify-around p-2">
          <IconButton
            icon="folder_open"
            onClick={onToggleSidebar}
            title="Folders"
            size="lg"
            className="text-on-surface"
          />
          <IconButton
            icon="search"
            onClick={() => setShowSearch(true)}
            title="Search"
            size="lg"
            className="text-on-surface"
          />
          <IconButton
            icon="create_new_folder"
            onClick={() => setIsCreateFolderModalOpen(true)}
            title="New Folder"
            size="lg"
            className="text-on-surface"
          />
          <IconButton
            icon="add"
            onClick={onUpload}
            title="Upload Files"
            size="lg"
            className="text-on-surface"
          />
        </div>
      </div>

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={onCreateFolder}
        currentFolderId={currentFolderId}
      />
    </>
  );
}
