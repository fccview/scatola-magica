"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import MyTorrentsList from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsList";
import DownloadsList from "@/app/_components/FeatureComponents/TorrentsPage/DownloadsList";
import AddMagnetModal from "@/app/_components/FeatureComponents/Modals/AddMagnetModal";
import AddTorrentModal from "@/app/_components/FeatureComponents/Modals/AddTorrentModal";
import DeepLinkHandler from "@/app/_components/FeatureComponents/TorrentsPage/DeepLinkHandler";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Select from "@/app/_components/GlobalComponents/Form/Select";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/app/_components/GlobalComponents/Form/DropdownMenu";
import TorrentsMobileBottomBar from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsMobileBottomBar";
import TorrentsSidebar from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsSidebar";
import MobileSidebarWrapper from "@/app/_components/FeatureComponents/FilesPage/MobileSidebarWrapper";
import { useSidebar } from "@/app/_providers/SidebarProvider";
import FilesPageBorderWrapper from "@/app/_components/GlobalComponents/Files/FilesPageBorderWrapper";
import FilesPageWrapper from "@/app/_components/GlobalComponents/Files/FilesPageWrapper";
import { SidebarProvider } from "@/app/_providers/SidebarProvider";
import Header from "@/app/_components/GlobalComponents/Layout/Header";
import TorrentMetadataEncryptionButton from "@/app/_components/FeatureComponents/TorrentsPage/TorrentMetadataEncryptionButton";
import { isTorrentMetadataEncrypted } from "@/app/_server/actions/manage-torrents";
import { useTorrents } from "@/app/_hooks/useTorrents";

type Tab = "my-torrents" | "downloads";

function TorrentsPageContent() {
  const searchParams = useSearchParams();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isTorrentModalOpen, setIsTorrentModalOpen] = useState(false);
  const [isMagnetModalOpen, setIsMagnetModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("my-torrents");
  const [initialMagnet, setInitialMagnet] = useState<string | undefined>();
  const [initialTorrentFile, setInitialTorrentFile] = useState<
    File | undefined
  >();
  const [isEncrypted, setIsEncrypted] = useState<boolean | null>(null);
  const { needsPassword } = useTorrents();
  const { toggleSidebar } = useSidebar();

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "my-torrents", label: "My Torrents", icon: "p2p" },
    { id: "downloads", label: "Downloads", icon: "cloud_download" },
  ];

  const openModalWithMagnet = useCallback((magnet: string) => {
    setInitialMagnet(magnet);
    setInitialTorrentFile(undefined);
    setIsMagnetModalOpen(true);
    setActiveTab("downloads");
  }, []);

  const openModalWithTorrentFile = useCallback((file: File) => {
    setInitialTorrentFile(file);
    setInitialMagnet(undefined);
    setIsTorrentModalOpen(true);
    setActiveTab("downloads");
  }, []);

  const handleTorrentFileUpload = () => {
    setIsTorrentModalOpen(true);
  };

  const handleMagnetLink = () => {
    setIsMagnetModalOpen(true);
  };

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

  useEffect(() => {
    const checkEncryption = async () => {
      const result = await isTorrentMetadataEncrypted();
      if (result.success && result.data) {
        setIsEncrypted(result.data.isEncrypted);
      }
    };
    checkEncryption();
  }, [needsPassword]);

  const handleEncryptionChange = async () => {
    const result = await isTorrentMetadataEncrypted();
    if (result.success && result.data) {
      setIsEncrypted(result.data.isEncrypted);
    }
  };

  if (isEncrypted === null) {
    return null;
  }

  return (
    <FilesPageBorderWrapper>
      <FilesPageWrapper folderPath="">
        <div className="flex-shrink-0">
          <Header showTorrentsButton={false} />
        </div>

        <div className="flex flex-1 overflow-hidden min-h-0">
          <MobileSidebarWrapper
            title="Torrents"
            sidebar={
              <TorrentsSidebar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            }
          >
            <main className="flex-1 overflow-y-auto">
              {isEncrypted ? (
                <div className="px-6 pt-6 pb-[90px] lg:px-8 lg:pb-8 lg:pt-8">
                  <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center max-w-md">
                      <div className="mb-6">
                        <span className="material-symbols-outlined text-on-surface/40 text-6xl sm:text-7xl block mb-4">
                          lock
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-medium text-on-surface mb-3">
                        Torrent Metadata is Encrypted
                      </h2>
                      <p className="text-sm sm:text-base text-on-surface/60 mb-6">
                        Please decrypt your torrent metadata to view and manage your torrents.
                      </p>
                      <div className="flex justify-center">
                        <TorrentMetadataEncryptionButton
                          isEncrypted={isEncrypted}
                          onEncryptionChange={handleEncryptionChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="px-6 pt-6 pb-[90px] lg:px-8 lg:pb-8 lg:pt-8">
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

                        <div className="flex items-center gap-3 flex-shrink-0">
                          <TorrentMetadataEncryptionButton
                            isEncrypted={isEncrypted}
                            onEncryptionChange={handleEncryptionChange}
                          />
                        </div>
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
                </>
              )}
            </main>
          </MobileSidebarWrapper>
        </div>

        {!isEncrypted && activeTab === "downloads" && (
          <div className="fixed bottom-6 right-6 z-30 medium:flex hidden items-center gap-2">
            <DropdownMenu
              items={[
                {
                  label: "Torrent File",
                  icon: "p2p",
                  onClick: handleTorrentFileUpload,
                },
                {
                  label: "Magnet Link",
                  icon: "link",
                  onClick: handleMagnetLink,
                },
              ]}
              position="top"
              triggerElement={
                <IconButton
                  icon="add"
                  ariaLabel="Add torrent"
                  size="lg"
                  className="bg-primary text-on-primary"
                />
              }
            />
          </div>
        )}

        {!isEncrypted && (
          <TorrentsMobileBottomBar
            onToggleSidebar={toggleSidebar}
            onMagnetLink={handleMagnetLink}
            onTorrentFile={handleTorrentFileUpload}
          />
        )}

        {!isEncrypted && isTorrentModalOpen && (
          <AddTorrentModal
            isOpen={isTorrentModalOpen}
            onClose={() => {
              setIsTorrentModalOpen(false);
              setInitialTorrentFile(undefined);
            }}
            initialTorrentFile={initialTorrentFile}
            initialFolderPath={null}
          />
        )}

        {!isEncrypted && isMagnetModalOpen && (
          <AddMagnetModal
            isOpen={isMagnetModalOpen}
            onClose={() => {
              setIsMagnetModalOpen(false);
              setInitialMagnet(undefined);
            }}
            initialMagnet={initialMagnet}
            initialTorrentFile={initialTorrentFile}
          />
        )}

        {!isEncrypted && (
          <DeepLinkHandler
            onTorrentAdded={() => {
              setIsTorrentModalOpen(false);
              setIsMagnetModalOpen(false);
            }}
          />
        )}
      </FilesPageWrapper>
    </FilesPageBorderWrapper>
  );
}

export default function TorrentsPageClient() {
  return (
    <SidebarProvider>
      <TorrentsPageContent />
    </SidebarProvider>
  );
}
