"use client";

import { useEffect, useState } from "react";
import { useFileBuffer } from "@/app/_hooks/useFileBuffer";
import { logger } from "@/app/_lib/logger";

const SCOPE = "file-parse";

export const useFileParse = <T>(
  fileUrl: string,
  parse: (buffer: ArrayBuffer) => Promise<T>
) => {
  const { buffer, error: loadError } = useFileBuffer(fileUrl);
  const [result, setResult] = useState<T | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!buffer) return;
    let isActive = true;

    const run = async () => {
      setResult(null);
      setParseError(null);

      try {
        const parsed = await parse(buffer);
        if (isActive) setResult(parsed);
      } catch (err) {
        logger.error(SCOPE, "Failed to parse file", err);
        if (isActive) setParseError("This file could not be previewed");
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [buffer, parse]);

  const error = loadError || parseError;

  return { result, error, isLoading: !result && !error };
};
