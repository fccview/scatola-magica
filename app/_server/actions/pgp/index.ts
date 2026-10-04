"use server";

import * as openpgp from "openpgp";
import fs from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/app/_lib/current-user";
import {
  KeyPairInfo,
  METADATA_FILE,
  PRIVATE_KEY_FILE,
  PUBLIC_KEY_FILE,
  keysDirFor,
  readKeyFile,
  readKeyInfo,
  unlockPrivateKey,
} from "@/app/_lib/pgp";
import { auditLog } from "@/app/_lib/audit-log";
import { logger } from "@/app/_lib/logger";

const SCOPE = "pgp-actions";
const ALLOWED_KEY_SIZES = [2048, 3072, 4096];
const NOT_AUTHENTICATED = { success: false, message: "Not authenticated" };

interface MessageResult {
  success: boolean;
  message: string;
}

const _writeKeys = async (
  username: string,
  publicKey: string,
  privateKey: string,
  keyInfo: KeyPairInfo
): Promise<void> => {
  const dir = await keysDirFor(username);
  await fs.mkdir(dir, { recursive: true, mode: 0o700 });
  await fs.writeFile(path.join(dir, PUBLIC_KEY_FILE), publicKey);
  await fs.writeFile(path.join(dir, PRIVATE_KEY_FILE), privateKey, {
    mode: 0o600,
  });
  await fs.writeFile(
    path.join(dir, METADATA_FILE),
    JSON.stringify(keyInfo, null, 2)
  );
};

export const generateKeyPair = async (
  password: string,
  email?: string,
  keySize: number = 4096
): Promise<MessageResult & { keyInfo?: KeyPairInfo }> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;

  if (!ALLOWED_KEY_SIZES.includes(keySize)) {
    return { success: false, message: "Unsupported key size" };
  }

  if (await readKeyInfo(user.username)) {
    return {
      success: false,
      message: "Keys already exist. Delete existing keys first.",
    };
  }

  try {
    const userEmail = email || `${user.username}@scatola.magica`;
    const { privateKey, publicKey } = await openpgp.generateKey({
      type: "rsa",
      rsaBits: keySize,
      userIDs: [{ name: user.username, email: userEmail }],
      passphrase: password,
      format: "armored",
    });

    const pubKey = await openpgp.readKey({ armoredKey: publicKey });
    const keyInfo: KeyPairInfo = {
      username: user.username,
      email: userEmail,
      created: Date.now(),
      algorithm: "RSA",
      keySize,
      fingerprint: pubKey.getFingerprint().toUpperCase(),
    };

    await _writeKeys(user.username, publicKey, privateKey, keyInfo);
    await auditLog("encryption:key_generate", { success: true });

    return { success: true, message: "Key pair generated successfully", keyInfo };
  } catch (error) {
    logger.error(SCOPE, "Failed to generate key pair", error);
    return { success: false, message: "Failed to generate key pair" };
  }
};

export const getKeyStatus = async (): Promise<{
  hasKeys: boolean;
  keyInfo?: KeyPairInfo;
}> => {
  const user = await getCurrentUser();
  if (!user) return { hasKeys: false };

  const keyInfo = await readKeyInfo(user.username);
  return keyInfo ? { hasKeys: true, keyInfo } : { hasKeys: false };
};

export const exportPublicKey = async (): Promise<
  MessageResult & { publicKey?: string }
> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;

  try {
    const publicKey = await readKeyFile(user.username, PUBLIC_KEY_FILE);
    return { success: true, publicKey, message: "Public key exported" };
  } catch (error) {
    logger.warn(SCOPE, "Failed to export public key", error);
    return { success: false, message: "No public key found" };
  }
};

export const exportPrivateKey = async (): Promise<
  MessageResult & { privateKey?: string }
> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;

  try {
    const privateKey = await readKeyFile(user.username, PRIVATE_KEY_FILE);
    await auditLog("encryption:key_export", { success: true });
    return { success: true, privateKey, message: "Private key exported" };
  } catch (error) {
    logger.warn(SCOPE, "Failed to export private key", error);
    return { success: false, message: "No private key found" };
  }
};

export const importKeys = async (
  publicKeyArmored: string,
  privateKeyArmored: string,
  password: string
): Promise<MessageResult & { keyInfo?: KeyPairInfo }> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;

  try {
    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

    if (!(await unlockPrivateKey(privateKeyArmored, password))) {
      return { success: false, message: "Invalid password for private key" };
    }

    const algorithm = publicKey.getAlgorithmInfo();
    const keyInfo: KeyPairInfo = {
      username: user.username,
      email: publicKey.getUserIDs()[0] || `${user.username}@scatola.magica`,
      created: Date.now(),
      algorithm: algorithm.algorithm,
      keySize: "bits" in algorithm ? algorithm.bits ?? 0 : 0,
      fingerprint: publicKey.getFingerprint().toUpperCase(),
    };

    await _writeKeys(user.username, publicKeyArmored, privateKeyArmored, keyInfo);
    await auditLog("encryption:key_import", { success: true });

    return { success: true, message: "Keys imported successfully", keyInfo };
  } catch (error) {
    logger.error(SCOPE, "Failed to import keys", error);
    return { success: false, message: "Failed to import keys" };
  }
};

export const deleteKeys = async (): Promise<MessageResult> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;

  try {
    const dir = await keysDirFor(user.username);

    for (const file of [PUBLIC_KEY_FILE, PRIVATE_KEY_FILE, METADATA_FILE]) {
      await fs.rm(path.join(dir, file), { force: true });
    }
    await fs.rmdir(dir).catch(() => undefined);

    await auditLog("encryption:key_delete", { success: true });
    return { success: true, message: "Keys deleted successfully" };
  } catch (error) {
    logger.error(SCOPE, "Failed to delete keys", error);
    return { success: false, message: "Failed to delete keys" };
  }
};

export const verifyPassword = async (
  password: string
): Promise<MessageResult> => {
  const user = await getCurrentUser();
  if (!user) return NOT_AUTHENTICATED;

  try {
    const armored = await readKeyFile(user.username, PRIVATE_KEY_FILE);
    const unlocked = await unlockPrivateKey(armored, password);

    return unlocked
      ? { success: true, message: "Password is correct" }
      : { success: false, message: "Invalid password" };
  } catch (error) {
    logger.warn(SCOPE, "Failed to verify password", error);
    return { success: false, message: "Invalid password" };
  }
};
