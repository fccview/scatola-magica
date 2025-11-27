import { UploadProgress } from "@/app/_types";
import { UploadStatus } from "@/app/_types/enums";
import { formatBytes, formatDuration } from "@/app/_lib/file-utils";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import PreparingUploadMessage from "@/app/_components/FeatureComponents/UploadPage/PreparingUploadMessage";

interface UploadingFile {
  id: string;
  file: File;
  relativePath?: string;
  progress: UploadProgress | null;
  uploader: any;
  status: UploadStatus;
  fileId?: string;
  folderId?: string | null;
}

interface UploadFileListProps {
  files: UploadingFile[];
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onClose?: () => void;
}

export default function UploadFileList({
  files,
  onCancel,
  onRemove,
  onClose,
}: UploadFileListProps) {
  if (files.length === 0) return null;

  const totalFiles = files.length;
  const completedFiles = files.filter(
    (f) => f.status === UploadStatus.COMPLETED
  ).length;
  const failedFiles = files.filter(
    (f) => f.status === UploadStatus.FAILED
  ).length;
  const uploadingFiles = files.filter(
    (f) => f.status === UploadStatus.UPLOADING
  );
  const pendingFiles = files.filter(
    (f) => f.status === UploadStatus.PENDING
  ).length;

  const uploadingProgress = uploadingFiles.reduce((sum, f) => {
    return sum + (f.progress?.progress || 0);
  }, 0);
  const completedProgress = completedFiles * 100;
  const overallProgress = (completedProgress + uploadingProgress) / totalFiles;
  const hasActiveUploads = uploadingFiles.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-on-surface">
            {hasActiveUploads
              ? `Uploading ${
                  completedFiles + uploadingFiles.length
                } of ${totalFiles}`
              : failedFiles > 0
              ? "Upload Complete with Errors"
              : "Upload Complete"}
          </h3>
          {hasActiveUploads && (
            <span className="text-sm text-on-surface-variant">
              {completedFiles + uploadingFiles.length} / {totalFiles} files
            </span>
          )}
        </div>

        <div className="space-y-2">
          <Progress value={overallProgress} />
          <div className="flex justify-between text-xs text-on-surface-variant">
            <span>{Math.round(overallProgress)}% complete</span>
            {failedFiles > 0 && (
              <span className="text-error">{failedFiles} failed</span>
            )}
          </div>
        </div>

        {uploadingFiles.length > 0 && (
          <div className="space-y-2">
            {uploadingFiles.map((currentFile) => (
              <div
                key={currentFile.id}
                className="bg-surface-container-high rounded-lg p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">
                      {currentFile.relativePath || currentFile.file.name}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {formatBytes(currentFile.file.size)}
                      {currentFile.progress &&
                        currentFile.progress.speed > 0 && (
                          <>
                            {" • "}
                            {formatBytes(currentFile.progress.speed)}/s
                            {" • "}
                            {formatDuration(
                              currentFile.progress.remainingTime
                            )}{" "}
                            remaining
                          </>
                        )}
                    </p>
                  </div>
                  <IconButton
                    icon="close"
                    size="sm"
                    onClick={() => onCancel(currentFile.id)}
                  />
                </div>

                {!currentFile.progress ||
                (currentFile.progress.chunksCompleted === 0 &&
                  currentFile.progress.speed === 0) ? (
                  <PreparingUploadMessage />
                ) : (
                  <div className="space-y-1">
                    <Progress value={currentFile.progress.progress} size="sm" />
                    <div className="flex justify-between text-xs text-on-surface-variant">
                      <span>
                        {currentFile.progress.chunksCompleted} /{" "}
                        {currentFile.progress.totalChunks} chunks
                      </span>
                      <span>{Math.round(currentFile.progress.progress)}%</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {completedFiles + failedFiles > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-on-surface-variant">
            {completedFiles > 0 ? "Completed Files" : "Failed Files"}
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2 scrollbar-thin">
            {files
              .filter(
                (f) =>
                  f.status === UploadStatus.COMPLETED ||
                  f.status === UploadStatus.FAILED ||
                  f.status === UploadStatus.CANCELLED
              )
              .map((file) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors"
                >
                  <span
                    className={`material-symbols-outlined text-xl ${
                      file.status === UploadStatus.COMPLETED
                        ? "text-primary"
                        : "text-error"
                    }`}
                  >
                    {file.status === UploadStatus.COMPLETED
                      ? "check_circle"
                      : file.status === UploadStatus.FAILED
                      ? "error"
                      : "cancel"}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-on-surface truncate">
                      {file.relativePath || file.file.name}
                    </p>
                    <p className="text-xs text-on-surface-variant">
                      {formatBytes(file.file.size)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <IconButton
                      icon="close"
                      size="sm"
                      onClick={() => {
                        onRemove(file.id);
                        const remainingFiles = files.filter(
                          (f) => f.id !== file.id
                        );
                        if (remainingFiles.length === 0 && onClose) {
                          onClose();
                        }
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
