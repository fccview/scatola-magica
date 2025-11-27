export const UPLOAD_CONFIG = {
  MAX_CHUNK_SIZE: parseInt(process.env.MAX_CHUNK_SIZE || "104857600"),
  PARALLEL_UPLOADS: parseInt(process.env.PARALLEL_UPLOADS || "12"),
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || "0"),
  CHUNK_RETRY_ATTEMPTS: 5,
  CHUNK_RETRY_DELAY_MS: 1000,
  SESSION_EXPIRY_HOURS: 24,
} as const;

export const NETWORK_SPEED_THRESHOLDS = {
  SLOW: 5,
  MEDIUM: 50,
} as const;

export const ADAPTIVE_CHUNK_SIZES = {
  SLOW: 5 * 1024 * 1024,
  MEDIUM: 20 * 1024 * 1024,
  FAST: 50 * 1024 * 1024,
  ULTRA_FAST: 100 * 1024 * 1024,
} as const;

export const MIME_TYPES = {
  PDF: "application/pdf",
  ZIP: "application/zip",
  IMAGE: "image/",
  VIDEO: "video/",
  AUDIO: "audio/",
  TEXT: "text/",
} as const;
