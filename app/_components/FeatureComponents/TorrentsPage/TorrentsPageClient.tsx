"use client";

import { useState } from "react";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import ThemeSelector from "@/app/_components/GlobalComponents/Layout/ThemeSelector";
import HelpButton from "@/app/_components/GlobalComponents/Layout/HelpButton";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import TorrentList from "@/app/_components/FeatureComponents/TorrentsPage/TorrentList";
import AddMagnetModal from "@/app/_components/FeatureComponents/Modals/AddMagnetModal";
import DeepLinkHandler from "@/app/_components/FeatureComponents/TorrentsPage/DeepLinkHandler";
import Particles from "@/app/_components/GlobalComponents/Layout/Particles";
import Link from "next/link";

export default function TorrentsPageClient() {
  const { wandCursorEnabled, particlesEnabled } = usePreferences();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${wandCursorEnabled ? "cursor-wand" : ""}`}>
      <DeepLinkHandler onTorrentAdded={() => setIsAddModalOpen(false)} />

        <TopAppBar
            leading={
                <Link
                    href="/"
                    className="flex items-center justify-center leading-[0] gap-2 pt-8 pb-2 -ml-4"
                >
                    <Logo className="w-16 h-16 lg:w-20 lg:h-20" hideBox={true} />
                </Link>
            }
            trailing={
                <div className="flex items-center gap-2">
                    <ThemeSelector />
                    <UserMenu />
                </div>
            }
        />

      <main className="flex-1 overflow-auto relative bg-surface">
        {particlesEnabled && <Particles />}

        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-medium text-on-surface mb-2">
                Torrents
              </h1>
              <p className="text-on-surface/60">
                Download and seed torrents with end-to-end encryption
              </p>
            </div>

            <IconButton
              icon="add"
              onClick={() => setIsAddModalOpen(true)}
              ariaLabel="Add torrent"
              size="lg"
              className="bg-primary text-on-primary medium:hidden"
            />
          </div>

          <TorrentList />
        </div>
      </main>

      <div className="fixed bottom-6 right-6 z-30 hidden medium:block">
        <IconButton
          icon="add"
          onClick={() => setIsAddModalOpen(true)}
          ariaLabel="Add torrent"
          size="lg"
          className="bg-primary text-on-primary"
        />
      </div>

      {isAddModalOpen && (
        <AddMagnetModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
}
