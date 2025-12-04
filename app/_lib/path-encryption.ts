import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;
const ALGORITHM = "aes-256-gcm";

export const isPathEncryptionEnabled = (): boolean => {
  return !!ENCRYPTION_KEY;
};

/**
 * Encrypt a folder path for use in the URI
 * If there's no encryption key this will be disabled.
 * @experimental feature.
 *
 * I'm not sure if this is the best idea or way to do this, but I love it so fuck conventions.
 */
export const encryptPath = (path: string): string => {
  if (!isPathEncryptionEnabled() || !ENCRYPTION_KEY) {
    return path;
  }

  try {
    const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(path, "utf8", "base64url");
    encrypted += cipher.final("base64url");

    const authTag = cipher.getAuthTag();

    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, "base64url"),
    ]);

    return combined.toString("base64url");
  } catch (error) {
    console.error("Failed to encrypt path:", error);
    return path;
  }
};

/**
 * Decrypt a folder path from the URI
 * If there's no encryption key this will be disabled.
 * @experimental feature.
 *
 * I'm not sure if this is the best idea or way to do this, but I love it so fuck conventions.
 */
export function decryptPath(encryptedPath: string): string {
  if (!isPathEncryptionEnabled() || !ENCRYPTION_KEY) {
    return encryptedPath;
  }

  try {
    const base64 = encryptedPath.replace(/-/g, "+").replace(/_/g, "/");

    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

    try {
      const decoded = Buffer.from(padded, "base64").toString("utf8");

      if (decoded.includes(":")) {
        const [key, ...pathParts] = decoded.split(":");
        const path = pathParts.join(":");

        if (key === ENCRYPTION_KEY) {
          return path;
        }
      }
    } catch (btoaError) {}

    try {
      const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
      const combined = Buffer.from(padded, "base64");

      if (combined.length < 28) {
        throw new Error("Invalid encrypted data length");
      }

      const iv = combined.slice(0, 12);
      const authTag = combined.slice(12, 28);
      const encrypted = combined.slice(28);

      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(
        encrypted.toString("base64url"),
        "base64url",
        "utf8"
      );
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (aesError) {}

    return encryptedPath;
  } catch (error) {
    return encryptedPath;
  }
}
