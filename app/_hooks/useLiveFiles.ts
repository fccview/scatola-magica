"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFolders } from "@/app/_providers/FoldersProvider";
import { LIVE_EVENTS_PATH, LiveEvent } from "@/app/_lib/live-events";
import { logger } from "@/app/_lib/logger";

const SCOPE = "live-files";
const REFRESH_DEBOUNCE_MS = 400;

export const useLiveFiles = () => {
  const router = useRouter();
  const { refreshFolders } = useFolders();

  useEffect(() => {
    if (typeof EventSource === "undefined") return;

    const source = new EventSource(LIVE_EVENTS_PATH);
    let timer: ReturnType<typeof setTimeout> | null = null;
    let isStale = false;

    const refresh = () => {
      isStale = false;
      router.refresh();
      refreshFolders().catch((error) =>
        logger.warn(SCOPE, "Folder tree refresh failed", error)
      );
    };

    const onChange = () => {
      if (timer) clearTimeout(timer);

      timer = setTimeout(() => {
        timer = null;
        if (document.hidden) {
          isStale = true;
          return;
        }
        refresh();
      }, REFRESH_DEBOUNCE_MS);
    };

    const onVisible = () => {
      if (!document.hidden && isStale) refresh();
    };

    source.addEventListener(LiveEvent.CHANGE, onChange);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      source.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, refreshFolders]);
};
