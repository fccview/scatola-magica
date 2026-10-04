"use client";

import { useEffect, useState } from "react";
import { peekArchive } from "@/app/_server/actions/archive";
import { logger } from "@/app/_lib/logger";
import { ArchiveListing } from "@/app/_types";

const SCOPE = "archive-viewer";

export const useArchivePeek = (fileId: string) => {
  const [listing, setListing] = useState<ArchiveListing | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await peekArchive(fileId);
        if (!isActive) return;

        if (result.success && result.data) {
          setListing(result.data);
        } else {
          setError(result.error || "Failed to read archive");
        }
      } catch (err) {
        logger.error(SCOPE, "Archive peek failed", err);
        if (isActive) setError("Failed to read archive");
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [fileId]);

  return { listing, error, isLoading };
};
