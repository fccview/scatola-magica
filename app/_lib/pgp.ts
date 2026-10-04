import "server-only";

import * as openpgp from "openpgp";
import fs from "fs/promises";
import path from "path";
import { KEYS_DIR } from "@/app/_lib/data-paths";
import { getUserPreferences } from "@/app/_lib/preferences-store";
import { isInside } from "@/app/_lib/storage";
import { logger } from "@/app/_lib/logger";

const SCOPE = "pgp";

export const PUBLIC_KEY_FILE = "public.asc";
export const PRIVATE_KEY_FILE = "private.asc.enc";
export const METADATA_FILE = "metadata.json";

export interface KeyPairInfo {
  username: string;
  email: string;
  created: number;
  algorithm: string;
  keySize: number;
  fingerprint: string;
}

export interface CryptoResult<T> {
  success: boolean;
  message: string;
  data?: T;
}

export const keysDirFor = async (username: string): Promise<string> => {
  const { customKeysPath } = await getUserPreferences(username);
  const base = customKeysPath ? path.resolve(customKeysPath) : KEYS_DIR;
  const dir = path.resolve(base, username);

  if (!isInside(base, dir) || dir === base) {
    throw new Error("Invalid keys directory");
  }

  return dir;
};

export const readKeyFile = async (
  username: string,
  file: string
): Promise<string> => {
  const dir = await keysDirFor(username);
  return fs.readFile(path.join(dir, file), "utf-8");
};

export const readKeyInfo = async (
  username: string
): Promise<KeyPairInfo | null> => {
  try {
    return JSON.parse(await readKeyFile(username, METADATA_FILE));
  } catch {
    return null;
  }
};

export const unlockPrivateKey = async (
  armoredKey: string,
  passphrase: string
): Promise<openpgp.PrivateKey | null> => {
  try {
    const privateKey = await openpgp.readPrivateKey({ armoredKey });
    return await openpgp.decryptKey({ privateKey, passphrase });
  } catch {
    return null;
  }
};

export const encryptFor = async (
  username: string,
  data: Uint8Array,
  filename: string,
  customPublicKey?: string
): Promise<CryptoResult<string>> => {
  try {
    const armoredKey =
      customPublicKey || (await readKeyFile(username, PUBLIC_KEY_FILE));
    const encryptionKeys = await openpgp.readKey({ armoredKey });

    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ binary: data, filename }),
      encryptionKeys,
      format: "armored",
    });

    return { success: true, message: "Encrypted", data: encrypted as string };
  } catch (error) {
    logger.error(SCOPE, `Encryption failed for ${username}`, error);
    return { success: false, message: "Failed to encrypt data" };
  }
};

export const decryptFor = async (
  username: string,
  armoredMessage: string,
  password: string,
  customPrivateKey?: string
): Promise<CryptoResult<Uint8Array>> => {
  try {
    const armoredKey =
      customPrivateKey || (await readKeyFile(username, PRIVATE_KEY_FILE));
    const decryptionKeys = await unlockPrivateKey(armoredKey, password);

    if (!decryptionKeys) {
      return { success: false, message: "Invalid password" };
    }

    const message = await openpgp.readMessage({ armoredMessage });
    const { data } = await openpgp.decrypt({
      message,
      decryptionKeys,
      format: "binary",
    });

    return { success: true, message: "Decrypted", data: data as Uint8Array };
  } catch (error) {
    logger.error(SCOPE, `Decryption failed for ${username}`, error);
    return { success: false, message: "Failed to decrypt data" };
  }
};

export const encryptJsonFor = (
  username: string,
  json: string
): Promise<CryptoResult<string>> =>
  encryptFor(username, new TextEncoder().encode(json), METADATA_FILE);

export const decryptJsonFor = async (
  username: string,
  armoredMessage: string,
  password: string
): Promise<CryptoResult<string>> => {
  const result = await decryptFor(username, armoredMessage, password);
  if (!result.success || !result.data) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    message: result.message,
    data: new TextDecoder().decode(result.data),
  };
};
