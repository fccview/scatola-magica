"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { addTorrent } from "@/app/_server/actions/torrents";

interface DeepLinkHandlerProps {
  onTorrentAdded?: () => void;
}

export default function DeepLinkHandler({
  onTorrentAdded,
}: DeepLinkHandlerProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processMagnet = async () => {
      // Check for magnet parameter
      const magnetParam = searchParams.get("magnet");
      const torrentParam = searchParams.get("torrent");

      if (!magnetParam && !torrentParam) return;
      if (isProcessing) return;

      setIsProcessing(true);
      setError(null);

      try {
        let magnetURI = magnetParam;

        // Handle custom scatolamagica:// URL scheme
        if (torrentParam) {
          // torrentParam might be: "scatolamagica://torrent?magnet=..."
          try {
            const url = new URL(torrentParam);
            const extractedMagnet = url.searchParams.get("magnet");
            if (extractedMagnet) {
              magnetURI = extractedMagnet;
            }
          } catch {
            // If not a URL, treat as direct magnet
            magnetURI = torrentParam;
          }
        }

        if (!magnetURI) {
          throw new Error("Invalid torrent link");
        }

        // Decode URI component in case it's URL encoded
        const decodedMagnet = decodeURIComponent(magnetURI);

        // Add the torrent
        const result = await addTorrent(decodedMagnet);

        if (result.success) {
          // Clear URL parameters
          router.replace("/torrents");
          onTorrentAdded?.();

          // Show success notification
          alert("Torrent added successfully!");
        } else {
          setError(result.error || "Failed to add torrent");
        }
      } catch (err) {
        console.error("Error processing torrent link:", err);
        setError("Failed to process torrent link");
      } finally {
        setIsProcessing(false);
      }
    };

    processMagnet();
  }, [searchParams, router, isProcessing, onTorrentAdded]);

  if (!isProcessing && !error) return null;

  return (
    <div className="fixed inset-0 bg-scrim/50 z-50 flex items-center justify-center">
      <div className="bg-surface-container-high rounded-lg p-6 max-w-md w-full mx-4">
        {isProcessing && (
          <div className="text-center">
            <div className="mb-4">
              <span className="material-symbols-outlined text-5xl text-primary animate-spin">
                refresh
              </span>
            </div>
            <h3 className="text-lg font-medium text-on-surface mb-2">
              Adding Torrent
            </h3>
            <p className="text-on-surface/60 text-sm">
              Processing torrent link...
            </p>
          </div>
        )}

        {error && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-error text-3xl">
                error
              </span>
              <h3 className="text-lg font-medium text-on-surface">Error</h3>
            </div>
            <p className="text-on-surface/80 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                router.replace("/torrents");
              }}
              className="w-full py-3 px-4 bg-primary text-on-primary rounded-lg font-medium hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
