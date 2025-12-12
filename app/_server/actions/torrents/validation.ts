"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { getKeyStatus } from "@/app/_server/actions/pgp";
import { getEncryptionKey } from "@/app/_server/actions/user";
import { ServerActionResponse } from "@/app/_types";

export const validateEncryptionForTorrents = async (): Promise<
  ServerActionResponse<{ hasEncryption: boolean }>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Check if user has encryption key
    const keyResult = await getEncryptionKey();
    if (!keyResult.hasEncryptionKey) {
      return {
        success: false,
        error: "Encryption must be configured before using torrents. Please set up encryption in Settings.",
        data: { hasEncryption: false },
      };
    }

    // Verify PGP keys exist (respects customKeysPath)
    const keyStatus = await getKeyStatus();
    if (!keyStatus.hasKeys) {
      return {
        success: false,
        error: "PGP keys not found. Please generate or import keys in Settings > Encryption.",
        data: { hasEncryption: false },
      };
    }

    return {
      success: true,
      data: { hasEncryption: true },
    };
  } catch (error) {
    console.error("Encryption validation error:", error);
    return {
      success: false,
      error: "Failed to validate encryption status",
      data: { hasEncryption: false },
    };
  }
};
