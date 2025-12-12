/**
 * Suppress the GODDAMN uTP warning
 * I couldn't figure this out, I don't think it matters, googling says it's harmless
 * as WebTorrent falls back to TCP
 */

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

const shouldSuppressUTPError = (message: string): boolean => {
  const msg = message.toLowerCase();
  return (
    msg.includes("utp not supported") ||
    msg.includes("utp-native") ||
    msg.includes("no native build was found")
  );
};

const filteredError = (...args: unknown[]) => {
  const message = String(args[0] || "");
  if (shouldSuppressUTPError(message)) {
    return;
  }
  originalConsoleError.apply(console, args);
};

const filteredWarn = (...args: unknown[]) => {
  const message = String(args[0] || "");
  if (shouldSuppressUTPError(message)) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

console.error = filteredError;
console.warn = filteredWarn;

// @ts-ignore - WebTorrent is not typed
import WebTorrent from "webtorrent";

class WebTorrentManager {
  private static instance: WebTorrentManager | null = null;
  private client: WebTorrent.Instance | null = null;

  static getInstance(): WebTorrentManager {
    if (!WebTorrentManager.instance) {
      WebTorrentManager.instance = new WebTorrentManager();
    }
    return WebTorrentManager.instance;
  }

  getClient(
    downloadLimit: number = -1,
    uploadLimit: number = -1
  ): WebTorrent.Instance {
    if (!this.client) {
      const downloadLimitBytes = downloadLimit > 0 ? downloadLimit * 1024 : -1;
      const uploadLimitBytes = uploadLimit > 0 ? uploadLimit * 1024 : -1;

      this.client = new WebTorrent({
        downloadLimit: downloadLimitBytes,
        uploadLimit: uploadLimitBytes,
        maxConns: 55,
        dht: true,
        tracker: true,
        webSeeds: true,
      });

      this.client.on("error", (err: Error) => {
        console.error("WebTorrent client error:", err);
      });
    } else if (downloadLimit >= 0 || uploadLimit >= 0) {
      const downloadLimitBytes = downloadLimit > 0 ? downloadLimit * 1024 : -1;
      const uploadLimitBytes = uploadLimit > 0 ? uploadLimit * 1024 : -1;

      if (downloadLimitBytes >= 0) {
        (this.client as any).throttleDownload = downloadLimitBytes;
      }
      if (uploadLimitBytes >= 0) {
        (this.client as any).throttleUpload = uploadLimitBytes;
      }
    }
    return this.client;
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client) {
        this.client.destroy((err: Error) => {
          if (err) {
            console.error("Error shutting down WebTorrent client:", err);
            reject(err);
          } else {
            this.client = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }
}

export const getTorrentClient = (
  downloadLimit?: number,
  uploadLimit?: number
) => WebTorrentManager.getInstance().getClient(downloadLimit, uploadLimit);
export const shutdownTorrentClient = () =>
  WebTorrentManager.getInstance().shutdown();
