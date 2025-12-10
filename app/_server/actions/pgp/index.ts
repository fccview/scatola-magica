"use server";

if (typeof globalThis.crypto === "undefined") {
  const { webcrypto } = require("crypto");
  globalThis.crypto = webcrypto;
}

import * as openpgp from "openpgp";
import fs from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/app/_server/actions/user";

const KEYS_DIR =
  process.env.KEYS_DIR || path.join(process.cwd(), "data/config/keys");

interface KeyPairInfo {
  username: string;
  email: string;
  created: number;
  algorithm: string;
  keySize: number;
  fingerprint: string;
}

interface GenerateKeyPairResult {
  success: boolean;
  message: string;
  keyInfo?: KeyPairInfo;
}

interface KeyStatusResult {
  hasKeys: boolean;
  keyInfo?: KeyPairInfo;
}

interface EncryptFileResult {
  success: boolean;
  message: string;
  encryptedData?: string;
}

interface DecryptFileResult {
  success: boolean;
  message: string;
  decryptedData?: Uint8Array;
}

const _getUserKeysDir = (username: string, customPath?: string): string => {
  if (customPath) {
    return path.join(customPath, username);
  }
  return path.join(KEYS_DIR, username);
};

const _ensureKeysDir = async (keysDir: string): Promise<void> => {
  await fs.mkdir(keysDir, { recursive: true });
};

export const generateKeyPair = async (
  password: string,
  email?: string,
  customPath?: string,
  keySize: number = 4096
): Promise<GenerateKeyPairResult> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const username = user.username;
    const userEmail = email || `${username}@scatola.magica`;
    const keysDir = _getUserKeysDir(username, customPath);

    await _ensureKeysDir(keysDir);

    const publicKeyPath = path.join(keysDir, "public.asc");
    const privateKeyPath = path.join(keysDir, "private.asc.enc");

    try {
      await fs.access(publicKeyPath);
      return {
        success: false,
        message: "Keys already exist. Delete existing keys first.",
      };
    } catch {}

    const { privateKey, publicKey } = await openpgp.generateKey({
      type: "rsa",
      rsaBits: keySize,
      userIDs: [{ name: username, email: userEmail }],
      passphrase: password,
      format: "armored",
    });

    await fs.writeFile(publicKeyPath, publicKey);

    await fs.writeFile(privateKeyPath, privateKey);

    const pubKey = await openpgp.readKey({ armoredKey: publicKey });
    const keyInfo: KeyPairInfo = {
      username,
      email: userEmail,
      created: Date.now(),
      algorithm: "RSA",
      keySize,
      fingerprint: pubKey.getFingerprint().toUpperCase(),
    };

    const metadataPath = path.join(keysDir, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(keyInfo, null, 2));

    return {
      success: true,
      message: "Key pair generated successfully",
      keyInfo,
    };
  } catch (error) {
    console.error("Error generating key pair:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to generate key pair",
    };
  }
};

export const getKeyStatus = async (
  customPath?: string
): Promise<KeyStatusResult> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { hasKeys: false };
    }

    const keysDir = _getUserKeysDir(user.username, customPath);
    const metadataPath = path.join(keysDir, "metadata.json");

    try {
      const metadataContent = await fs.readFile(metadataPath, "utf-8");
      const keyInfo: KeyPairInfo = JSON.parse(metadataContent);
      return { hasKeys: true, keyInfo };
    } catch {
      return { hasKeys: false };
    }
  } catch (error) {
    console.error("Error getting key status:", error);
    return { hasKeys: false };
  }
};

export const exportPublicKey = async (
  customPath?: string
): Promise<{ success: boolean; publicKey?: string; message: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const keysDir = _getUserKeysDir(user.username, customPath);
    const publicKeyPath = path.join(keysDir, "public.asc");

    const publicKey = await fs.readFile(publicKeyPath, "utf-8");
    return { success: true, publicKey, message: "Public key exported" };
  } catch (error) {
    console.error("Error exporting public key:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to export public key",
    };
  }
};

export const exportPrivateKey = async (
  customPath?: string
): Promise<{ success: boolean; privateKey?: string; message: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const keysDir = _getUserKeysDir(user.username, customPath);
    const privateKeyPath = path.join(keysDir, "private.asc.enc");

    const privateKey = await fs.readFile(privateKeyPath, "utf-8");
    return { success: true, privateKey, message: "Private key exported" };
  } catch (error) {
    console.error("Error exporting private key:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to export private key",
    };
  }
};

