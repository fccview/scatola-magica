import { formatBytes, formatDuration } from "@/app/_lib/file-utils";

export const fmtBytes = (bytes: number): string =>
  formatBytes(Math.max(0, Math.round(bytes)), 1);

export const fmtSpeed = (bytesPerSecond: number): string =>
  `${fmtBytes(bytesPerSecond)}/s`;

export const fmtEta = (seconds: number): string =>
  seconds > 0 && Number.isFinite(seconds)
    ? `about ${formatDuration(seconds)} left`
    : "";

export const plural = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;
