"use client";

import { UploadStatus } from "@/app/_types/enums";
import { UploadStructure, UploadingFile } from "@/app/_types/upload";
import { isSettled, tallyUploads } from "@/app/_lib/upload-tally";
import UploadSummary from "@/app/_components/FeatureComponents/UploadPage/UploadSummary";
import UploadActiveRow from "@/app/_components/FeatureComponents/UploadPage/UploadActiveRow";
import UploadQueue from "@/app/_components/FeatureComponents/UploadPage/UploadQueue";
import UploadSettledRow from "@/app/_components/FeatureComponents/UploadPage/UploadSettledRow";
import UploadStructureNotice from "@/app/_components/FeatureComponents/UploadPage/UploadStructureNotice";

interface UploadFileListProps {
  files: UploadingFile[];
  structure?: UploadStructure | null;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onRetryFailed: () => void;
  onCancelAll: () => void;
  onDismissStructure?: () => void;
  onClose?: () => void;
}

const UploadFileList = ({
  files,
  structure,
  onCancel,
  onRemove,
  onRetry,
  onRetryFailed,
  onCancelAll,
  onDismissStructure,
  onClose,
}: UploadFileListProps) => {
  if (files.length === 0 && !structure) return null;

  const tally = tallyUploads(files);
  const active = files.filter((f) => f.status === UploadStatus.UPLOADING);
  const queued = files.filter((f) => f.status === UploadStatus.PENDING);
  const settled = files.filter((f) => isSettled(f.status));

  const handleRemove = (id: string) => {
    onRemove(id);
    if (files.length === 1 && !structure && onClose) onClose();
  };

  return (
    <div className="space-y-5">
      {files.length > 0 && (
        <UploadSummary
          tally={tally}
          onRetryFailed={onRetryFailed}
          onCancelAll={onCancelAll}
        />
      )}

      {structure && (
        <UploadStructureNotice structure={structure} onDismiss={onDismissStructure} />
      )}

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((upload) => (
            <UploadActiveRow key={upload.id} upload={upload} onCancel={onCancel} />
          ))}
        </div>
      )}

      <UploadQueue queued={queued} onCancel={onCancel} />

      {settled.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-on-surface-variant">Finished</h4>
          <div className="max-h-64 overflow-y-auto space-y-1.5 pr-2">
            {settled.map((upload) => (
              <UploadSettledRow
                key={upload.id}
                upload={upload}
                onRemove={handleRemove}
                onRetry={onRetry}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadFileList;
