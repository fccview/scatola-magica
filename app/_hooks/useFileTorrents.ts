"use client";

import { useState, useEffect } from "react";
import { getFileTorrents } from "@/app/_server/actions/manage-torrents";

export const useFileTorrents = () => {
  const [torrentMap, setTorrentMap] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTorrents = async () => {
      try {
        const result = await getFileTorrents();
        if (result.success && result.data) {
          setTorrentMap(result.data);
        }
      } catch (error) {
        console.error("Error fetching torrent status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTorrents();
  }, []);

  const hasTorrent = (filePath: string): boolean => {
    return torrentMap[filePath] === true;
  };

  const refresh = async () => {
    setIsLoading(true);
    try {
      const result = await getFileTorrents();
      if (result.success && result.data) {
        setTorrentMap(result.data);
      }
    } catch (error) {
      console.error("Error refreshing torrent status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return { hasTorrent, isLoading, refresh };
};
