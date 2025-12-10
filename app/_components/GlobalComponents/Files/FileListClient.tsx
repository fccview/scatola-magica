"use client";

import { FileMetadata, User } from "@/app/_types";
import { FileViewMode, SortBy } from "@/app/_types/enums";
import { type FolderMetadata } from "@/app/_server/actions/folders";
import FileCard from "@/app/_components/GlobalComponents/Cards/FileCard";
import FileListSelectionBar from "@/app/_components/GlobalComponents/Files/FileListSelectionBar";
import FileListToolbar from "@/app/_components/GlobalComponents/Files/FileListToolbar";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import MoveFileDialog from "@/app/_components/FeatureComponents/FilesPage/MoveFileDialog";
import EncryptFileModal from "@/app/_components/FeatureComponents/Modals/EncryptFileModal";
import DecryptFileModal from "@/app/_components/FeatureComponents/Modals/DecryptFileModal";
import ConfirmDeleteFileModal from "@/app/_components/FeatureComponents/Modals/ConfirmDeleteFileModal";
import ConfirmDeleteFolderModal from "@/app/_components/FeatureComponents/Modals/ConfirmDeleteFolderModal";
import ConfirmBulkDeleteModal from "@/app/_components/FeatureComponents/Modals/ConfirmBulkDeleteModal";
import ErrorModal from "@/app/_components/FeatureComponents/Modals/ErrorModal";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import { useFileList } from "@/app/_hooks/useFileList";

interface FileListClientProps {
  files: FileMetadata[];
  folders?: FolderMetadata[];
  initialRecursive: boolean;
  folderPath?: string;
  search?: string;
  sortBy?: SortBy;
  hasMore?: boolean;
  total?: number;
  allUsers?: User[];
}

