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
  "mjs",
  "cjs",
  "jsonc",
  "toml",
  "scss",
  "sass",
  "less",
  "vue",
  "svelte",
  "cs",
  "kt",
  "kts",
  "swift",
  "scala",
  "lua",
  "dart",
  "zsh",
  "fish",
  "bat",
  "ps1",
  "graphql",
  "gql",
  "proto",
  "tf",
  "nix",
  "properties",
  "gradle",
  "dockerfile",
  "makefile",
  "gitignore",
  "dockerignore",
  "editorconfig",
  "lock",
  "diff",
  "patch",
  "srt",
  "vtt",
  "tex",
  "rst",
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
  "avif",
  "apng",
];
export const VIDEO_EXTENSIONS = [
  "mp4",
  "webm",
  "ogg",
  "ogv",
  "mov",
  "avi",
  "mkv",
  "m4v",
];
export const AUDIO_EXTENSIONS = ["mp3", "wav", "flac", "aac", "m4a", "opus", "oga"];
export const PDF_EXTENSIONS = ["pdf"];
export const CSV_EXTENSIONS = ["csv", "tsv"];
export const ARCHIVE_EXTENSIONS = ["zip", "jar"];
export const DOCUMENT_EXTENSIONS = ["docx"];
export const SHEET_EXTENSIONS = ["xlsx", "xlsm", "xls", "ods"];
export const SLIDE_EXTENSIONS = ["pptx"];
export const FONT_EXTENSIONS = ["ttf", "otf", "woff", "woff2"];
export const VIEWABLE_EXTENSIONS = [
  ...TEXT_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...PDF_EXTENSIONS,
  ...CSV_EXTENSIONS,
  ...ARCHIVE_EXTENSIONS,
  ...DOCUMENT_EXTENSIONS,
  ...SHEET_EXTENSIONS,
  ...SLIDE_EXTENSIONS,
  ...FONT_EXTENSIONS,
].filter((extension) => extension !== "gpg");
export const ARCHIVE_PREVIEW_MAX_BYTES = 256 * 1024 * 1024;
export const ARCHIVE_PREVIEW_MAX_ENTRIES = 2000;
export const SHEET_PREVIEW_MAX_ROWS = 1000;
export const FONT_PREVIEW_SIZES = [14, 20, 32, 48];
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

export const TOOLTIP = {
  GAP_PX: 8,
  FLIP_ZONE_PX: 40,
} as const;
