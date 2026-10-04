export enum UploadStatus {
  PENDING = "PENDING",
  UPLOADING = "UPLOADING",
  PROCESSING = "PROCESSING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  CANCELLED = "CANCELLED",
}

export enum FileViewMode {
  GRID = "GRID",
  LIST = "LIST",
}

export enum SortBy {
  NAME_ASC = "NAME_ASC",
  NAME_DESC = "NAME_DESC",
  DATE_ASC = "DATE_ASC",
  DATE_DESC = "DATE_DESC",
  SIZE_ASC = "SIZE_ASC",
  SIZE_DESC = "SIZE_DESC",
}

export enum CacheStrategy {
  CACHE_FIRST = "CACHE_FIRST",
  NETWORK_FIRST = "NETWORK_FIRST",
  STALE_WHILE_REVALIDATE = "STALE_WHILE_REVALIDATE",
  NETWORK_ONLY = "NETWORK_ONLY",
  CACHE_ONLY = "CACHE_ONLY",
}

export enum UploadPhase {
  QUEUED = "QUEUED",
  PREPARING = "PREPARING",
  SECURING = "SECURING",
  RESUMING = "RESUMING",
  HANDSHAKE = "HANDSHAKE",
  SENDING = "SENDING",
  ASSEMBLING = "ASSEMBLING",
  DONE = "DONE",
}

export enum ChunkState {
  WAITING = "WAITING",
  SENDING = "SENDING",
  RETRYING = "RETRYING",
  DONE = "DONE",
}

export enum SelectKind {
  FILE = "file",
  FOLDER = "folder",
}

export enum TooltipSide {
  TOP = "TOP",
  BOTTOM = "BOTTOM",
}

export enum ItemActionId {
  OPEN = "OPEN",
  RENAME = "RENAME",
  MOVE = "MOVE",
  DOWNLOAD = "DOWNLOAD",
  DECRYPT = "DECRYPT",
  ENCRYPT = "ENCRYPT",
  DELETE = "DELETE",
}

export enum ItemActionGroup {
  BASIC = "BASIC",
  CRYPTO = "CRYPTO",
  DANGER = "DANGER",
}

export enum PreviewKind {
  TEXT = "TEXT",
  IMAGE = "IMAGE",
  VIDEO = "VIDEO",
  AUDIO = "AUDIO",
  PDF = "PDF",
  CSV = "CSV",
  ARCHIVE = "ARCHIVE",
  DOCUMENT = "DOCUMENT",
  SHEET = "SHEET",
  SLIDES = "SLIDES",
  FONT = "FONT",
  NONE = "NONE",
}
