"use client";

import { useCallback } from "react";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

/**
 * Client-side hook for encrypting paths before navigation
 */
export function usePathEncryption() {
  const { encryptionKey } = usePreferences();

  const encryptPath = useCallback(
    (path: string): string => {
      if (!encryptionKey || !path) return path;

      try {
        // Simple synchronous encryption using btoa
        // This is obfuscation, not cryptographic security
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
