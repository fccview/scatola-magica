import Protocol from "bittorrent-protocol";
import DHT from "bittorrent-dht";
import Client from "bittorrent-tracker";
import parseTorrent, { Instance as ParsedTorrent } from "parse-torrent";
import { createWriteStream, createReadStream } from "fs";
import { mkdir, stat, readdir } from "fs/promises";
import { join, dirname } from "path";
import { EventEmitter } from "events";

// Extended wire with metadata and PEX extensions
import ut_metadata from "ut_metadata";
import ut_pex from "ut_pex";
import * as net from "node:net";

interface TorrentClientOptions {
  downloadPath: string;
  infoHash: string;
  magnetURI?: string;
  torrentFile?: Buffer;
  maxConnections?: number;
}

interface PeerInfo {
  id: string;
  host: string;
  port: number;
}

export class BitTorrentClient extends EventEmitter {
  private dht: DHT;
  private trackerClient: Client | null = null;
  private wires: Map<string, any> = new Map();
  private pieces: Map<number, Buffer> = new Map();
  private parsedTorrent: ParsedTorrent | null = null;
  private downloadPath: string;
  private downloaded: number = 0;
  private uploaded: number = 0;
  private maxConnections: number;
  private infoHash: string;

  constructor(options: TorrentClientOptions) {
    super();
    this.downloadPath = options.downloadPath;
    this.infoHash = options.infoHash;
    this.maxConnections = options.maxConnections || 55;

    // Initialize DHT for peer discovery
    this.dht = new DHT();

    this.dht.on("ready", () => {
      this.emit("dht-ready");
    });

    this.dht.on("error", (err) => {
      this.emit("error", err);
    });
  }

  async start(magnetURI?: string, torrentFile?: Buffer): Promise<void> {
    try {
      // Parse torrent metadata
      if (magnetURI) {
        this.parsedTorrent = await parseTorrent(magnetURI) as ParsedTorrent;
      } else if (torrentFile) {
        this.parsedTorrent = await parseTorrent(torrentFile) as ParsedTorrent;
      } else {
        throw new Error("Either magnetURI or torrentFile must be provided");
      }

      if (!this.parsedTorrent) {
        throw new Error("Failed to parse torrent");
      }

      // Ensure download directory exists
      await mkdir(this.downloadPath, { recursive: true });

      // Start DHT lookup for peers
      if (this.parsedTorrent.infoHash) {
        this.dht.lookup(this.parsedTorrent.infoHash);
      }

      // Connect to trackers
      if (this.parsedTorrent.announce && this.parsedTorrent.announce.length > 0) {
        this.trackerClient = new Client({
          infoHash: this.parsedTorrent.infoHash,
          peerId: this.generatePeerId(),
          port: 6881,
          announce: this.parsedTorrent.announce,
        });

        this.trackerClient.on("peer", (peer: PeerInfo) => {
          this.connectToPeer(peer);
        });

        this.trackerClient.on("error", (err) => {
          console.error("Tracker error:", err);
        });

        this.trackerClient.start();
      }

      // Listen for DHT peers
      this.dht.on("peer", (peer: PeerInfo, infoHash: Buffer) => {
        if (infoHash.toString("hex") === this.parsedTorrent?.infoHash) {
          this.connectToPeer(peer);
        }
      });

      this.emit("started");
    } catch (error) {
      this.emit("error", error);
      throw error;
    }
  }

    private connectToPeer(peer: PeerInfo): void {
        if (this.wires.size >= this.maxConnections) return;

        const peerId = `${peer.host}:${peer.port}`;
        if (this.wires.has(peerId)) return;

        const socket = net.connect(peer.port, peer.host);

        const wire = new Protocol();
        wire.use(ut_metadata());
        wire.use(ut_pex());

        // Pipe network socket <-> bittorrent wire
        socket.pipe(wire).pipe(socket);

        // On successful TCP connect, do handshake
        socket.on("connect", () => {
            wire.handshake(
                Buffer.from(this.parsedTorrent!.infoHash, "hex"),
                this.generatePeerId()
            );
        });

        // Handle metadata
        wire.ut_metadata.on("metadata", (metadata: Buffer) => {
            this.parsedTorrent = parseTorrent(metadata) as ParsedTorrent;
            this.emit("metadata", this.parsedTorrent);
        });

        wire.ut_metadata.on("warning", (err) => {
            console.error("Metadata warning:", err);
        });

        // Request metadata immediately
        wire.once("extended", () => {
            wire.ut_metadata.fetch();
        });

        socket.on("error", (err) => {
            console.error("Socket error:", err);
            this.wires.delete(peerId);
        });

        socket.on("close", () => {
            this.wires.delete(peerId);
        });

        this.wires.set(peerId, wire);
    }

