"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getTorrents } from "@/app/_server/actions/manage-torrents";
import { TorrentSession } from "@/app/_types/torrent";

interface UseTorrentsResult {
  torrents: TorrentSession[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const useTorrents = (
  page: number = 1,
  limit: number = 50,
  pollInterval: number = 10000
): UseTorrentsResult => {
  const [torrents, setTorrents] = useState<TorrentSession[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const fetchTorrents = useCallback(async () => {
    if (!isMountedRef.current) return;

    try {
      const response = await getTorrents(page, limit);
      if (!isMountedRef.current) return;

      if (response.success && response.data) {
        setTorrents(response.data.torrents);
        setTotal(response.data.total);
        setError(null);
      } else {
        setError(response.error || "Failed to load torrents");
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
  }, [page, limit]);

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
    refresh,
  };
};
