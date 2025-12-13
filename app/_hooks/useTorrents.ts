"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTorrents } from "@/app/_server/actions/manage-torrents";
import { TorrentSession } from "@/app/_types/torrent";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import {
  getStoredE2EPassword,
  hasStoredE2EPassword,
} from "@/app/_lib/chunk-encryption";

interface UseTorrentsResult {
  torrents: TorrentSession[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  needsPassword: boolean;
  onPasswordProvided: (password: string) => void;
}

export const useTorrents = (
  page: number = 1,
  limit: number = 50,
  pollInterval: number = 10000
): UseTorrentsResult => {
  const { encryptionKey, torrentPreferences } = usePreferences();
  const [torrents, setTorrents] = useState<TorrentSession[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const encryptMetadata = torrentPreferences?.encryptMetadata ?? true;

  const fetchTorrents = useCallback(
    async (providedPassword?: string) => {
      if (!isMountedRef.current) return;

      try {
        let password: string | undefined = providedPassword;

        if (!password && encryptionKey) {
          password = (await getStoredE2EPassword(encryptionKey)) || undefined;
        }

        const response = await getTorrents(page, limit, password);
        if (!isMountedRef.current) return;

        if (response.success && response.data) {
          setTorrents(response.data.torrents);
          setTotal(response.data.total);
          setError(null);
          setNeedsPassword(false);
        } else {
          if (
            response.error === "PASSWORD_REQUIRED" ||
            response.data?.needsPassword
          ) {
            setNeedsPassword(true);
            setError(null);
          } else if (response.error === "INVALID_PASSWORD") {
            setNeedsPassword(true);
            setError("Invalid password");
          } else {
            setError(response.error || "Failed to load torrents");
          }
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        setError("Failed to load torrents");
        console.error("Error fetching torrents:", err);
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    },
    [page, limit, encryptionKey, encryptMetadata]
  );

  const onPasswordProvided = useCallback(
    async (password: string) => {
      setStoredPassword(password);
      setNeedsPassword(false);
      setIsLoading(true);
      await fetchTorrents(password);
    },
    [fetchTorrents]
  );

  useEffect(() => {
    isMountedRef.current = true;
    setIsLoading(true);
    fetchTorrents();

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (isMountedRef.current) {
        fetchTorrents();
      }
    }, pollInterval);

    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [fetchTorrents, pollInterval]);

  const refresh = useCallback(async () => {
    await fetchTorrents();
  }, [fetchTorrents]);

  return {
    torrents,
    total,
    isLoading,
    error,
    refresh: () => fetchTorrents(storedPassword || undefined),
    needsPassword,
    onPasswordProvided,
  };
};
