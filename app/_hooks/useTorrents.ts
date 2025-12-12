"use client";

import { useState, useEffect, useCallback } from "react";
import { getTorrents } from "@/app/_server/actions/torrents";
import { updateAllTorrents } from "@/app/_server/actions/torrents/update";
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
  pollInterval: number = 2000
): UseTorrentsResult => {
  const [torrents, setTorrents] = useState<TorrentSession[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTorrents = useCallback(async () => {
    try {
      // Update torrent states from running clients first
      await updateAllTorrents();

      const response = await getTorrents(page, limit);
      if (response.success && response.data) {
        setTorrents(response.data.torrents);
        setTotal(response.data.total);
        setError(null);
      } else {
        setError(response.error || "Failed to load torrents");
      }
    } catch (err) {
      setError("Failed to load torrents");
      console.error("Error fetching torrents:", err);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchTorrents();

    // Set up polling
    const interval = setInterval(fetchTorrents, pollInterval);

    return () => clearInterval(interval);
  }, [fetchTorrents, pollInterval]);

  return {
    torrents,
    total,
    isLoading,
    error,
    refresh: fetchTorrents,
  };
};
