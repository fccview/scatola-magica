"use client";

import { useUploadPage } from "@/app/_hooks/useUploadPage";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Warning from "@/app/_components/GlobalComponents/Layout/Warning";
import UploadDropZone from "@/app/_components/FeatureComponents/UploadPage/UploadDropZone";
import UploadFileList from "@/app/_components/FeatureComponents/UploadPage/UploadFileList";
import FolderTreeSelector from "@/app/_components/FeatureComponents/UploadPage/FolderTreeSelector";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const {
    files,
    isDragging,
    hadInterruptedUploads,
    selectedFolderPath,
    setSelectedFolderPath,
    dismissInterruptedWarning,
    handleFileSelect,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    handleDrop,
    cancelUpload,
    removeFile,
  } = useUploadPage();

  return (
    <div className="min-h-screen bg-surface">
      <TopAppBar
        title="Upload Files"
        leading={
          <IconButton icon="arrow_back" onClick={() => router.push("/")} />
        }
      />

      <main className="max-w-4xl mx-auto p-2 compact:p-4">
        {hadInterruptedUploads && (
          <Warning
            variant="error"
            title="Uploads Interrupted"
            message="Your uploads were interrupted by a page refresh. Please upload your files again."
            onDismiss={dismissInterruptedWarning}
          />
        )}
        <FolderTreeSelector
          selectedFolderId={selectedFolderPath}
          onFolderChange={setSelectedFolderPath}
        />
        <UploadDropZone
          isDragging={isDragging}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onFileSelect={handleFileSelect}
        />

        <UploadFileList
          files={files}
          onCancel={cancelUpload}
          onRemove={removeFile}
        />
      </main>
    </div>
  );
}
