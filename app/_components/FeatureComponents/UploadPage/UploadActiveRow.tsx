import { UploadPhase } from "@/app/_types/enums";
import { UploadingFile } from "@/app/_types/upload";
import { PHASE_META } from "@/app/_lib/upload-phases";
import { fmtBytes, fmtEta, fmtSpeed, plural } from "@/app/_lib/upload-format";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import UploadChunkMap from "@/app/_components/FeatureComponents/UploadPage/UploadChunkMap";
import PreparingUploadMessage from "@/app/_components/FeatureComponents/UploadPage/PreparingUploadMessage";

interface UploadActiveRowProps {
  upload: UploadingFile;
  onCancel: (id: string) => void;
}

const _chunkLine = (upload: UploadingFile): string => {
  const progress = upload.progress;
  if (!progress || progress.phase !== UploadPhase.SENDING) return "";

  const parts = [`${progress.chunksCompleted} / ${plural(progress.totalChunks, "chunk")}`];
  if (progress.chunksInFlight > 0) parts.push(`${progress.chunksInFlight} in flight`);
  if (progress.chunksRetrying > 0) parts.push(`${progress.chunksRetrying} retrying`);
  return parts.join(" · ");
};

const _transferLine = (upload: UploadingFile): string => {
  const progress = upload.progress;
  if (!progress || progress.phase !== UploadPhase.SENDING) {
    return fmtBytes(upload.file.size);
  }

  const parts = [`${fmtBytes(progress.uploadedSize)} of ${fmtBytes(upload.file.size)}`];
  if (progress.speed > 0) parts.push(fmtSpeed(progress.speed));
  const eta = fmtEta(progress.remainingTime);
  if (eta) parts.push(eta);
  return parts.join(" · ");
};

const UploadActiveRow = ({ upload, onCancel }: UploadActiveRowProps) => {
  const phase = upload.progress?.phase ?? UploadPhase.PREPARING;
  const meta = PHASE_META[phase];
  const percent = upload.progress?.progress ?? 0;
  const isRetrying = (upload.progress?.chunksRetrying ?? 0) > 0;

  return (
    <div className="fx-rise bg-surface-container rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <Icon
            icon={isRetrying ? "sync_problem" : meta.icon}
            size="xs"
            className={meta.isMeasured ? "" : "fx-blink"}
          />
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">
            {upload.relativePath || upload.file.name}
          </p>
          <p
            className={`text-xs mt-0.5 ${isRetrying ? "text-error" : "text-on-surface-variant"}`}
          >
            {isRetrying ? "Network hiccup, retrying a chunk" : meta.label}
          </p>
        </div>

        <span className="text-sm font-medium tabular-nums text-on-surface">
          {meta.isMeasured ? `${Math.floor(percent)}%` : ""}
        </span>
        <IconButton
          icon="close"
          size="sm"
          ariaLabel={`Cancel ${upload.file.name}`}
          onClick={() => onCancel(upload.id)}
        />
      </div>

      <Progress
        value={percent}
        size="sm"
        indeterminate={!meta.isMeasured}
        shimmer={meta.isMeasured}
      />

      {phase === UploadPhase.SENDING && upload.progress?.chunkMap && (
        <UploadChunkMap chunks={upload.progress.chunkMap} />
      )}

      {meta.isMeasured ? (
        <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-on-surface-variant tabular-nums">
          <span>{_transferLine(upload)}</span>
          <span>{_chunkLine(upload)}</span>
        </div>
      ) : (
        <PreparingUploadMessage />
      )}
    </div>
  );
};

export default UploadActiveRow;
