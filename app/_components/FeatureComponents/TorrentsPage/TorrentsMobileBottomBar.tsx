"use client";

import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";

interface TorrentsMobileBottomBarProps {
  onToggleSidebar: () => void;
  onMagnetLink: () => void;
  onTorrentFile: () => void;
}

export default function TorrentsMobileBottomBar({
  onToggleSidebar,
  onMagnetLink,
  onTorrentFile,
}: TorrentsMobileBottomBarProps) {
  return (
    <div className="medium:hidden fixed bottom-0 left-0 right-0 bg-surface border-t-2 border-dashed border-outline-variant safe-area-bottom z-40">
      <div className="flex items-center justify-around p-2">
        <IconButton
          icon="folder_open"
          onClick={onToggleSidebar}
          title="Sidebar"
          size="lg"
          className="text-on-surface"
        />
        <IconButton
          icon="link"
          onClick={onMagnetLink}
          title="Magnet Link"
          size="lg"
          className="text-on-surface"
        />
        <IconButton
          icon="p2p"
          onClick={onTorrentFile}
          title="Torrent File"
          size="lg"
          className="text-on-surface"
        />
      </div>
    </div>
  );
}
