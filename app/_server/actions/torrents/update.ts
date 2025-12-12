"use server";

import { getCurrentUser } from "@/app/_server/actions/user";
import { loadTorrentSessions, saveTorrentSession } from "@/app/_server/lib/torrent-state";
import { getTorrentManager } from "@/app/_server/lib/bittorrent-client";
import { TorrentStatus } from "@/app/_types/torrent";
import { ServerActionResponse } from "@/app/_types";

export const updateTorrentStatus = async (
  infoHash: string
): Promise<ServerActionResponse<void>> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessions = await loadTorrentSessions(user.username);
    const session = sessions.find((s) => s.metadata.infoHash === infoHash);

    if (!session) {
      return { success: false, error: "Torrent not found" };
    }

    // Get the client from the manager
    const manager = getTorrentManager();
    const client = manager.getClient(infoHash);

    if (!client) {
      // Client not running, keep as-is
      return { success: true };
    }

    // Update state from client
    const progress = (client as any).calculateProgress?.() || 0;
    const downloaded = (client as any).downloaded || 0;
    const uploaded = (client as any).uploaded || 0;
    const ratio = downloaded > 0 ? uploaded / downloaded : 0;
    const numPeers = (client as any).wires?.size || 0;

    let status = TorrentStatus.DOWNLOADING;
    if (progress >= 1) {
      status = TorrentStatus.SEEDING;
    }

    session.state = {
      ...session.state,
      status,
      downloaded,
      uploaded,
      progress,
      ratio,
      numPeers,
    };

    await saveTorrentSession(user.username, session);

    return { success: true };
  } catch (error) {
    console.error("Update torrent status error:", error);
    return { success: false, error: "Failed to update torrent status" };
  }
};

export const updateAllTorrents = async (): Promise<
  ServerActionResponse<void>
> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const sessions = await loadTorrentSessions(user.username);
    const manager = getTorrentManager();

    for (const session of sessions) {
      if (
        session.state.status === TorrentStatus.DOWNLOADING ||
        session.state.status === TorrentStatus.SEEDING
      ) {
        const client = manager.getClient(session.metadata.infoHash);

        if (client) {
          const progress = (client as any).calculateProgress?.() || 0;
          const downloaded = (client as any).downloaded || 0;
          const uploaded = (client as any).uploaded || 0;
          const ratio = downloaded > 0 ? uploaded / downloaded : 0;
          const numPeers = (client as any).wires?.size || 0;

          let status = TorrentStatus.DOWNLOADING;
          if (progress >= 1) {
            status = TorrentStatus.SEEDING;
          }

          session.state = {
            ...session.state,
            status,
            downloaded,
            uploaded,
            progress,
            ratio,
            numPeers,
          };

          await saveTorrentSession(user.username, session);
        }
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Update all torrents error:", error);
    return { success: false, error: "Failed to update torrents" };
  }
};
