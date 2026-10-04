import "server-only";

import crypto from "crypto";
import { findUser } from "@/app/_lib/auth-utils";
import { getUserRecord } from "@/app/_lib/current-user";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PATH_TOKEN_CONTEXT = "scatola-path-token";
const PATH_TOKEN_LENGTH = 22;

export const pathTokenFor = (encryptionKey: string): string =>
  crypto
    .createHmac("sha256", encryptionKey)
    .update(PATH_TOKEN_CONTEXT)
    .digest("base64url")
    .slice(0, PATH_TOKEN_LENGTH);

const _fromBase64Url = (value: string): Buffer => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64 + "=".repeat((4 - (base64.length % 4)) % 4), "base64");
};

const _decodeTokenPath = (encoded: string, key: string): string | null => {
  const decoded = _fromBase64Url(encoded).toString("utf8");

  for (const prefix of [pathTokenFor(key), key]) {
    if (decoded.startsWith(`${prefix}:`)) return decoded.slice(prefix.length + 1);
  }

  return null;
};

const _decodeAesPath = (encoded: string, key: string): string | null => {
  try {
    const combined = _fromBase64Url(encoded);
    if (combined.length < IV_LENGTH + AUTH_TAG_LENGTH) return null;

    const derived = crypto.createHash("sha256").update(key).digest();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      derived,
      combined.subarray(0, IV_LENGTH)
    );
    decipher.setAuthTag(combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH));

    return Buffer.concat([
      decipher.update(combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH)),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return null;
  }
};

export const decryptPathWithKey = (encoded: string, key: string): string =>
  key
    ? _decodeTokenPath(encoded, key) ?? _decodeAesPath(encoded, key) ?? encoded
    : encoded;

export const decryptPath = async (encoded: string): Promise<string> => {
  const user = await getUserRecord();
  return user?.encryptionKey
    ? decryptPathWithKey(encoded, user.encryptionKey)
    : encoded;
};

export const decryptPathFor = async (
  username: string,
  encoded: string
): Promise<string> => {
  const user = await findUser(username);
  return user?.encryptionKey
    ? decryptPathWithKey(encoded, user.encryptionKey)
    : encoded;
};
