"use client";

import { useCallback } from "react";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

export const usePathEncryption = () => {
  const { pathToken } = usePreferences();

  const encryptPath = useCallback(
    (path: string): string => {
      if (!pathToken || !path) return path;

      try {
        const bytes = new TextEncoder().encode(`${pathToken}:${path}`);
        return btoa(String.fromCharCode(...bytes))
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=/g, "");
      } catch (error) {
        console.error("Failed to encrypt path:", error);
        return path;
      }
    },
    [pathToken]
  );

  const decryptPath = useCallback(
    (encryptedPath: string): string => {
      if (!pathToken || !encryptedPath) return encryptedPath;

      try {
        const base64 = encryptedPath.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
        const binary = atob(padded);
        const decoded = new TextDecoder().decode(
          Uint8Array.from(binary, (char) => char.charCodeAt(0))
        );

        if (decoded.startsWith(`${pathToken}:`)) {
          return decoded.slice(pathToken.length + 1);
        }

        return encryptedPath;
      } catch (error) {
        return encryptedPath;
      }
    },
    [pathToken]
  );

  return { encryptPath, decryptPath, isEncryptionEnabled: !!pathToken };
};
