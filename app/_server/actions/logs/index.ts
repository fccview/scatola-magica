"use server";

import fs from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/app/_lib/current-user";
import { AUDIT_LOG_DIR } from "@/app/_lib/data-paths";
import { logger } from "@/app/_lib/logger";
import {
  AuditLogAction,
  AuditLogEntry,
  ensureLogsDir,
  userLogFile,
} from "@/app/_lib/audit-log";

export type { AuditLogAction, AuditLogEntry } from "@/app/_lib/audit-log";

export interface GetAuditLogsOptions {
  action?: AuditLogAction;
  username?: string;
  startDate?: string;
  endDate?: string;
  success?: boolean;
  limit?: number;
  offset?: number;
}

export const getAuditLogs = async (
  options?: GetAuditLogsOptions
): Promise<{ logs: AuditLogEntry[]; total: number }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { logs: [], total: 0 };
    }

    await ensureLogsDir();

    const logFile = userLogFile(user.username);

    try {
      await fs.access(logFile);
    } catch {
      return { logs: [], total: 0 };
    }

    const content = await fs.readFile(logFile, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);

    let logs: AuditLogEntry[] = lines
      .map((line) => {
        try {
          return JSON.parse(line) as AuditLogEntry;
        } catch {
          return null;
        }
      })
      .filter((log): log is AuditLogEntry => log !== null);

    if (options?.action) {
      logs = logs.filter((log) => log.action === options.action);
    }

    if (options?.username) {
      logs = logs.filter((log) => log.username === options.username);
    }

    if (options?.startDate) {
      logs = logs.filter((log) => log.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      logs = logs.filter((log) => log.timestamp <= options.endDate!);
    }

    if (options?.success !== undefined) {
      logs = logs.filter((log) => log.success === options.success);
    }

    logs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = logs.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    logs = logs.slice(offset, offset + limit);

    return { logs, total };
  } catch (error) {
    console.error("Failed to read audit logs:", error);
    return { logs: [], total: 0 };
  }
};

export const getAllAuditLogs = async (
  options?: GetAuditLogsOptions
): Promise<{ logs: AuditLogEntry[]; total: number }> => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return { logs: [], total: 0 };
    }

    await ensureLogsDir();

    const logsDir = AUDIT_LOG_DIR;
    const files = await fs.readdir(logsDir);

    let allLogs: AuditLogEntry[] = [];

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;

      const logFile = path.join(logsDir, file);
      const content = await fs.readFile(logFile, "utf-8");
      const lines = content.trim().split("\n").filter(Boolean);

      const logs: AuditLogEntry[] = lines
        .map((line) => {
          try {
            return JSON.parse(line) as AuditLogEntry;
          } catch {
            return null;
          }
        })
        .filter((log): log is AuditLogEntry => log !== null);

      allLogs.push(...logs);
    }

    if (options?.action) {
      allLogs = allLogs.filter((log) => log.action === options.action);
    }

    if (options?.username) {
      allLogs = allLogs.filter((log) => log.username === options.username);
    }

    if (options?.startDate) {
      allLogs = allLogs.filter((log) => log.timestamp >= options.startDate!);
    }

    if (options?.endDate) {
      allLogs = allLogs.filter((log) => log.timestamp <= options.endDate!);
    }

    if (options?.success !== undefined) {
      allLogs = allLogs.filter((log) => log.success === options.success);
    }

    allLogs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const total = allLogs.length;
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;

    allLogs = allLogs.slice(offset, offset + limit);

    return { logs: allLogs, total };
  } catch (error) {
    console.error("Failed to read all audit logs:", error);
    return { logs: [], total: 0 };
  }
};

export const clearAuditLogs = async (): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false };
    }

    const logFile = userLogFile(user.username);

    try {
      await fs.access(logFile);
      await fs.unlink(logFile);
    } catch (error) {
      logger.warn("audit-logs", `No log file to clear for ${user.username}`, error);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to clear audit logs:", error);
    return { success: false };
  }
};

export const clearAllAuditLogs = async (): Promise<{ success: boolean }> => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return { success: false };
    }

    const logsDir = AUDIT_LOG_DIR;
    const files = await fs.readdir(logsDir);

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const logFile = path.join(logsDir, file);
      await fs.unlink(logFile);
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to clear all audit logs:", error);
    return { success: false };
  }
};

export const getLoggedUsers = async (): Promise<string[]> => {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isAdmin) {
      return [];
    }

    const logsDir = AUDIT_LOG_DIR;
    const files = await fs.readdir(logsDir);

    const users = files
      .filter((file) => file.endsWith(".jsonl"))
      .map((file) => file.replace(".jsonl", ""))
      .sort();

    return users;
  } catch (error) {
    console.error("Failed to get logged users:", error);
    return [];
  }
};
