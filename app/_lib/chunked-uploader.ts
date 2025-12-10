import { UPLOAD_CONFIG, ADAPTIVE_CHUNK_SIZES } from "@/app/_lib/constants";
import { UploadProgress } from "@/app/_types";
import { UploadStatus } from "@/app/_types/enums";
import { encryptChunk } from "@/app/_lib/chunk-encryption";

export interface E2EEncryptionOptions {
  enabled: boolean;
  password: string;
}

export class ChunkedUploader {
  private file: File;
  private uploadId: string;
  private chunkSize: number;
  private chunks: Blob[] = [];
  private uploadedChunks: Set<number> = new Set();
  private onProgressCallback?: (progress: UploadProgress) => void;
  private startTime: number = 0;
  private uploadedBytes: number = 0;
  private abortController: AbortController | null = null;
  private folderPath?: string;
  private e2eEncryption?: E2EEncryptionOptions;

  constructor(
    file: File,
    existingUploadId?: string,
    alreadyUploadedChunks?: number[],
    folderPath?: string,
    e2eEncryption?: E2EEncryptionOptions
  ) {
    this.file = file;
    this.uploadId =
      existingUploadId ||
      `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    this.chunkSize = ADAPTIVE_CHUNK_SIZES.FAST;
    this.folderPath = folderPath;
    this.e2eEncryption = e2eEncryption;
    if (alreadyUploadedChunks) {
      this.uploadedChunks = new Set(alreadyUploadedChunks);
      this.uploadedBytes = alreadyUploadedChunks.reduce((total, chunkIndex) => {
        const start = chunkIndex * this.chunkSize;
        const end = Math.min(start + this.chunkSize, this.file.size);
        return total + (end - start);
      }, 0);
    }
  }

  onProgress(callback: (progress: UploadProgress) => void): void {
    this.onProgressCallback = callback;
  }

  async upload(): Promise<string> {
    this.startTime = Date.now();
    this.abortController = new AbortController();

    try {
      await this.detectOptimalChunkSize();

      this.createChunks();

      if (this.onProgressCallback) {
        this.onProgressCallback({
          fileId: this.uploadId,
          fileName: this.file.name,
          totalSize: this.file.size,
          uploadedSize: 0,
          progress: 0,
          status: UploadStatus.UPLOADING,
          speed: 0,
          remainingTime: 0,
          chunksCompleted: 0,
          totalChunks: this.chunks.length,
        });
      }

      await this.initializeUploadSession();

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

  private createChunks(): void {
    const totalChunks = Math.ceil(this.file.size / this.chunkSize);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      this.chunks.push(this.file.slice(start, end));
    }
  }

  private async initializeUploadSession(): Promise<void> {
    const response = await fetch("/api/upload/init", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uploadId: this.uploadId,
        fileName: this.file.name,
        fileSize: this.file.size,
        totalChunks: this.chunks.length,
        folderPath: this.folderPath,
        e2eEncrypted: this.e2eEncryption?.enabled ?? false,
        e2ePassword: this.e2eEncryption?.enabled
          ? this.e2eEncryption.password
          : undefined,
      }),
      signal: this.abortController?.signal,
    });

    if (!response.ok) {
      throw new Error("Failed to initialize upload session");
    }
  }

  private async uploadChunksInParallel(): Promise<void> {
    const queue = [...this.chunks.entries()].filter(
      ([index]) => !this.uploadedChunks.has(index)
    );
    const workers: Promise<void>[] = [];

    for (let i = 0; i < UPLOAD_CONFIG.PARALLEL_UPLOADS; i++) {
      workers.push(this.uploadWorker(queue));
    }

    await Promise.all(workers);
  }

  private async uploadWorker(queue: [number, Blob][]): Promise<void> {
    while (queue.length > 0) {
      const entry = queue.shift();
      if (!entry) break;

      const [index, chunk] = entry;

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

    if (this.e2eEncryption?.enabled && this.e2eEncryption.password) {
      try {
        const arrayBuffer = await chunk.arrayBuffer();
        const encryptedBuffer = await encryptChunk(
          arrayBuffer,
          this.e2eEncryption.password
        );
        chunkToUpload = new Blob([encryptedBuffer]);
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
    formData.append("totalChunks", this.chunks.length.toString());
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
      throw new Error("Failed to finalize upload");
    }

    const result = await response.json();
    if (result.data?.fileId) {
      return { fileId: result.data.fileId };
    }
    return result;
  }

  private updateProgress(): void {
    if (!this.onProgressCallback) return;

    const elapsedTime = (Date.now() - this.startTime) / 1000;
    const progress = (this.uploadedBytes / this.file.size) * 100;
    const speed = this.uploadedBytes / elapsedTime;
    const remainingBytes = this.file.size - this.uploadedBytes;
    const remainingTime = remainingBytes / speed;

    this.onProgressCallback({
      fileId: this.uploadId,
      fileName: this.file.name,
      totalSize: this.file.size,
      uploadedSize: this.uploadedBytes,
      progress,
      status: UploadStatus.UPLOADING,
      speed,
      remainingTime,
      chunksCompleted: this.uploadedChunks.size,
      totalChunks: this.chunks.length,
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
