"use client";

import { useEffect, useState } from "react";
import { logger } from "@/app/_lib/logger";

const SCOPE = "file-buffer";

export const useFileBuffer = (fileUrl: string) => {
  const [buffer, setBuffer] = useState<ArrayBuffer | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      setBuffer(null);
      setError(null);

      try {
        const response = await fetch(fileUrl, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        setBuffer(await response.arrayBuffer());
      } catch (err) {
        if (controller.signal.aborted) return;
        logger.error(SCOPE, "Failed to load file", err);
        setError("Failed to load file");
      }
    };

    load();

    return () => controller.abort();
  }, [fileUrl]);

  return { buffer, error, isLoading: !buffer && !error };
};
