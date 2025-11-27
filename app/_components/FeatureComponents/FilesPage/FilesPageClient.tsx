"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDragAndDrop } from "@/app/_hooks/useDragAndDrop";
import UploadModal from "@/app/_components/FeatureComponents/Modals/UploadModal";
import UploadProgressModal from "@/app/_components/FeatureComponents/Modals/UploadProgressModal";
import CreateFolderModal from "@/app/_components/FeatureComponents/Modals/CreateFolderModal";
import { createFolder } from "@/app/actions/folders";
import ActionButtons from "@/app/_components/GlobalComponents/Buttons/ActionButtons";
import MobileBottomBar from "@/app/_components/FeatureComponents/FilesPage/MobileBottomBar";
import { useFolders } from "@/app/_providers/FoldersProvider";
import { useSidebar } from "@/app/_providers/SidebarProvider";
import { useShortcuts } from "@/app/_providers/ShortcutsProvider";

interface FilesPageClientProps {
  currentFolderId?: string | null;
  children: React.ReactNode;
}

const FilesPageClient = ({
  currentFolderId,
  children,
}: FilesPageClientProps) => {
  const router = useRouter();
  const { refreshFolders } = useFolders();
  const { registerActions } = useShortcuts();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [uploadFolderPath, setUploadFolderPath] = useState<string>(
    currentFolderId || ""
  );
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const { toggleSidebar } = useSidebar();

  useEffect(() => {
    setUploadFolderPath(currentFolderId || "");
  }, [currentFolderId]);

  const { handleDragOver, handleDragEnter, handleDragLeave, handleDrop } =
    useDragAndDrop({
      onDrop: (files, targetFolder) => {
        setUploadFolderPath(targetFolder || currentFolderId || "");
        setUploadFiles(files);
        setIsProgressModalOpen(true);
      },
      detectFolder: true,
      currentFolderId,
    });

  const handleOpenUpload = () => {
    setUploadFolderPath(currentFolderId || "");
    setUploadFiles(null);
    setIsUploadModalOpen(true);
  };

  const handleCreateFolder = async (name: string, parentId?: string | null) => {
    const result = await createFolder(name, parentId || null);
    if (result.success) {
      router.refresh();
    } else {
      alert(result.error || "Failed to create folder");
      throw new Error(result.error || "Failed to create folder");
    }
  };

  useEffect(() => {
    registerActions({
      onUpload: () => {
        setUploadFolderPath(currentFolderId || "");
        setUploadFiles(null);
        setIsUploadModalOpen(true);
      },
      onCreateFolder: () => setIsCreateFolderModalOpen(true),
    });
  }, [registerActions, currentFolderId]);

  return (
    <>
      <div
        className="relative h-full flex flex-col"
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div
          data-current-folder={currentFolderId || "root"}
          className="flex-1 flex flex-col min-h-0"
        >
          {children}
        </div>
      </div>

      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => {
          setIsUploadModalOpen(false);
          setUploadFiles(null);
        }}
        initialFolderPath={uploadFolderPath}
        initialFiles={null}
      />

      <UploadProgressModal
        isOpen={isProgressModalOpen}
        onClose={async () => {
          setIsProgressModalOpen(false);
          setUploadFiles(null);
          await refreshFolders();
          router.refresh();
        }}
        initialFolderPath={uploadFolderPath}
        initialFiles={uploadFiles}
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={handleCreateFolder}
        currentFolderId={currentFolderId || null}
      />

      <ActionButtons
        onCreateFolder={handleCreateFolder}
        onUpload={handleOpenUpload}
        parentId={currentFolderId || null}
      />

      <MobileBottomBar
        onCreateFolder={handleCreateFolder}
        onUpload={handleOpenUpload}
        onToggleSidebar={toggleSidebar}
        currentFolderId={currentFolderId || null}
      />
    </>
  );
};

export default FilesPageClient;
