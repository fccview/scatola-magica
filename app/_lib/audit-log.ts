import "server-only";

import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { lock, unlock } from "proper-lockfile";
import { getCurrentUser } from "@/app/_lib/current-user";
import { AUDIT_LOG_DIR } from "@/app/_lib/data-paths";
import { logger } from "@/app/_lib/logger";

const SCOPE = "audit-log";

export type AuditLogAction =
  | "file:upload"
  | "file:download"
  | "file:delete"
  | "file:rename"
  | "file:move"
  | "file:copy"
  | "file:encrypt"
  | "file:decrypt"
  | "folder:create"
  | "folder:delete"
  | "folder:rename"
  | "folder:move"
  | "folder:encrypt"
  | "folder:decrypt"
  | "auth:login"
  | "auth:logout"
  | "auth:password_change"
  | "auth:api_key_generate"
  | "auth:api_key_delete"
  | "encryption:key_generate"
  | "encryption:key_import"
  | "encryption:key_export"
  | "encryption:key_delete"
  | "user:create"
  | "user:delete"
  | "user:update"
  | "user:role_change"
  | "settings:update"
  | "torrent:create"
  | "torrent:add"
  | "torrent:pause"
  | "torrent:resume"
  | "torrent:stop"
  | "torrent:remove"
  | "torrent:start-seeding"
  | "torrent:complete"
  | "torrent:seed-complete"
  | "torrent:error";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  username: string;
  action: AuditLogAction;
  resource?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export const userLogFile = (username: string): string =>
  path.join(AUDIT_LOG_DIR, `${username}.jsonl`);

export const ensureLogsDir = async (): Promise<void> => {
  await fs.mkdir(AUDIT_LOG_DIR, { recursive: true });
};

export const auditLog = async (
  action: AuditLogAction,
  options?: {
    resource?: string;
    details?: Record<string, unknown>;
    success?: boolean;
    errorMessage?: string;
    ipAddress?: string;
    userAgent?: string;
  }
): Promise<void> => {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    await ensureLogsDir();

    const logEntry: AuditLogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      username: user.username,
      action,
      resource: options?.resource,
      details: options?.details,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      success: options?.success !== undefined ? options.success : true,
      errorMessage: options?.errorMessage,
    };

    const logFile = userLogFile(user.username);
    const logLine = JSON.stringify(logEntry) + "\n";

    try {
      await lock(logFile, { retries: 5, realpath: false });
      try {
        await fs.appendFile(logFile, logLine, "utf-8");
      } finally {
        await unlock(logFile, { realpath: false });
      }
    } catch (lockError) {
      logger.warn(SCOPE, "Audit log lock failed, appending unlocked", lockError);
      await fs.appendFile(logFile, logLine, "utf-8");
    }
  } catch (error) {
    logger.error(SCOPE, "Failed to write audit log", error);
  }
};