export default function FileListClient({
  files: initialFiles,
  folders = [],
  initialRecursive,
  folderPath = "",
  search = "",
  sortBy = SortBy.DATE_DESC,
  hasMore: initialHasMore = false,
  total: initialTotal = 0,
  allUsers = [],
}: FileListClientProps) {
  const {
    viewMode,
    allFiles,
    isLoadingMore,
    currentFolderId,
    sentinelRef,
    deletingFileId,
    deletingFolderId,
    moveFileIds,
    setMoveFileIds,
    encryptingFileId,
    setEncryptingFileId,
    decryptingFileId,
    setDecryptingFileId,
    encryptingFolderId,
    setEncryptingFolderId,
    decryptingFolderId,
    setDecryptingFolderId,
    selectedFileIds,
    selectedFolderIds,
    isSelectionMode,
    setIsSelectionMode,
    isRecursive,
    totalSelected,
    confirmDeleteFileId,
    setConfirmDeleteFileId,
    confirmDeleteFolderId,
    setConfirmDeleteFolderId,
    showBulkDeleteConfirm,
    setShowBulkDeleteConfirm,
    errorModal,
    setErrorModal,
    toggleRecursive,
    handleDeleteFile,
    confirmDeleteFile,
    handleDeleteFolder,
    confirmDeleteFolder,
    handleRenameFolder,
    handleRenameFile,
    handleDownload,
    handleFileOpen,
    handleEncrypt,
    handleDecrypt,
    handleEncryptFolder,
    handleDecryptFolder,
    handleFolderDownload,
    handleBulkDownload,
    toggleFileSelection,
    toggleFolderSelection,
    selectAll,
    clearSelection,
    exitSelectionMode,
    handleBulkDelete,
    confirmBulkDelete,
    handleBulkMove,
    handleViewModeChange,
  } = useFileList({
    initialFiles,
    folders,
    initialRecursive,
    folderPath,
    search,
    sortBy,
    initialHasMore,
  });

  if (allFiles.length === 0 && folders.length === 0 && !isLoadingMore) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="folder_open"
            size="2xl"
            className="text-on-surface-variant mb-4 block"
          />
          <p className="text-xl text-on-surface-variant">No files yet</p>
          <p className="text-sm text-on-surface-variant mt-2">
            Upload your first file to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {isSelectionMode && (
        <FileListSelectionBar
          totalSelected={totalSelected}
          totalItems={allFiles.length + folders.length}
          onClear={exitSelectionMode}
          onDelete={handleBulkDelete}
          onMove={handleBulkMove}
          onDownload={handleBulkDownload}
          onSelectAll={selectAll}
        />
      )}
      {!isSelectionMode && (
        <FileListToolbar
          filesCount={initialTotal || allFiles.length}
          foldersCount={folders.length}
          isRecursive={isRecursive}
          viewMode={viewMode}
          isSelectionMode={isSelectionMode}
          onToggleRecursive={toggleRecursive}
          onEnterSelectionMode={() => setIsSelectionMode(true)}
          onSelectAll={selectAll}
          onViewModeChange={handleViewModeChange}
        />
      )}

      <div
        className={`flex-1 overflow-y-auto ${
          viewMode === FileViewMode.GRID
            ? "grid grid-cols-3 medium:grid-cols-2 expanded:grid-cols-3 large:grid-cols-4 xlarge:grid-cols-5 gap-3 content-start lg:p-2"
            : "flex flex-col gap-1"
        }`}
      >
        {!isRecursive &&
          folders.map((folder) => (
            <FileCard
              key={folder.id}
              folder={folder}
              viewMode={viewMode === FileViewMode.GRID ? "grid" : "list"}
              onDelete={handleDeleteFolder}
              onDownload={handleFolderDownload}
              onRename={handleRenameFolder}
              onEncrypt={() => setEncryptingFolderId(folder.id)}
              onDecrypt={() => setDecryptingFolderId(folder.id)}
              isSelectionMode={isSelectionMode}
              isSelected={selectedFolderIds.has(folder.id)}
              onToggleSelect={() => toggleFolderSelection(folder.id)}
              allUsers={allUsers}
              recursive={isRecursive}
            />
          ))}

        {allFiles.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            viewMode={viewMode === FileViewMode.GRID ? "grid" : "list"}
            onDelete={handleDeleteFile}
            onDownload={handleDownload}
            onMove={() => setMoveFileIds([file.id])}
            onRename={handleRenameFile}
            onOpen={handleFileOpen}
            onEncrypt={() => setEncryptingFileId(file.id)}
            onDecrypt={() => setDecryptingFileId(file.id)}
            isSelectionMode={isSelectionMode}
            isSelected={selectedFileIds.has(file.id)}
            onToggleSelect={() => toggleFileSelection(file.id)}
            recursive={isRecursive}
          />
        ))}

        {isLoadingMore && (
          <div className="col-span-full flex items-center justify-center py-8">
            <Progress variant="circular" size="md" value={50} />
          </div>
        )}

        <div
          ref={sentinelRef}
          className={
            viewMode === FileViewMode.GRID
              ? "col-span-full h-10"
              : "h-10 w-full"
          }
        />
      </div>

      {moveFileIds.length > 0 && (
        <MoveFileDialog
          fileIds={moveFileIds}
          currentFolderId={currentFolderId}
          onClose={() => {
            setMoveFileIds([]);
            clearSelection();
          }}
        />
      )}

      {encryptingFileId && (
        <EncryptFileModal
          isOpen={true}
          onClose={() => setEncryptingFileId(null)}
          fileName={
            allFiles.find((f) => f.id === encryptingFileId)?.originalName || ""
          }
          fileId={encryptingFileId}
          onEncrypt={handleEncrypt}
        />
      )}

      {decryptingFileId && (
        <DecryptFileModal
          isOpen={true}
          onClose={() => setDecryptingFileId(null)}
          fileName={
            allFiles.find((f) => f.id === decryptingFileId)?.originalName || ""
          }
          fileId={decryptingFileId}
          onDecrypt={handleDecrypt}
        />
      )}

      {encryptingFolderId && (
        <EncryptFileModal
          isOpen={true}
          onClose={() => setEncryptingFolderId(null)}
          fileName={
            folders.find((f) => f.id === encryptingFolderId)?.name || ""
          }
          fileId={encryptingFolderId}
          onEncrypt={handleEncryptFolder}
        />
      )}

      {decryptingFolderId && (
        <DecryptFileModal
          isOpen={true}
          onClose={() => setDecryptingFolderId(null)}
          fileName={
            folders.find((f) => f.id === decryptingFolderId)?.name || ""
          }
          fileId={decryptingFolderId}
          onDecrypt={handleDecryptFolder}
        />
      )}

      {confirmDeleteFileId && (
        <ConfirmDeleteFileModal
          isOpen={true}
          onClose={() => setConfirmDeleteFileId(null)}
          fileName={
            allFiles.find((f) => f.id === confirmDeleteFileId)?.originalName ||
            ""
          }
          onConfirm={confirmDeleteFile}
        />
      )}

      {confirmDeleteFolderId && (
        <ConfirmDeleteFolderModal
          isOpen={true}
          onClose={() => setConfirmDeleteFolderId(null)}
          folderName={
            folders.find((f) => f.id === confirmDeleteFolderId)?.name || ""
          }
          onConfirm={confirmDeleteFolder}
        />
      )}

      {showBulkDeleteConfirm && (
        <ConfirmBulkDeleteModal
          isOpen={true}
          onClose={() => setShowBulkDeleteConfirm(false)}
          itemCount={totalSelected}
          onConfirm={confirmBulkDelete}
        />
      )}

      <ErrorModal
        isOpen={errorModal.isOpen}
        onClose={() =>
          setErrorModal({ isOpen: false, message: "", variant: "error" })
        }
        message={errorModal.message}
        variant={errorModal.variant}
      />
    </div>
  );
}
