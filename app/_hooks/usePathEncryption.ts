"use client";

import { useCallback } from "react";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

export const usePathEncryption = () => {
  const { encryptionKey } = usePreferences();

  const encryptPath = useCallback(
    (path: string): string => {
      if (!encryptionKey || !path) return path;

      try {
        const combined = `${encryptionKey}:${path}`;
        return btoa(combined)
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
      } catch (error) {
        console.error("Failed to encrypt path:", error);
        return path;
      }
    },
    [encryptionKey]
  );

  return { encryptPath, isEncryptionEnabled: !!encryptionKey };
}