export const importKeys = async (
  publicKeyArmored: string,
  privateKeyArmored: string,
  password: string,
  customPath?: string
): Promise<{ success: boolean; message: string; keyInfo?: KeyPairInfo }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });
    const privateKey = await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored,
    });

    try {
      await openpgp.decryptKey({ privateKey, passphrase: password });
    } catch {
      return { success: false, message: "Invalid password for private key" };
    }

    const keysDir = _getUserKeysDir(user.username, customPath);
    await _ensureKeysDir(keysDir);

    const publicKeyPath = path.join(keysDir, "public.asc");
    const privateKeyPath = path.join(keysDir, "private.asc.enc");

    await fs.writeFile(publicKeyPath, publicKeyArmored);
    await fs.writeFile(privateKeyPath, privateKeyArmored);

    const userIDs = publicKey.getUserIDs();
    const keyInfo: KeyPairInfo = {
      username: user.username,
      email: userIDs[0] || `${user.username}@scatola.magica`,
      created: Date.now(),
      algorithm: publicKey.getAlgorithmInfo().algorithm,
      keySize: publicKey.getAlgorithmInfo().bits || 0,
      fingerprint: publicKey.getFingerprint().toUpperCase(),
    };

    const metadataPath = path.join(keysDir, "metadata.json");
    await fs.writeFile(metadataPath, JSON.stringify(keyInfo, null, 2));

    return { success: true, message: "Keys imported successfully", keyInfo };
  } catch (error) {
    console.error("Error importing keys:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to import keys",
    };
  }
};

export const deleteKeys = async (
  customPath?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const keysDir = _getUserKeysDir(user.username, customPath);

    const publicKeyPath = path.join(keysDir, "public.asc");
    const privateKeyPath = path.join(keysDir, "private.asc.enc");
    const metadataPath = path.join(keysDir, "metadata.json");

    try {
      await fs.unlink(publicKeyPath);
    } catch {}

    try {
      await fs.unlink(privateKeyPath);
    } catch {}

    try {
      await fs.unlink(metadataPath);
    } catch {}

    try {
      await fs.rmdir(keysDir);
    } catch {}

    return { success: true, message: "Keys deleted successfully" };
  } catch (error) {
    console.error("Error deleting keys:", error);
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete keys",
    };
  }
};

export const encryptFileData = async (
  fileData: Uint8Array,
  filename: string,
  customPath?: string,
  customPublicKey?: string
): Promise<EncryptFileResult> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    let publicKeyArmored: string;

    if (customPublicKey) {
      publicKeyArmored = customPublicKey;
    } else {
      const keysDir = _getUserKeysDir(user.username, customPath);
      const publicKeyPath = path.join(keysDir, "public.asc");
      publicKeyArmored = await fs.readFile(publicKeyPath, "utf-8");
    }

    const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

    const encrypted = await openpgp.encrypt({
      message: await openpgp.createMessage({ binary: fileData, filename }),
      encryptionKeys: publicKey,
      format: "armored",
    });

    return {
      success: true,
      message: "File encrypted successfully",
      encryptedData: encrypted as string,
    };
  } catch (error) {
    console.error("Error encrypting file:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to encrypt file",
    };
  }
};

export const decryptFileData = async (
  encryptedData: string,
  password: string,
  customPath?: string,
  customPrivateKey?: string
): Promise<DecryptFileResult> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    let privateKeyArmored: string;

    if (customPrivateKey) {
      privateKeyArmored = customPrivateKey;
    } else {
      const keysDir = _getUserKeysDir(user.username, customPath);
      const privateKeyPath = path.join(keysDir, "private.asc.enc");
      privateKeyArmored = await fs.readFile(privateKeyPath, "utf-8");
    }

    const encryptedPrivateKey = await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored,
    });

    let decryptedPrivateKey;
    try {
      decryptedPrivateKey = await openpgp.decryptKey({
        privateKey: encryptedPrivateKey,
        passphrase: password,
      });
    } catch {
      return { success: false, message: "Invalid password" };
    }

    const message = await openpgp.readMessage({
      armoredMessage: encryptedData,
    });

    const { data: decrypted } = await openpgp.decrypt({
      message,
      decryptionKeys: decryptedPrivateKey,
      format: "binary",
    });

    return {
      success: true,
      message: "File decrypted successfully",
      decryptedData: decrypted as Uint8Array,
    };
  } catch (error) {
    console.error("Error decrypting file:", error);
    return {
      success: false,
      message:
        error instanceof Error ? error.message : "Failed to decrypt file",
    };
  }
};

export const verifyPassword = async (
  password: string,
  customPath?: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, message: "Not authenticated" };
    }

    const keysDir = _getUserKeysDir(user.username, customPath);
    const privateKeyPath = path.join(keysDir, "private.asc.enc");

    const privateKeyArmored = await fs.readFile(privateKeyPath, "utf-8");
    const encryptedPrivateKey = await openpgp.readPrivateKey({
      armoredKey: privateKeyArmored,
    });

    await openpgp.decryptKey({
      privateKey: encryptedPrivateKey,
      passphrase: password,
    });

    return { success: true, message: "Password is correct" };
  } catch {
    return { success: false, message: "Invalid password" };
  }
};
