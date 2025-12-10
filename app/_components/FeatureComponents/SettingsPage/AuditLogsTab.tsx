"use client";

import { useState, useEffect } from "react";
import {
  getAuditLogs,
  getAllAuditLogs,
  clearAuditLogs,
  clearAllAuditLogs,
  getLoggedUsers,
  AuditLogEntry,
  AuditLogAction,
} from "@/app/_server/actions/logs";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Select from "@/app/_components/GlobalComponents/Form/Select";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

export default function AuditLogsTab() {
  const { user } = usePreferences();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewAllLogs, setViewAllLogs] = useState(false);
  const [filterAction, setFilterAction] = useState<AuditLogAction | "">("");
  const [filterUsername, setFilterUsername] = useState<string>("");
  const [availableUsers, setAvailableUsers] = useState<string[]>([]);
  const [filterSuccess, setFilterSuccess] = useState<
    "all" | "success" | "failed"
  >("all");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filters: any = {
        limit: 100,
      };

      if (filterAction) {
        filters.action = filterAction;
      }

      if (filterUsername) {
        filters.username = filterUsername;
      }

      if (filterSuccess !== "all") {
        filters.success = filterSuccess === "success";
      }

      const result =
        viewAllLogs && user?.isAdmin
          ? await getAllAuditLogs(filters)
          : await getAuditLogs(filters);

      setLogs(result.logs);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [viewAllLogs, filterAction, filterUsername, filterSuccess]);

  useEffect(() => {
    if (viewAllLogs && user?.isAdmin) {
      getLoggedUsers().then(setAvailableUsers);
    } else {
      setAvailableUsers([]);
      setFilterUsername("");
    }
  }, [viewAllLogs, user?.isAdmin]);

  const handleClearLogs = async () => {
    if (
      !confirm(
        "Are you sure you want to clear audit logs? This action cannot be undone."
      )
    ) {
      return;
    }

    const result =
      viewAllLogs && user?.isAdmin
        ? await clearAllAuditLogs()
        : await clearAuditLogs();

    if (result.success) {
      loadLogs();
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getActionColor = (action: AuditLogAction) => {
    if (action.startsWith("file:")) return "text-blue-600 dark:text-blue-400";
    if (action.startsWith("folder:"))
      return "text-purple-600 dark:text-purple-400";
    if (action.startsWith("auth:")) return "text-green-600 dark:text-green-400";
    if (action.startsWith("encryption:"))
      return "text-orange-600 dark:text-orange-400";
    if (action.startsWith("user:")) return "text-red-600 dark:text-red-400";
    return "text-gray-600 dark:text-gray-400";
  };

  const actionTypes: AuditLogAction[] = [
    "file:upload",
    "file:download",
    "file:delete",
    "file:rename",
    "file:move",
    "file:encrypt",
    "file:decrypt",
    "folder:create",
    "folder:delete",
    "folder:encrypt",
    "folder:decrypt",
    "auth:login",
    "auth:logout",
    "encryption:key_generate",
    "encryption:key_import",
    "encryption:key_export",
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

      <div className="mb-6 flex flex-wrap gap-4">
        {user?.isAdmin && (
          <Select
            label="View"
            value={viewAllLogs ? "all" : "mine"}
            onChange={(e) => setViewAllLogs(e.target.value === "all")}
          >
            <option value="mine">My Logs</option>
            <option value="all">All Users</option>
          </Select>
        )}

        {viewAllLogs && user?.isAdmin && availableUsers.length > 0 && (
          <Select
            label="User"
            value={filterUsername}
            onChange={(e) => setFilterUsername(e.target.value)}
          >
            <option value="">All Users</option>
            {availableUsers.map((username) => (
              <option key={username} value={username}>
                {username}
              </option>
            ))}
          </Select>
        )}

        <Select
          label="Action Type"
          value={filterAction}
          onChange={(e) =>
            setFilterAction(e.target.value as AuditLogAction | "")
          }
        >
          <option value="">All Actions</option>
          {actionTypes.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </Select>

        <Select
          label="Status"
          value={filterSuccess}
          onChange={(e) =>
            setFilterSuccess(e.target.value as "all" | "success" | "failed")
          }
        >
          <option value="all">All</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </Select>

        <div className="flex items-end gap-2">
          <Button onClick={loadLogs} disabled={loading}>
            Refresh
          </Button>
          <Button onClick={handleClearLogs} variant="outlined">
            Clear Logs
          </Button>
        </div>
      </div>

      <div className="text-sm text-on-surface-variant mb-4">
        Showing {logs.length} of {total} log entries
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-on-surface-variant">
          No audit logs found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-dashed border-outline">
                <th className="text-left p-3 font-medium">Timestamp</th>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Action</th>
                <th className="text-left p-3 font-medium">Resource</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-dashed border-outline/50 hover:bg-surface-variant/20"
                >
                  <td className="p-3 text-sm">
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td className="p-3 text-sm font-medium">{log.username}</td>
                  <td
                    className={`p-3 text-sm font-mono ${getActionColor(
                      log.action
                    )}`}
                  >
                    {log.action}
                  </td>
                  <td
                    className="p-3 text-sm truncate max-w-xs"
                    title={log.resource}
                  >
                    {log.resource || "-"}
                  </td>
                  <td className="p-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        log.success
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                      }`}
                    >
                      {log.success ? "Success" : "Failed"}
                    </span>
                  </td>
                  <td className="p-3 text-sm">
                    {log.errorMessage ? (
                      <span className="text-red-600 dark:text-red-400">
                        {log.errorMessage}
                      </span>
                    ) : log.details ? (
                      <span className="text-xs text-on-surface-variant">
                        {JSON.stringify(log.details)}
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
