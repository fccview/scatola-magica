"use client";

import { useState } from "react";
import Link from "next/link";
import ProfileTab from "@/app/_components/FeatureComponents/SettingsPage/ProfileTab";
import PreferencesTab from "@/app/_components/FeatureComponents/SettingsPage/PreferencesTab";
import EncryptionTab from "@/app/_components/FeatureComponents/SettingsPage/EncryptionTab";
import UsersTab from "@/app/_components/FeatureComponents/SettingsPage/UsersTab";
import AuditLogsTab from "@/app/_components/FeatureComponents/SettingsPage/AuditLogsTab";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import ThemeSelector from "@/app/_components/GlobalComponents/Layout/ThemeSelector";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import FilesPageBorderWrapper from "@/app/_components/GlobalComponents/Files/FilesPageBorderWrapper";
import FilesPageWrapper from "@/app/_components/GlobalComponents/Files/FilesPageWrapper";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Select from "@/app/_components/GlobalComponents/Form/Select";
import { SidebarProvider } from "@/app/_providers/SidebarProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

type Tab = "profile" | "preferences" | "encryption" | "users" | "audit-logs";

export default function SettingsPage() {
  const { user } = usePreferences();

  if (!user) {
    return null;
  }
  const [activeTab, setActiveTab] = useState<Tab>("profile");

  const tabs: { id: Tab; label: string; icon: string }[] = [
    { id: "profile", label: "Profile", icon: "person" },
    { id: "preferences", label: "Preferences", icon: "tune" },
    { id: "encryption", label: "Encryption", icon: "lock" },
    ...(user.isAdmin
      ? [
          { id: "users" as Tab, label: "Users", icon: "group" },
          { id: "audit-logs" as Tab, label: "Audit Logs", icon: "description" },
        ]
      : []),
  ];

  return (
    <FilesPageBorderWrapper>
      <SidebarProvider>
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
              <div className="p-6 lg:p-8">
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
                {activeTab === "encryption" && <EncryptionTab />}
                {activeTab === "users" && <UsersTab />}
                {activeTab === "audit-logs" && <AuditLogsTab />}
              </div>
            </main>
          </div>
        </FilesPageWrapper>
      </SidebarProvider>
    </FilesPageBorderWrapper>
  );
}
