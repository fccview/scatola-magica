import { UploadStatus } from "@/app/_types/enums";
import { UploadingFile } from "@/app/_types/upload";
import { fmtBytes } from "@/app/_lib/upload-format";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";

interface UploadSettledRowProps {
  upload: UploadingFile;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

const STATUS_ICON: Partial<Record<UploadStatus, { icon: string; tone: string }>> = {
  [UploadStatus.COMPLETED]: { icon: "check_circle", tone: "text-primary" },
  [UploadStatus.FAILED]: { icon: "error", tone: "text-error" },
  [UploadStatus.CANCELLED]: { icon: "cancel", tone: "text-on-surface-variant" },
};

const _detail = (upload: UploadingFile): string => {
  if (upload.status === UploadStatus.FAILED) return upload.error || "Upload failed";
  if (upload.status === UploadStatus.CANCELLED) return "Cancelled";
  return fmtBytes(upload.file.size);
};

const UploadSettledRow = ({ upload, onRemove, onRetry }: UploadSettledRowProps) => {
  const look = STATUS_ICON[upload.status] ?? STATUS_ICON[UploadStatus.CANCELLED]!;
  const canRetry =
    upload.status === UploadStatus.FAILED ||
    upload.status === UploadStatus.CANCELLED;

  return (
    <div className="fx-rise flex items-center gap-3 p-3 rounded-lg bg-surface-container">
      <Icon icon={look.icon} size="sm" className={`fx-check ${look.tone}`} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-on-surface truncate">
          {upload.relativePath || upload.file.name}
        </p>
        <p
          className={`text-xs truncate ${
            upload.status === UploadStatus.FAILED ? "text-error" : "text-on-surface-variant"
          }`}
          title={upload.error}
        >
          {_detail(upload)}
        </p>
      </div>

      <div className="flex items-center gap-1">
        {canRetry && (
          <IconButton
            icon="refresh"
            size="sm"
            ariaLabel={`Retry ${upload.file.name}`}
            title="Try again"
            onClick={() => onRetry(upload.id)}
          />
        )}
        <IconButton
          icon="close"
          size="sm"
          ariaLabel={`Dismiss ${upload.file.name}`}
          onClick={() => onRemove(upload.id)}
        />
      </div>
    </div>
  );
};

export default UploadSettledRow;
