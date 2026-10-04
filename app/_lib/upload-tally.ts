import { UploadStatus } from "@/app/_types/enums";
import { UploadTally, UploadingFile } from "@/app/_types/upload";

const SETTLED = [
  UploadStatus.COMPLETED,
  UploadStatus.FAILED,
  UploadStatus.CANCELLED,
];

export const isSettled = (status: UploadStatus): boolean =>
  SETTLED.includes(status);

const _sentBytes = (file: UploadingFile): number => {
  if (file.status === UploadStatus.COMPLETED) return file.file.size;
  if (file.status === UploadStatus.UPLOADING) return file.progress?.uploadedSize ?? 0;
  return 0;
};

export const tallyUploads = (files: UploadingFile[]): UploadTally => {
  const tally: UploadTally = {
    totalBytes: 0,
    sentBytes: 0,
    percent: 0,
    speed: 0,
    eta: 0,
    active: 0,
    queued: 0,
    done: 0,
    failed: 0,
    cancelled: 0,
    isBusy: false,
  };

  for (const file of files) {
    if (file.status === UploadStatus.CANCELLED) {
      tally.cancelled++;
      continue;
    }

    tally.totalBytes += file.file.size;
    tally.sentBytes += _sentBytes(file);

    if (file.status === UploadStatus.UPLOADING) {
      tally.active++;
      tally.speed += file.progress?.speed ?? 0;
    }
    if (file.status === UploadStatus.PENDING) tally.queued++;
    if (file.status === UploadStatus.COMPLETED) tally.done++;
    if (file.status === UploadStatus.FAILED) tally.failed++;
  }

  const counted = tally.done + tally.failed + tally.active + tally.queued;
  tally.isBusy = tally.active + tally.queued > 0;
  tally.percent =
    tally.totalBytes > 0
      ? (tally.sentBytes / tally.totalBytes) * 100
      : counted > 0
        ? (tally.done / counted) * 100
        : 0;

  const remaining = tally.totalBytes - tally.sentBytes;
  tally.eta = tally.speed > 0 ? remaining / tally.speed : 0;

  return tally;
};
