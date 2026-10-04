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

export const TEXT_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "html",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "xml",
  "yaml",
  "yml",
  "sh",
  "bash",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "go",
  "rs",
  "php",
  "rb",
  "sql",
  "log",
  "config",
  "conf",
  "ini",
  "env",
  "gpg",
];

export const IMAGE_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
];
export const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];
export const PDF_EXTENSIONS = ["pdf"];
export const CSV_EXTENSIONS = ["csv"];
export const MARKDOWN_EXTENSIONS = ["md", "markdown"];

export const FILES_PAGE_SIZE = 15;
export const FILES_MAX_PAGE_SIZE = 500;

export const UPLOAD_QUEUE = {
  MAX_PARALLEL_FILES: 4,
  PROGRESS_THROTTLE_MS: 120,
  SPEED_SAMPLE_MS: 250,
  SPEED_SMOOTHING: 0.3,
  MAX_CHUNK_MAP: 64,
  QUEUE_PREVIEW: 3,
} as const;

export const SIDEBAR_COOKIE = "scatola-sidebar-width";
export const SIDEBAR_CSS_VAR = "--sidebar-width";
export const SIDEBAR_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;
export const SIDEBAR_WIDTH = {
  DEFAULT: 384,
  MIN: 240,
  MAX: 640,
  STEP: 16,
  VIEWPORT_RATIO: 0.6,
} as const;
export const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
