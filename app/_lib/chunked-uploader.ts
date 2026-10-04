import {
  UPLOAD_CONFIG,
  ADAPTIVE_CHUNK_SIZES,
  UPLOAD_QUEUE,
} from "@/app/_lib/constants";
import { UploadProgress } from "@/app/_types";
import { ChunkState, UploadPhase, UploadStatus } from "@/app/_types/enums";
import { logger } from "@/app/_lib/logger";

const SCOPE = "chunked-uploader";

export interface E2EEncryptionOptions {
  enabled: boolean;
  password: string;
}

interface NetworkHints {
  connection?: {
    effectiveType?: string;
    downlink?: number;
  };
}

interface SpeedSample {
  time: number;
  bytes: number;
}

interface ForgedKey {
  password: string;
  salt: Uint8Array;
  key: Promise<CryptoKey>;
}

let forgedKey: ForgedKey | null = null;

const _deriveKey = async (
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> => {
  const subtle = window.crypto.subtle;
  const keyMaterial = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
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
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
};

const forgeKey = async (
  password: string
): Promise<{ salt: Uint8Array; key: CryptoKey }> => {
  if (forgedKey?.password !== password) {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    forgedKey = { password, salt, key: _deriveKey(password, salt) };
  }

  const entry = forgedKey;
  try {
    return { salt: entry.salt, key: await entry.key };
  } catch (error) {
    logger.error(SCOPE, "Failed to derive encryption key", error);
    if (forgedKey === entry) forgedKey = null;
    throw error;
  }
};

export const isAbortError = (error: unknown): boolean =>
  error instanceof DOMException && error.name === "AbortError";

export class ChunkedUploader {
  private file: File;
  private uploadId: string;
  private chunkSize: number;
  private totalChunks: number = 0;
  private uploadedChunks: Set<number> = new Set();
  private onProgressCallback?: (progress: UploadProgress) => void;
  private uploadedBytes: number = 0;
  private abortController: AbortController | null = null;
  private folderPath?: string;
  private e2eEncryption?: E2EEncryptionOptions;
  private encryptionKey?: CryptoKey;
  private encryptionSalt?: Uint8Array;
  private phase: UploadPhase = UploadPhase.PREPARING;
  private inFlight: Map<number, number> = new Map();
  private retrying: Set<number> = new Set();
  private lastEmit: number = 0;
  private speed: number = 0;
  private sample: SpeedSample = { time: 0, bytes: 0 };
  private appSettings?: {
    maxChunkSize: number;
    parallelUploads: number;
    maxFileSize: number;
  };

  constructor(
    file: File,
    existingUploadId?: string,
    alreadyUploadedChunks?: number[],
    folderPath?: string,
    e2eEncryption?: E2EEncryptionOptions,
    appSettings?: {
      maxChunkSize: number;
      parallelUploads: number;
      maxFileSize: number;
    }
  ) {
    this.file = file;
    this.uploadId = existingUploadId || this.generateUploadId(file);
    this.chunkSize = ADAPTIVE_CHUNK_SIZES.FAST;
    this.folderPath = folderPath;
    this.e2eEncryption = e2eEncryption;
    this.appSettings = appSettings;
    if (alreadyUploadedChunks) {
      this.uploadedChunks = new Set(alreadyUploadedChunks);
    }
  }

  private generateUploadId(file: File): string {
    const sanitized = file.name.replace(/[^a-zA-Z0-9_-]/g, "_");
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
      logger.error(SCOPE, "Failed to check upload status", error);
      return { exists: false };
    }
  }

  async upload(): Promise<string> {
    this.abortController = new AbortController();
    this.setPhase(UploadPhase.PREPARING);

    const maxFileSize =
      this.appSettings?.maxFileSize ?? UPLOAD_CONFIG.MAX_FILE_SIZE;

    if (maxFileSize > 0 && this.file.size > maxFileSize) {
      const fileSizeGB = (this.file.size / 1024 / 1024 / 1024).toFixed(2);
      const maxSizeGB = (maxFileSize / 1024 / 1024 / 1024).toFixed(2);
      throw new Error(
        `File size (${fileSizeGB} GB) exceeds maximum allowed size (${maxSizeGB} GB)`
      );
    }

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

    this.totalChunks = Math.max(1, Math.ceil(this.file.size / this.chunkSize));

    if (this.e2eEncryption?.enabled && this.e2eEncryption.password) {
      this.setPhase(UploadPhase.SECURING);
      await this.deriveEncryptionKey(this.e2eEncryption.password);
    }

    this.setPhase(UploadPhase.RESUMING);
    const existingUpload = await ChunkedUploader.checkForExistingUpload(this.uploadId);
    if (existingUpload.exists && existingUpload.uploadedChunks) {
      if (existingUpload.chunkSize) {
        this.chunkSize = existingUpload.chunkSize;
        this.totalChunks = Math.max(1, Math.ceil(this.file.size / this.chunkSize));
      }
      existingUpload.uploadedChunks.forEach((chunkIndex) => {
        this.uploadedChunks.add(chunkIndex);
      });
      this.uploadedBytes = existingUpload.uploadedChunks.reduce(
        (total, chunkIndex) => total + this.chunkBytes(chunkIndex),
        0
      );
    }

    if (!existingUpload.exists) {
      this.setPhase(UploadPhase.HANDSHAKE);
      await this.initializeUploadSession();
    }

    this.sample = { time: Date.now(), bytes: this.uploadedBytes };
    this.setPhase(UploadPhase.SENDING);
    await this.uploadChunksInParallel();

    this.setPhase(UploadPhase.ASSEMBLING);
    const result = await this.finalizeUpload();

    this.setPhase(UploadPhase.DONE);
    return result.fileId;
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  private isCancelled(): boolean {
    return !!this.abortController?.signal.aborted;
  }

  private chunkBytes(index: number): number {
    const start = index * this.chunkSize;
    return Math.max(0, Math.min(start + this.chunkSize, this.file.size) - start);
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
      const connection = (navigator as Navigator & NetworkHints).connection;
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

    const maxAllowedChunkSize =
      this.appSettings?.maxChunkSize ?? UPLOAD_CONFIG.MAX_CHUNK_SIZE;
    this.chunkSize = Math.min(this.chunkSize, maxAllowedChunkSize);
  }

  private async deriveEncryptionKey(password: string): Promise<void> {
    const forged = await forgeKey(password);
    this.encryptionSalt = forged.salt;
    this.encryptionKey = forged.key;
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
      logger.error(SCOPE, `Init failed (${response.status})`, errorMsg);
      throw new Error(`Failed to initialize upload session: ${errorMsg}`);
    }

    const result = await response.json();
    if (!result.success) {
      logger.error(SCOPE, "Init returned error", result.error);
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

    const parallelCount =
      this.appSettings?.parallelUploads ?? UPLOAD_CONFIG.PARALLEL_UPLOADS;

    const workers: Promise<void>[] = [];
    for (let i = 0; i < parallelCount; i++) {
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
          this.inFlight.set(index, 0);
          await this.uploadChunk(index, chunk);
          this.inFlight.delete(index);
          this.uploadedChunks.add(index);
          this.uploadedBytes += chunk.size;
          this.emit(true);
          break;
        } catch (error) {
          this.inFlight.delete(index);
          if (this.isCancelled() || isAbortError(error)) throw error;

          retries++;
          logger.warn(
            SCOPE,
            `Chunk ${index} of ${this.file.name} failed (attempt ${retries})`,
            error
          );
          if (retries >= UPLOAD_CONFIG.CHUNK_RETRY_ATTEMPTS) {
            throw new Error(
              `Failed to upload chunk ${index} after ${retries} attempts`,
              { cause: error }
            );
          }

          this.retrying.add(index);
          this.emit(true);
          await this.delay(
            Math.pow(2, retries) * UPLOAD_CONFIG.CHUNK_RETRY_DELAY_MS
          );
          this.retrying.delete(index);
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
        logger.error(SCOPE, `Encryption error on chunk ${index}`, encryptError);
        throw new Error(
          `Failed to encrypt chunk ${index}: ${encryptError instanceof Error ? encryptError.message : "Unknown error"}`,
          { cause: encryptError }
        );
      }
    }

    const formData = new FormData();
    formData.append("uploadId", this.uploadId);
    formData.append("chunkIndex", index.toString());
    formData.append("totalChunks", this.totalChunks.toString());
    formData.append("fileName", this.file.name);
    formData.append("chunk", chunkToUpload);

    await this.sendChunk(index, formData, chunk.size);
  }

  private sendChunk(index: number, body: FormData, size: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const signal = this.abortController?.signal;
      const onAbort = () => xhr.abort();
      const cleanup = () => signal?.removeEventListener("abort", onAbort);

      if (signal?.aborted) {
        reject(new DOMException("Upload cancelled", "AbortError"));
        return;
      }
      signal?.addEventListener("abort", onAbort, { once: true });

      xhr.open("POST", "/api/upload/chunk");

      xhr.upload.onprogress = (event) => {
        if (!event.lengthComputable || event.total === 0) return;
        this.inFlight.set(index, (event.loaded / event.total) * size);
        this.emit();
      };

      xhr.onload = () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }
        reject(
          new Error(
            `Chunk ${index} upload failed with status ${xhr.status}: ${xhr.responseText}`
          )
        );
      };

      xhr.onerror = () => {
        cleanup();
        reject(new Error(`Network error while sending chunk ${index}`));
      };

      xhr.onabort = () => {
        cleanup();
        reject(new DOMException("Upload cancelled", "AbortError"));
      };

      xhr.send(body);
    });
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
      logger.error(SCOPE, `Finalize failed (${response.status})`, errorMsg);
      throw new Error(`Failed to finalize upload: ${errorMsg}`);
    }

    const result = await response.json();

    if (!result.success) {
      logger.error(SCOPE, "Finalize returned error", result.error);
      throw new Error(`Failed to finalize: ${result.error}`);
    }

    if (result.data?.fileId) {
      return { fileId: result.data.fileId };
    }

    throw new Error("No file ID returned from finalize");
  }

  private setPhase(phase: UploadPhase): void {
    this.phase = phase;
    this.emit(true);
  }

  private sentBytes(): number {
    let pending = 0;
    this.inFlight.forEach((bytes) => {
      pending += bytes;
    });
    return Math.min(this.file.size, this.uploadedBytes + pending);
  }

  private sampleSpeed(now: number, sent: number): void {
    if (this.phase !== UploadPhase.SENDING) return;

    const elapsed = (now - this.sample.time) / 1000;
    if (elapsed * 1000 < UPLOAD_QUEUE.SPEED_SAMPLE_MS) return;

    const instant = Math.max(0, sent - this.sample.bytes) / elapsed;
    this.speed =
      this.speed === 0
        ? instant
        : this.speed * (1 - UPLOAD_QUEUE.SPEED_SMOOTHING) +
          instant * UPLOAD_QUEUE.SPEED_SMOOTHING;
    this.sample = { time: now, bytes: sent };
  }

  private chunkMap(): ChunkState[] | undefined {
    if (this.totalChunks === 0 || this.totalChunks > UPLOAD_QUEUE.MAX_CHUNK_MAP) {
      return undefined;
    }

    return Array.from({ length: this.totalChunks }, (_, index) => {
      if (this.uploadedChunks.has(index)) return ChunkState.DONE;
      if (this.retrying.has(index)) return ChunkState.RETRYING;
      if (this.inFlight.has(index)) return ChunkState.SENDING;
      return ChunkState.WAITING;
    });
  }

  private emit(force: boolean = false): void {
    if (!this.onProgressCallback) return;

    const now = Date.now();
    if (!force && now - this.lastEmit < UPLOAD_QUEUE.PROGRESS_THROTTLE_MS) return;
    this.lastEmit = now;

    const sent = this.sentBytes();
    this.sampleSpeed(now, sent);

    const isDone =
      this.phase === UploadPhase.ASSEMBLING || this.phase === UploadPhase.DONE;
    const progress = isDone || this.file.size === 0
      ? 100
      : (sent / this.file.size) * 100;
    const remainingTime =
      this.speed > 0 ? (this.file.size - sent) / this.speed : 0;

    this.onProgressCallback({
      fileId: this.uploadId,
      fileName: this.file.name,
      totalSize: this.file.size,
      uploadedSize: isDone ? this.file.size : sent,
      progress,
      status: UploadStatus.UPLOADING,
      speed: isDone ? 0 : this.speed,
      remainingTime: isDone ? 0 : remainingTime,
      chunksCompleted: this.uploadedChunks.size,
      totalChunks: this.totalChunks,
      phase: this.phase,
      chunksInFlight: this.inFlight.size,
      chunksRetrying: this.retrying.size,
      chunkMap: this.chunkMap(),
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
