import { UPLOAD_CONFIG, ADAPTIVE_CHUNK_SIZES } from "@/app/_lib/constants";
import { UploadProgress } from "@/app/_types";
import { UploadStatus } from "@/app/_types/enums";

export interface E2EEncryptionOptions {
  enabled: boolean;
  password: string;
}

export class ChunkedUploader {
  private file: File;
  private uploadId: string;
  private chunkSize: number;
  private totalChunks: number = 0;
  private uploadedChunks: Set<number> = new Set();
  private onProgressCallback?: (progress: UploadProgress) => void;
  private startTime: number = 0;
  private uploadedBytes: number = 0;
  private abortController: AbortController | null = null;
  private folderPath?: string;
  private e2eEncryption?: E2EEncryptionOptions;
  private serverProgress: number = 0;
  private encryptionKey?: CryptoKey;
  private encryptionSalt?: Uint8Array;

  constructor(
    file: File,
    existingUploadId?: string,
    alreadyUploadedChunks?: number[],
    folderPath?: string,
    e2eEncryption?: E2EEncryptionOptions
  ) {
    this.file = file;
    this.uploadId = existingUploadId || this.generateUploadId(file);
    this.chunkSize = ADAPTIVE_CHUNK_SIZES.FAST;
    this.folderPath = folderPath;
    this.e2eEncryption = e2eEncryption;
    if (alreadyUploadedChunks) {
      this.uploadedChunks = new Set(alreadyUploadedChunks);
      this.uploadedBytes = 0;
    }
  }

  private generateUploadId(file: File): string {
    const sanitized = file.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const hash = `${file.size}-${file.lastModified}`;
    return `${sanitized}-${hash}`;
  }

  onProgress(callback: (progress: UploadProgress) => void): void {
    this.onProgressCallback = callback;
  }

  getUploadId(): string {
    return this.uploadId;
  }

