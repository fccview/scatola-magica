"use server";

import WebTorrent from "webtorrent-hybrid";

class WebTorrentManager {
  private static instance: WebTorrentManager | null = null;
  private client: WebTorrent.Instance | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  static getInstance(): WebTorrentManager {
    if (!WebTorrentManager.instance) {
      WebTorrentManager.instance = new WebTorrentManager();
    }
    return WebTorrentManager.instance;
  }

  getClient(): WebTorrent.Instance {
    if (!this.client) {
      this.client = new WebTorrent({
        downloadLimit: -1, // Unlimited
        uploadLimit: -1, // Unlimited
        maxConns: 55, // Max connections per torrent
        dht: true, // Enable DHT for peer discovery
        tracker: true, // Enable tracker connections
        webSeeds: true, // Enable web seed support
      });

      // Set up global error handler
      this.client.on("error", (err) => {
        console.error("WebTorrent client error:", err);
      });
    }
    return this.client;
  }

  async shutdown(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.client) {
        this.client.destroy((err) => {
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

export const getTorrentClient = () => WebTorrentManager.getInstance().getClient();
export const shutdownTorrentClient = () => WebTorrentManager.getInstance().shutdown();
