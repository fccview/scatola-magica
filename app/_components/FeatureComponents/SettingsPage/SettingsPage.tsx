"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ProfileTab from "@/app/_components/FeatureComponents/SettingsPage/ProfileTab";
import PreferencesTab from "@/app/_components/FeatureComponents/SettingsPage/PreferencesTab";
import UploadSettingsTab from "@/app/_components/FeatureComponents/SettingsPage/UploadSettingsTab";
import EncryptionTab from "@/app/_components/FeatureComponents/SettingsPage/EncryptionTab";
import UsersTab from "@/app/_components/FeatureComponents/SettingsPage/UsersTab";
import AuditLogsTab from "@/app/_components/FeatureComponents/SettingsPage/AuditLogsTab";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import ThemeSelector from "@/app/_components/GlobalComponents/Layout/ThemeSelector";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import BrandLink from "@/app/_components/GlobalComponents/Layout/BrandLink";
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
  const pathname = usePathname();
  const router = useRouter();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const { toggleSidebar } = useSidebar();
  const torrentsEnabled = torrentPreferences?.enabled ?? false;

  const handleOpenUpload = () => {
    setIsUploadModalOpen(true);
  };

  const validTabs: Tab[] = [
    "profile",
    "preferences",
    "upload",
    "encryption",
    ...(torrentsEnabled ? ["torrents" as Tab] : []),
    ...(user?.isAdmin ? ["users" as Tab, "audit-logs" as Tab] : []),
  ];

  const tabFromPath = pathname.split("/")[2] as Tab | undefined;
  const activeTab: Tab =
    tabFromPath && validTabs.includes(tabFromPath) ? tabFromPath : "profile";

  useEffect(() => {
    if (activeTab === "torrents" && !torrentsEnabled) {
      router.replace("/settings/profile");
    }
  }, [torrentsEnabled, activeTab]);

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
        <div className="flex flex-1 overflow-hidden min-h-0">
          <MobileSidebarWrapper
            title="Settings"
            header={
              <TopAppBar
                docked
                leading={<BrandLink />}
                trailing={
                  <div className="flex items-center gap-2">
                    <ThemeSelector />
                    <UserMenu />
                  </div>
                }
              />
            }
            sidebar={
              <SettingsSidebar
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={(tab) => router.push(`/settings/${tab}`)}
              />
            }
          >
            <main className="flex-1 overflow-y-auto">
              <div className="px-6 pt-6 pb-[90px] lg:px-8 lg:pb-8 lg:pt-8">
                <div className="lg:hidden mb-6">
                  <Select
                    value={activeTab}
                    onChange={(e) => router.push(`/settings/${e.target.value}`)}
                  >
                    {tabs.map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.label}
                      </option>
                    ))}
                  </Select>
                </div>

                <div key={activeTab} className="fx-rise">
                  {activeTab === "profile" && <ProfileTab />}
                  {activeTab === "preferences" && <PreferencesTab />}
                  {activeTab === "upload" && <UploadSettingsTab />}
                  {activeTab === "encryption" && <EncryptionTab />}
                  {activeTab === "users" && <UsersTab />}
                  {activeTab === "audit-logs" && <AuditLogsTab />}
                  {activeTab === "torrents" && torrentsEnabled && <TorrentsTab />}
                </div>
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
