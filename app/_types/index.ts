import { UploadStatus } from "@/app/_types/enums";

export interface FileMetadata {
  id: string;
  name: string;
  originalName: string;
  size: number;
  mimeType: string;
  uploadedAt: number;
  lastModified: number;
  path: string;
  folderPath?: string;
}

export interface UploadProgress {
  fileId: string;
  fileName: string;
  totalSize: number;
  uploadedSize: number;
  progress: number;
  status: UploadStatus;
  speed: number;
  remainingTime: number;
  chunksCompleted: number;
  totalChunks: number;
}

export interface ChunkMetadata {
  uploadId: string;
  chunkIndex: number;
  totalChunks: number;
  chunkSize: number;
  fileName: string;
  fileSize: number;
}

export interface UploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  createdAt: number;
  expiresAt: number;
}

export interface ServerActionResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface User {
  username: string;
  passwordHash: string;
  isAdmin: boolean;
  isSuperAdmin?: boolean;
  createdAt: string;
  avatar?: string;
}

export interface Session {
  sessionId: string;
  username: string;
  createdAt: string;
  expiresAt: string;
  authMethod: "normal" | "sso";
}
