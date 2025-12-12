export interface TorrentFileInfo {
  name: string;
  path: string;
  length: number;
}

export interface TorrentMetadata {
  infoHash: string;
  name: string;
  magnetURI?: string;
  torrentFilePath?: string;
  size: number;
  files: TorrentFileInfo[];
  createdAt: number;
  createdBy: string;
  downloadPath: string;
  folderPath?: string;
}

export interface TorrentState {
  infoHash: string;
  status: TorrentStatus;
  downloadSpeed: number;
  uploadSpeed: number;
  downloaded: number;
  uploaded: number;
  progress: number;
  ratio: number;
  numPeers: number;
  timeRemaining: number;
  addedAt: number;
  completedAt?: number;
  pausedAt?: number;
  error?: string;
}

export interface TorrentPreferences {
  preferredDownloadPath?: string;
  seedRatio: number;
  autoStartTorrents: boolean;
  maxActiveTorrents: number;
}

export enum TorrentStatus {
  INITIALIZING = "INITIALIZING",
  DOWNLOADING = "DOWNLOADING",
  SEEDING = "SEEDING",
  PAUSED = "PAUSED",
  COMPLETED = "COMPLETED",
  ERROR = "ERROR",
  STOPPED = "STOPPED",
}

export interface TorrentSession {
  metadata: TorrentMetadata;
  state: TorrentState;
  username: string;
}
