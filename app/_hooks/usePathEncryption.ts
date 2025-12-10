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

  const decryptPath = useCallback(
    (encryptedPath: string): string => {
      if (!encryptionKey || !encryptedPath) return encryptedPath;

      try {
        const base64 = encryptedPath.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const decoded = atob(padded);

        if (decoded.startsWith(`${encryptionKey}:`)) {
          return decoded.slice(encryptionKey.length + 1);
        }

        return encryptedPath;
      } catch (error) {
        return encryptedPath;
      }
    },
    [encryptionKey]
  );

  return { encryptPath, decryptPath, isEncryptionEnabled: !!encryptionKey };
};