  private generatePeerId(): Buffer {
    const prefix = "-SC0001-"; // Scatola v0.0.01
    const random = Math.random().toString(36).substring(2, 14);
    return Buffer.from(prefix + random);
  }

  private isPieceComplete(index: number): boolean {
    const piece = this.pieces.get(index);
    if (!piece || !this.parsedTorrent) return false;

    const expectedLength = this.parsedTorrent.pieceLength || 0;
    return piece.length === expectedLength;
  }

  private async writePieceToDisk(index: number, data: Buffer): Promise<void> {
    if (!this.parsedTorrent) return;

    try {
      // Determine which file(s) this piece belongs to
      const files = this.parsedTorrent.files || [];
      let pieceOffset = index * (this.parsedTorrent.pieceLength || 0);

      for (const file of files) {
        const filePath = join(this.downloadPath, file.path);

        // Ensure directory exists
        await mkdir(dirname(filePath), { recursive: true });

        // Write piece data to file
        // (Simplified - production would handle piece spanning multiple files)
        const stream = createWriteStream(filePath, { flags: "a" });
        stream.write(data);
        stream.end();

        pieceOffset -= file.length;
        if (pieceOffset <= 0) break;
      }

      this.emit("piece-complete", index);
    } catch (error) {
      this.emit("error", error);
    }
  }

  private async readPieceFromDisk(
    index: number,
    offset: number,
    length: number
  ): Promise<Buffer | null> {
    if (!this.parsedTorrent) return null;

    try {
      const files = this.parsedTorrent.files || [];
      const pieceOffset = index * (this.parsedTorrent.pieceLength || 0) + offset;

      // Find the file containing this piece
      for (const file of files) {
        const filePath = join(this.downloadPath, file.path);

        try {
          await stat(filePath);
          const stream = createReadStream(filePath, {
            start: pieceOffset,
            end: pieceOffset + length - 1,
          });

          return await new Promise<Buffer>((resolve, reject) => {
            const chunks: Buffer[] = [];
            stream.on("data", (chunk) => chunks.push(chunk));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", reject);
          });
        } catch {
          continue;
        }
      }

      return null;
    } catch (error) {
      console.error("Error reading piece from disk:", error);
      return null;
    }
  }

  getStats() {
    return {
      downloaded: this.downloaded,
      uploaded: this.uploaded,
      numPeers: this.wires.size,
      progress: this.calculateProgress(),
      ratio: this.downloaded > 0 ? this.uploaded / this.downloaded : 0,
    };
  }

  private calculateProgress(): number {
    if (!this.parsedTorrent || !this.parsedTorrent.length) return 0;
    return this.downloaded / this.parsedTorrent.length;
  }

  pause(): void {
    this.wires.forEach((wire) => {
      wire.destroy();
    });
    this.wires.clear();
    this.emit("paused");
  }

  resume(): void {
    // Re-announce to trackers and DHT
    if (this.trackerClient) {
      this.trackerClient.update();
    }
    if (this.parsedTorrent?.infoHash) {
      this.dht.lookup(this.parsedTorrent.infoHash);
    }
    this.emit("resumed");
  }

  async destroy(): Promise<void> {
    return new Promise((resolve) => {
      this.pause();

      if (this.trackerClient) {
        this.trackerClient.stop();
        this.trackerClient.destroy();
      }

      this.dht.destroy(() => {
        this.emit("destroyed");
        resolve();
      });
    });
  }
}

