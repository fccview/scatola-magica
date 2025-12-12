"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import MyTorrentsList from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsList";
import DownloadsList from "@/app/_components/FeatureComponents/TorrentsPage/DownloadsList";
import AddMagnetModal from "@/app/_components/FeatureComponents/Modals/AddMagnetModal";
import DeepLinkHandler from "@/app/_components/FeatureComponents/TorrentsPage/DeepLinkHandler";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Select from "@/app/_components/GlobalComponents/Form/Select";
import FilesPageBorderWrapper from "@/app/_components/GlobalComponents/Files/FilesPageBorderWrapper";
import FilesPageWrapper from "@/app/_components/GlobalComponents/Files/FilesPageWrapper";
import { SidebarProvider } from "@/app/_providers/SidebarProvider";
import Header from "@/app/_components/GlobalComponents/Layout/Header";

type Tab = "my-torrents" | "downloads";

export default function TorrentsPageClient() {
  const searchParams = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("my-torrents");
  const [initialMagnet, setInitialMagnet] = useState<string | undefined>();
  const [initialTorrentFile, setInitialTorrentFile] = useState<
    File | undefined
  >();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "my-torrents", label: "My Torrents", icon: "p2p" },
    { id: "downloads", label: "Downloads", icon: "cloud_download" },
  ];

  const openModalWithMagnet = useCallback((magnet: string) => {
    setInitialMagnet(magnet);
    setInitialTorrentFile(undefined);
    setIsAddModalOpen(true);
    setActiveTab("downloads");
  }, []);

  const openModalWithTorrentFile = useCallback((file: File) => {
    setInitialTorrentFile(file);
    setInitialMagnet(undefined);
    setIsAddModalOpen(true);
    setActiveTab("downloads");
  }, []);

  useEffect(() => {
    const handleTorrentPaste = (e: CustomEvent) => {
      if (e.detail.magnet) {
        openModalWithMagnet(e.detail.magnet);
        sessionStorage.removeItem("pendingMagnet");
      } else if (e.detail.torrentFile) {
        const torrentData = sessionStorage.getItem("pendingTorrentFile");
        const torrentName = sessionStorage.getItem("pendingTorrentFileName");
        if (torrentData && torrentName) {
          fetch(torrentData)
            .then((res) => res.blob())
            .then((blob) => {
              const file = new File([blob], torrentName, {
                type: "application/x-bittorrent",
              });
              openModalWithTorrentFile(file);
              sessionStorage.removeItem("pendingTorrentFile");
              sessionStorage.removeItem("pendingTorrentFileName");
            })
            .catch((err) => {
              console.error("Error loading torrent file:", err);
            });
        }
      }
    };

    window.addEventListener(
      "torrent-paste",
      handleTorrentPaste as EventListener
    );
    return () => {
      window.removeEventListener(
        "torrent-paste",
        handleTorrentPaste as EventListener
      );
    };
  }, [openModalWithMagnet, openModalWithTorrentFile]);

  useEffect(() => {
    const tab = searchParams.get("tab");
    const action = searchParams.get("action");
    const magnetParam = searchParams.get("magnet");

    if (tab === "downloads") {
      setActiveTab("downloads");
    }

    if (action === "add") {
      if (magnetParam) {
        const decodedMagnet = decodeURIComponent(magnetParam);
        openModalWithMagnet(decodedMagnet);
        window.history.replaceState({}, "", "/torrents?tab=downloads");
      } else {
        const torrentData = sessionStorage.getItem("pendingTorrentFile");
        const torrentName = sessionStorage.getItem("pendingTorrentFileName");
        if (torrentData && torrentName) {
          fetch(torrentData)
            .then((res) => res.blob())
            .then((blob) => {
              const file = new File([blob], torrentName, {
                type: "application/x-bittorrent",
              });
              openModalWithTorrentFile(file);
              sessionStorage.removeItem("pendingTorrentFile");
              sessionStorage.removeItem("pendingTorrentFileName");
              window.history.replaceState({}, "", "/torrents?tab=downloads");
            })
            .catch((err) => {
              console.error("Error loading torrent file:", err);
            });
        }
      }
    }
  }, [searchParams, openModalWithMagnet, openModalWithTorrentFile]);

  return (
    <FilesPageBorderWrapper>
      <SidebarProvider>
        <FilesPageWrapper folderPath="">
          <DeepLinkHandler onTorrentAdded={() => setIsAddModalOpen(false)} />

          <div className="flex-shrink-0">
            <Header showTorrentsButton={false} />
          </div>

          <div className="flex flex-1 overflow-hidden min-h-0">
            <aside className="hidden lg:block w-96 bg-sidebar overflow-y-auto flex-shrink-0">
              <nav className="px-2 pb-2 pt-6 space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      activeTab === tab.id
                        ? "bg-sidebar-active text-on-surface font-medium"
                        : "text-on-surface hover:bg-surface-variant/20"
                    }`}
                  >
                    <Icon icon={tab.icon} size="sm" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </aside>

            <main className="flex-1 overflow-y-auto">
              <div className="p-4 sm:p-6 lg:p-8">
                <div className="mb-6 sm:mb-8">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl sm:text-3xl font-medium text-on-surface mb-2">
                        {activeTab === "my-torrents"
                          ? "My Torrents"
                          : "Downloads"}
                      </h1>

                      <p className="text-sm sm:text-base text-on-surface/60">
                        {activeTab === "my-torrents"
                          ? "Torrents you've created for sharing"
                          : "Torrents you're downloading or seeding"}
                      </p>
                    </div>

                    {activeTab === "downloads" && (
                      <div className="hidden sm:block flex-shrink-0">
                        <IconButton
                          icon="add"
                          onClick={() => setIsAddModalOpen(true)}
                          ariaLabel="Add torrent"
                          size="lg"
                          className="bg-primary text-on-primary"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="lg:hidden mb-4">
                  <Select
                    value={activeTab}
                    onChange={(e) => setActiveTab(e.target.value as Tab)}
                  >
                    {tabs.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                      </option>
                    ))}
                  </Select>
                </div>

                {activeTab === "my-torrents" && <MyTorrentsList />}
                {activeTab === "downloads" && <DownloadsList />}
              </div>
            </main>
          </div>

          {activeTab === "downloads" && (
            <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30">
              <IconButton
                icon="add"
                onClick={() => setIsAddModalOpen(true)}
                ariaLabel="Add torrent"
                size="lg"
                className="bg-primary text-on-primary"
              />
            </div>
          )}

          {isAddModalOpen && (
            <AddMagnetModal
              isOpen={isAddModalOpen}
              onClose={() => {
                setIsAddModalOpen(false);
                setInitialMagnet(undefined);
                setInitialTorrentFile(undefined);
              }}
              initialMagnet={initialMagnet}
              initialTorrentFile={initialTorrentFile}
            />
          )}
        </FilesPageWrapper>
      </SidebarProvider>
    </FilesPageBorderWrapper>
  );
}