  static async checkForExistingUpload(uploadId: string): Promise<{
    exists: boolean;
    uploadedChunks?: number[];
    progress?: number;
    fileName?: string;
    fileSize?: number;
    totalChunks?: number;
    createdAt?: number;
    e2eEncrypted?: boolean;
    chunkSize?: number;
  }> {
    try {
      const response = await fetch("/api/upload/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadId }),
      });

      if (!response.ok) return { exists: false };
      return await response.json();
    } catch (error) {
      console.error("Failed to check upload status:", error);
      return { exists: false };
    }
  }

  async upload(): Promise<string> {
    this.startTime = Date.now();
    this.abortController = new AbortController();

    try {
      if (this.e2eEncryption?.enabled) {
        if (!window.isSecureContext) {
          throw new Error(
            "E2E encryption requires HTTPS or localhost. " +
            "Current context is not secure (HTTP with IP/domain). " +
            "Files would upload UNENCRYPTED."
          );
        }
        if (!window.crypto?.subtle) {
          throw new Error(
            "Web Crypto API (crypto.subtle) is not available. " +
            "E2E encryption cannot be used in this browser/context."
          );
        }
      }

      await this.detectOptimalChunkSize();

      this.totalChunks = Math.ceil(this.file.size / this.chunkSize);

      if (this.e2eEncryption?.enabled && this.e2eEncryption.password) {
        await this.deriveEncryptionKey(this.e2eEncryption.password);
      }

      const existingUpload = await ChunkedUploader.checkForExistingUpload(this.uploadId);
      if (existingUpload.exists && existingUpload.uploadedChunks) {
        if (existingUpload.chunkSize) {
          this.chunkSize = existingUpload.chunkSize;
        }
        existingUpload.uploadedChunks.forEach(chunkIndex => {
          this.uploadedChunks.add(chunkIndex);
        });
        this.uploadedBytes = existingUpload.uploadedChunks.reduce((total, chunkIndex) => {
          const start = chunkIndex * this.chunkSize;
          const end = Math.min(start + this.chunkSize, this.file.size);
          return total + (end - start);
        }, 0);
      }

      if (this.onProgressCallback) {
        this.onProgressCallback({
          fileId: this.uploadId,
          fileName: this.file.name,
          totalSize: this.file.size,
          uploadedSize: this.uploadedBytes,
          progress: (this.uploadedBytes / this.file.size) * 100,
          status: UploadStatus.UPLOADING,
          speed: 0,
          remainingTime: 0,
          chunksCompleted: this.uploadedChunks.size,
          totalChunks: this.totalChunks,
        });
      }

      if (!existingUpload.exists) {
        await this.initializeUploadSession();
      }

      await this.uploadChunksInParallel();

      const result = await this.finalizeUpload();

      return result.fileId;
    } catch (error) {
      throw error;
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private async detectOptimalChunkSize(): Promise<void> {
    const isLocalNetwork =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10.") ||
      window.location.hostname.startsWith("172.");

    if (isLocalNetwork) {
      this.chunkSize = ADAPTIVE_CHUNK_SIZES.ULTRA_FAST;
      return;
    }

    if ("connection" in navigator) {
      const connection = (navigator as any).connection;
      const effectiveType = connection?.effectiveType;
      const downlink = connection?.downlink;

      if (downlink) {
        if (downlink >= 100) {
          this.chunkSize = ADAPTIVE_CHUNK_SIZES.ULTRA_FAST;
          return;
        } else if (downlink >= 50) {
          this.chunkSize = ADAPTIVE_CHUNK_SIZES.FAST;
          return;
        } else if (downlink >= 10) {
          this.chunkSize = ADAPTIVE_CHUNK_SIZES.MEDIUM;
          return;
        }
      }

      switch (effectiveType) {
        case "slow-2g":
        case "2g":
          this.chunkSize = ADAPTIVE_CHUNK_SIZES.SLOW;
          return;
        case "3g":
          this.chunkSize = ADAPTIVE_CHUNK_SIZES.MEDIUM;
          return;
        case "4g":
          this.chunkSize = ADAPTIVE_CHUNK_SIZES.FAST;
          return;
      }
    }

    this.chunkSize = ADAPTIVE_CHUNK_SIZES.FAST;
  }

  private async deriveEncryptionKey(password: string): Promise<void> {
    const subtle = window.crypto.subtle;
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await subtle.importKey(
      "raw",
      passwordBuffer,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    this.encryptionSalt = window.crypto.getRandomValues(new Uint8Array(16));
    const saltBuffer = new ArrayBuffer(this.encryptionSalt.length);
    new Uint8Array(saltBuffer).set(this.encryptionSalt);

    this.encryptionKey = await subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 600000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );
  }

  private async initializeUploadSession(): Promise<void> {
    const response = await fetch("/api/upload/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: this.uploadId,
        fileName: this.file.name,
        fileSize: this.file.size,
        totalChunks: this.totalChunks,
        chunkSize: this.chunkSize,
        folderPath: this.folderPath,
        e2eEncrypted: this.e2eEncryption?.enabled ?? false,
        e2ePassword: this.e2eEncryption?.enabled
          ? this.e2eEncryption.password
          : undefined,
        e2eSalt: this.encryptionSalt
          ? Array.from(this.encryptionSalt)
          : undefined,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const errorMsg = errorText || response.statusText;
      console.error(`Init failed (${response.status}):`, errorMsg);
      throw new Error(`Failed to initialize upload session: ${errorMsg}`);
    }

    const result = await response.json();
    if (!result.success) {
      console.error("Init returned error:", result.error);
      throw new Error(`Failed to initialize upload: ${result.error}`);
    }
  }

  private async uploadChunksInParallel(): Promise<void> {
    const queue: number[] = [];
    for (let i = 0; i < this.totalChunks; i++) {
      if (!this.uploadedChunks.has(i)) {
        queue.push(i);
      }
    }

    const workers: Promise<void>[] = [];
    for (let i = 0; i < UPLOAD_CONFIG.PARALLEL_UPLOADS; i++) {
      workers.push(this.uploadWorker(queue));
    }

    await Promise.all(workers);
  }

  private async uploadWorker(queue: number[]): Promise<void> {
    while (queue.length > 0) {
      const index = queue.shift();
      if (index === undefined) break;

      const start = index * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const chunk = this.file.slice(start, end);

      let retries = 0;
      while (retries < UPLOAD_CONFIG.CHUNK_RETRY_ATTEMPTS) {
        try {
          await this.uploadChunk(index, chunk);
          this.uploadedChunks.add(index);
          this.uploadedBytes += chunk.size;
          this.updateProgress();
          break;
        } catch (error) {
          retries++;
          if (retries >= UPLOAD_CONFIG.CHUNK_RETRY_ATTEMPTS) {
            throw new Error(
              `Failed to upload chunk ${index} after ${retries} attempts`
            );
          }
          await this.delay(
            Math.pow(2, retries) * UPLOAD_CONFIG.CHUNK_RETRY_DELAY_MS
          );
        }
      }
    }
  }

  private async uploadChunk(index: number, chunk: Blob): Promise<void> {
    let chunkToUpload: Blob = chunk;

    if (this.e2eEncryption?.enabled && this.encryptionKey) {
      try {
        const arrayBuffer = await chunk.arrayBuffer();
        const subtle = window.crypto.subtle;
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const ivBuffer = new ArrayBuffer(iv.length);
        new Uint8Array(ivBuffer).set(iv);

        const encryptedContent = await subtle.encrypt(
          {
            name: "AES-GCM",
            iv: ivBuffer,
            tagLength: 128,
          },
          this.encryptionKey,
          arrayBuffer
        );

        const result = new Uint8Array(
          this.encryptionSalt!.length + iv.length + encryptedContent.byteLength
        );
        result.set(this.encryptionSalt!, 0);
        result.set(iv, this.encryptionSalt!.length);
        result.set(new Uint8Array(encryptedContent), this.encryptionSalt!.length + iv.length);

        chunkToUpload = new Blob([result.buffer]);
      } catch (encryptError) {
        console.error("Encryption error:", encryptError);
        throw new Error(
          `Failed to encrypt chunk ${index}: ${encryptError instanceof Error ? encryptError.message : "Unknown error"}`
        );
      }
    }

    const formData = new FormData();
    formData.append("uploadId", this.uploadId);
    formData.append("chunkIndex", index.toString());
    formData.append("totalChunks", this.totalChunks.toString());
    formData.append("fileName", this.file.name);
    formData.append("chunk", chunkToUpload);

    const response = await fetch("/api/upload/chunk", {
      method: "POST",
      body: formData,
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `Chunk ${index} upload failed with status ${response.status}: ${errorText}`
      );
    }

    const result = await response.json();
    if (result.data?.progress !== undefined) {
      this.serverProgress = result.data.progress;
    }
  }

  private async finalizeUpload(): Promise<{ fileId: string }> {
    const response = await fetch("/api/upload/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: this.uploadId,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const errorMsg = errorText || response.statusText;
      console.error(`Finalize failed (${response.status}):`, errorMsg);
      throw new Error(`Failed to finalize upload: ${errorMsg}`);
    }

    const result = await response.json();

    if (!result.success) {
      console.error("Finalize returned error:", result.error);
      throw new Error(`Failed to finalize: ${result.error}`);
    }

    if (result.data?.fileId) {
      return { fileId: result.data.fileId };
    }

    throw new Error("No file ID returned from finalize");
  }

  private updateProgress(): void {
    if (!this.onProgressCallback) return;

    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const progress = this.serverProgress > 0
      ? this.serverProgress
      : (this.uploadedBytes / this.file.size) * 100;

    const uploadedSize = this.serverProgress > 0
      ? (this.serverProgress / 100) * this.file.size
      : this.uploadedBytes;

    const speed = uploadedSize / elapsedTime;
    const remainingBytes = this.file.size - uploadedSize;
    const remainingTime = speed > 0 ? remainingBytes / speed : 0;

    this.onProgressCallback({
      fileId: this.uploadId,
      fileName: this.file.name,
      totalSize: this.file.size,
      uploadedSize,
      progress,
      status: UploadStatus.UPLOADING,
      speed,
      remainingTime,
      chunksCompleted: this.uploadedChunks.size,
      totalChunks: this.totalChunks,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
