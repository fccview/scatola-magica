"use client";

import { useState } from "react";
import { getKeyStatus, exportPublicKey } from "@/app/_server/actions/pgp";

interface EncryptionProgress {
  fileName: string;
  progress: number;
  status: "encrypting" | "complete" | "error";
}

export const useClientEncryption = () => {
  const [encryptionProgress, setEncryptionProgress] = useState<
    EncryptionProgress[]
  >([]);
  const [isEncrypting, setIsEncrypting] = useState(false);

  const encryptFiles = async (
    files: FileList,
    useOwnKey: boolean,
    customPublicKey?: string
  ): Promise<File[]> => {
    setIsEncrypting(true);
    const encryptedFiles: File[] = [];

    try {
      if (!window.crypto || !window.crypto.subtle) {
        throw new Error(
          "WebCrypto API is not available. Please use HTTPS or access via localhost."
        );
      }

      const openpgp = await import("openpgp");

      let publicKeyArmored: string;

      if (useOwnKey) {
        const keyStatus = await getKeyStatus();
        if (!keyStatus.hasKeys) {
          throw new Error(
            "No PGP keys found. Please generate keys in Settings first."
          );
        }

        const result = await exportPublicKey();
        if (!result.success || !result.publicKey) {
          throw new Error("Failed to get public key: " + result.message);
        }
        publicKeyArmored = result.publicKey;
      } else {
        if (!customPublicKey) {
          throw new Error("Custom public key is required");
        }
        publicKeyArmored = customPublicKey;
      }

      const publicKey = await openpgp.readKey({ armoredKey: publicKeyArmored });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        setEncryptionProgress((prev) => [
          ...prev.filter((p) => p.fileName !== file.name),
          { fileName: file.name, progress: 0, status: "encrypting" },
        ]);

        try {
          const arrayBuffer = await file.arrayBuffer();
          const fileData = new Uint8Array(arrayBuffer);

          const encrypted = await openpgp.encrypt({
            message: await openpgp.createMessage({
              binary: fileData,
              filename: file.name,
            }),
            encryptionKeys: publicKey,
            format: "armored",
          });

          const encryptedBlob = new Blob([encrypted as string], {
            type: "application/pgp-encrypted",
          });
          const encryptedFile = new File([encryptedBlob], `${file.name}.gpg`, {
            type: "application/pgp-encrypted",
            lastModified: file.lastModified,
          });

          encryptedFiles.push(encryptedFile);

          setEncryptionProgress((prev) =>
            prev.map((p) =>
              p.fileName === file.name
                ? { ...p, progress: 100, status: "complete" }
                : p
            )
          );
        } catch (error) {
          console.error(`Error encrypting ${file.name}:`, error);
          setEncryptionProgress((prev) =>
            prev.map((p) =>
              p.fileName === file.name ? { ...p, status: "error" } : p
            )
          );
          throw new Error(
            `Failed to encrypt ${file.name}: ${error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      return encryptedFiles;
    } finally {
      setIsEncrypting(false);
      setTimeout(() => setEncryptionProgress([]), 3000);
    }
  }

  return {
    encryptFiles,
    encryptionProgress,
    isEncrypting,
  };
}
