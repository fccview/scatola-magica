"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProfileTab from "@/app/_components/FeatureComponents/SettingsPage/ProfileTab";
import PreferencesTab from "@/app/_components/FeatureComponents/SettingsPage/PreferencesTab";
import UploadSettingsTab from "@/app/_components/FeatureComponents/SettingsPage/UploadSettingsTab";
import EncryptionTab from "@/app/_components/FeatureComponents/SettingsPage/EncryptionTab";
import UsersTab from "@/app/_components/FeatureComponents/SettingsPage/UsersTab";
import AuditLogsTab from "@/app/_components/FeatureComponents/SettingsPage/AuditLogsTab";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import ThemeSelector from "@/app/_components/GlobalComponents/Layout/ThemeSelector";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import FilesPageBorderWrapper from "@/app/_components/GlobalComponents/Files/FilesPageBorderWrapper";
import FilesPageWrapper from "@/app/_components/GlobalComponents/Files/FilesPageWrapper";
import Select from "@/app/_components/GlobalComponents/Form/Select";
import { SidebarProvider, useSidebar } from "@/app/_providers/SidebarProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import TorrentsTab from "@/app/_components/FeatureComponents/SettingsPage/TorrentsTab";
import SettingsSidebar from "@/app/_components/FeatureComponents/SettingsPage/SettingsSidebar";
import MobileSidebarWrapper from "@/app/_components/FeatureComponents/FilesPage/MobileSidebarWrapper";
import MobileBottomBar from "@/app/_components/FeatureComponents/FilesPage/MobileBottomBar";
import UploadModal from "@/app/_components/FeatureComponents/Modals/UploadModal";

type Tab =
  | "profile"
  | "preferences"
  | "upload"
  | "encryption"
  | "users"
  | "audit-logs"
  | "torrents";

function SettingsPageContent() {
  const { user, torrentPreferences } = usePreferences();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { toggleSidebar } = useSidebar();
  const torrentsEnabled = torrentPreferences?.enabled ?? false;

  const handleOpenUpload = () => {
    setIsUploadModalOpen(true);
  };

  useEffect(() => {
    if (activeTab === "torrents" && !torrentsEnabled) {
      setActiveTab("profile");
    }
  }, [torrentsEnabled, activeTab]);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      const validTabs: Tab[] = [
        "profile",
        "preferences",
        "encryption",
        "users",
        "audit-logs",
        ...(torrentsEnabled ? ["torrents" as Tab] : []),
      ];
      if (validTabs.includes(tabParam as Tab)) {
        setActiveTab(tabParam as Tab);
      } else if (tabParam === "torrents" && !torrentsEnabled) {
        setActiveTab("profile");
      }
    }
  }, [searchParams, torrentsEnabled]);

  if (!user) {
    return null;
  }

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "profile", label: "Profile", icon: "person" },
    { id: "preferences", label: "Preferences", icon: "tune" },
    { id: "upload", label: "Upload", icon: "upload" },
    { id: "encryption", label: "Encryption", icon: "lock" },
    ...(torrentsEnabled ? [{ id: "torrents" as Tab, label: "Torrents", icon: "p2p" }] : []),
    ...(user.isAdmin
      ? [
        { id: "users" as Tab, label: "Users", icon: "group" },
        { id: "audit-logs" as Tab, label: "Audit Logs", icon: "description" },
      ]
      : []),
  ];

  return (
    <FilesPageBorderWrapper>
      <FilesPageWrapper folderPath="">
        <div className="flex-shrink-0">
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
        </div>
        <div className="flex flex-1 overflow-hidden min-h-0">
          <MobileSidebarWrapper
            title="Settings"
            sidebar={
              <SettingsSidebar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            }
          >
            <main className="flex-1 overflow-y-auto">
              <div className="px-6 pt-6 pb-[90px] lg:px-8 lg:pb-8 lg:pt-8">
                <div className="lg:hidden mb-6">
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

                {activeTab === "profile" && <ProfileTab />}
                {activeTab === "preferences" && <PreferencesTab />}
                {activeTab === "upload" && <UploadSettingsTab />}
                {activeTab === "encryption" && <EncryptionTab />}
                {activeTab === "users" && <UsersTab />}
                {activeTab === "audit-logs" && <AuditLogsTab />}
                {activeTab === "torrents" && torrentsEnabled && <TorrentsTab />}
              </div>
            </main>
          </MobileSidebarWrapper>
        </div>

        <MobileBottomBar
          onCreateFolder={async () => { }}
          onUpload={handleOpenUpload}
          onToggleSidebar={toggleSidebar}
          currentFolderId={null}
        />

        <UploadModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          initialFolderPath=""
          initialFiles={null}
        />
      </FilesPageWrapper>
    </FilesPageBorderWrapper>
  );
}

export default function SettingsPage() {
  return (
    <SidebarProvider>
      <SettingsPageContent />
    </SidebarProvider>
  );
}
