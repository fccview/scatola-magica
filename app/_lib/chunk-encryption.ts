"use client";

const ALGORITHM = "AES-GCM";
const KEY_LENGTH = 256;
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH_BITS = 128;
const E2E_PASSWORD_KEY = "e2e-key";

const _getWebCrypto = (): SubtleCrypto => {
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    return window.crypto.subtle;
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  throw new Error("Web Crypto API is not available in this environment");
};

const _getRandomValues = (array: Uint8Array): Uint8Array => {
  if (typeof window !== "undefined" && window.crypto) {
    return window.crypto.getRandomValues(array);
  }
  if (typeof globalThis !== "undefined" && globalThis.crypto) {
    return globalThis.crypto.getRandomValues(array);
  }
  throw new Error("crypto.getRandomValues is not available");
};

const _keyFromPwd = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const subtle = _getWebCrypto();
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const keyMaterial = await subtle.importKey(
    "raw",
    passwordBuffer,
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  const saltBuffer = new ArrayBuffer(salt.length);
  new Uint8Array(saltBuffer).set(salt);

  return subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuffer,
      iterations: 600000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptChunk = async (
  chunk: ArrayBuffer,
  password: string
): Promise<ArrayBuffer> => {
  const subtle = _getWebCrypto();
  const salt = _getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = _getRandomValues(new Uint8Array(IV_LENGTH));
  const key = await _keyFromPwd(password, salt);

  const ivBuffer = new ArrayBuffer(IV_LENGTH);
  new Uint8Array(ivBuffer).set(iv);

  const encryptedContent = await subtle.encrypt(
    {
      name: ALGORITHM,
      iv: ivBuffer,
      tagLength: AUTH_TAG_LENGTH_BITS,
    },
    key,
    chunk
  );

  const result = new Uint8Array(
    SALT_LENGTH + IV_LENGTH + encryptedContent.byteLength
  );
  result.set(salt, 0);
  result.set(iv, SALT_LENGTH);
  result.set(new Uint8Array(encryptedContent), SALT_LENGTH + IV_LENGTH);

  return result.buffer;
};

export const decryptChunk = async (
  encryptedChunk: ArrayBuffer,
  password: string
): Promise<ArrayBuffer> => {
  const subtle = _getWebCrypto();
  const data = new Uint8Array(encryptedChunk);
  const salt = new Uint8Array(data.buffer, data.byteOffset, SALT_LENGTH);
  const iv = new Uint8Array(
    data.buffer,
    data.byteOffset + SALT_LENGTH,
    IV_LENGTH
  );
  const encryptedContent = new Uint8Array(
    data.buffer,
    data.byteOffset + SALT_LENGTH + IV_LENGTH,
    data.length - SALT_LENGTH - IV_LENGTH
  );

  const key = await _keyFromPwd(password, salt);

  return subtle.decrypt(
    {
      name: ALGORITHM,
      iv: iv,
      tagLength: AUTH_TAG_LENGTH_BITS,
    },
    key,
    encryptedContent
  );
};

export const encryptPasswordWithKey = async (
  password: string,
  encryptionKey: string
): Promise<string> => {
  const subtle = _getWebCrypto();
  const encoder = new TextEncoder();

  const keyMaterial = encoder.encode(encryptionKey);
  const keyHash = await subtle.digest("SHA-256", keyMaterial);
  const key = await subtle.importKey(
    "raw",
    keyHash,
    { name: ALGORITHM, length: KEY_LENGTH },
    false,
    ["encrypt"]
  );

  const iv = _getRandomValues(new Uint8Array(IV_LENGTH));
  const ivBuffer = new ArrayBuffer(IV_LENGTH);
  new Uint8Array(ivBuffer).set(iv);

  const passwordBuffer = encoder.encode(password);
  const encryptedContent = await subtle.encrypt(
    {
      name: ALGORITHM,
      iv: ivBuffer,
      tagLength: AUTH_TAG_LENGTH_BITS,
    },
    key,
    passwordBuffer
  );

  const result = new Uint8Array(IV_LENGTH + encryptedContent.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(encryptedContent), IV_LENGTH);

  const base64 = btoa(String.fromCharCode(...result));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
};

export const decryptPasswordWithKey = async (
  encryptedPassword: string,
  encryptionKey: string
): Promise<string | null> => {
  try {
    const subtle = _getWebCrypto();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const base64 = encryptedPassword.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const binaryString = atob(padded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const iv = bytes.slice(0, IV_LENGTH);
    const encryptedContent = bytes.slice(IV_LENGTH);

    const keyMaterial = encoder.encode(encryptionKey);
    const keyHash = await subtle.digest("SHA-256", keyMaterial);
    const key = await subtle.importKey(
      "raw",
      keyHash,
      { name: ALGORITHM, length: KEY_LENGTH },
      false,
      ["decrypt"]
    );

    const ivBuffer = new ArrayBuffer(IV_LENGTH);
    new Uint8Array(ivBuffer).set(iv);

    const decryptedBuffer = await subtle.decrypt(
      {
        name: ALGORITHM,
        iv: ivBuffer,
        tagLength: AUTH_TAG_LENGTH_BITS,
      },
      key,
      encryptedContent
    );

    return decoder.decode(decryptedBuffer);
  } catch {
    return null;
  }
};

export const storeE2EPassword = async (
  password: string,
  encryptionKey: string
): Promise<void> => {
  const encrypted = await encryptPasswordWithKey(password, encryptionKey);
  sessionStorage.setItem(E2E_PASSWORD_KEY, encrypted);
};

export const getStoredE2EPassword = async (
  encryptionKey: string
): Promise<string | null> => {
  const encrypted = sessionStorage.getItem(E2E_PASSWORD_KEY);
  if (!encrypted) return null;
  return await decryptPasswordWithKey(encrypted, encryptionKey);
};

export const clearStoredE2EPassword = (): void => {
  sessionStorage.removeItem(E2E_PASSWORD_KEY);
};

export const hasStoredE2EPassword = (): boolean => {
  return sessionStorage.getItem(E2E_PASSWORD_KEY) !== null;
};
