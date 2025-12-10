import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const _keyFromPwd = async (password: string, salt: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, 600000, 32, "sha256", (err, key) => {
      if (err) reject(err);
      else resolve(key);
    });
  });
};

export const decryptChunk = async (
  encryptedChunk: Buffer,
  password: string
): Promise<Buffer> => {
  const salt = encryptedChunk.subarray(0, SALT_LENGTH);
  const iv = encryptedChunk.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const ciphertextWithTag = encryptedChunk.subarray(SALT_LENGTH + IV_LENGTH);

  const authTag = ciphertextWithTag.subarray(
    ciphertextWithTag.length - AUTH_TAG_LENGTH
  );
  const encryptedContent = ciphertextWithTag.subarray(
    0,
    ciphertextWithTag.length - AUTH_TAG_LENGTH
  );

  const key = await _keyFromPwd(password, salt);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encryptedContent),
    decipher.final(),
  ]);

  return decrypted;
};

export const isChunkEncrypted = (chunk: Buffer): boolean => {
  return chunk.length > SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH;
};