// Manager class for multiple torrents
class BitTorrentManager {
  private static instance: BitTorrentManager | null = null;
  private clients: Map<string, BitTorrentClient> = new Map();

  private constructor() {}

  static getInstance(): BitTorrentManager {
    if (!BitTorrentManager.instance) {
      BitTorrentManager.instance = new BitTorrentManager();
    }
    return BitTorrentManager.instance;
  }

  createClient(options: TorrentClientOptions): BitTorrentClient {
    const client = new BitTorrentClient(options);
    this.clients.set(options.infoHash, client);

    client.on("destroyed", () => {
      this.clients.delete(options.infoHash);
    });

    return client;
  }

  getClient(infoHash: string): BitTorrentClient | undefined {
    return this.clients.get(infoHash);
  }

  getAllClients(): BitTorrentClient[] {
    return Array.from(this.clients.values());
  }

  async destroyAll(): Promise<void> {
    const destroyPromises = Array.from(this.clients.values()).map((client) =>
      client.destroy()
    );
    await Promise.all(destroyPromises);
    this.clients.clear();
  }

  async addTorrent(
    session: any,
    seedRatio: number,
    onUpdate: (state: any) => Promise<void>
  ): Promise<void> {
    const { metadata, state } = session;

    const client = this.createClient({
      downloadPath: metadata.downloadPath,
      infoHash: metadata.infoHash,
      magnetURI: metadata.magnetURI,
      maxConnections: 55,
    });

    // Progress update interval
    const updateInterval = setInterval(async () => {
      const progress = client["calculateProgress"]?.() || 0;
      const downloaded = client["downloaded"] || 0;
      const uploaded = client["uploaded"] || 0;
      const ratio = downloaded > 0 ? uploaded / downloaded : 0;
      const numPeers = client["wires"]?.size || 0;

      let status = "DOWNLOADING";
      if (progress >= 1) {
        status = ratio >= seedRatio ? "COMPLETED" : "SEEDING";
      }

      await onUpdate({
        infoHash: metadata.infoHash,
        status,
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloaded,
        uploaded,
        progress,
        ratio,
        numPeers,
        timeRemaining: 0,
        addedAt: state.addedAt,
      });

      // Stop if completed and reached seed ratio
      if (status === "COMPLETED") {
        clearInterval(updateInterval);
      }
    }, 2000);

    // Clean up interval on destroy
    client.on("destroyed", () => {
      clearInterval(updateInterval);
    });

    // Set up event listeners
    client.on("peer", async () => {
      console.log(`Peer connected for ${metadata.name}`);
    });

    client.on("download", async () => {
      console.log(`Download progress for ${metadata.name}`);
    });

    client.on("error", async (error: Error) => {
      console.error(`Torrent error for ${metadata.name}:`, error);
      clearInterval(updateInterval);
      await onUpdate({
        infoHash: metadata.infoHash,
        status: "ERROR",
        downloadSpeed: 0,
        uploadSpeed: 0,
        downloaded: client["downloaded"] || 0,
        uploaded: client["uploaded"] || 0,
        progress: client["calculateProgress"]?.() || 0,
        ratio: 0,
        numPeers: 0,
        timeRemaining: 0,
        addedAt: state.addedAt,
        error: error.message,
      });
    });

    try {
      await client.start();
      console.log(`Torrent started: ${metadata.name}`);
    } catch (error) {
      console.error(`Failed to start torrent ${metadata.name}:`, error);
      clearInterval(updateInterval);
      throw error;
    }
  }

  async pauseTorrent(infoHash: string): Promise<void> {
    const client = this.getClient(infoHash);
    if (client) {
      client.pause();
    }
  }

  async resumeTorrent(infoHash: string): Promise<void> {
    const client = this.getClient(infoHash);
    if (client) {
      client.resume();
    }
  }

  async removeTorrent(infoHash: string): Promise<void> {
    const client = this.getClient(infoHash);
    if (client) {
      await client.destroy();
    }
  }
}

export const getTorrentManager = () => BitTorrentManager.getInstance();
