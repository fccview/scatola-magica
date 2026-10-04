import { UploadProgress } from "@/app/_types";
import { UploadStatus } from "@/app/_types/enums";
import type { E2EEncryptionOptions } from "@/app/_lib/chunked-uploader";

export interface ResumeInfo {
  uploadId: string;
  uploadedChunks: number[];
}

export interface UploadingFile {
  id: string;
  file: File;
  relativePath?: string;
  progress: UploadProgress | null;
  status: UploadStatus;
  fileId?: string;
  folderPath?: string;
  isResumed?: boolean;
  encryption?: E2EEncryptionOptions;
  resume?: ResumeInfo;
  error?: string;
}

export interface UploadStructure {
  created: number;
  total: number;
  fileCount: number;
  error?: string;
}

export interface UploadTally {
  totalBytes: number;
  sentBytes: number;
  percent: number;
  speed: number;
  eta: number;
  active: number;
  queued: number;
  done: number;
  failed: number;
  cancelled: number;
  isBusy: boolean;
}
