"use client";

import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

type Tab =
  | "profile"
  | "preferences"
  | "encryption"
  | "users"
  | "audit-logs"
  | "torrents";

interface SettingsSidebarProps {
  tabs: { id: Tab; label: string; icon: string }[];
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export default function SettingsSidebar({
  tabs,
  activeTab,
  onTabChange,
}: SettingsSidebarProps) {
  return (
    <nav className="px-2 pb-2 pt-6 space-y-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${activeTab === tab.id
              ? "bg-sidebar-active text-on-surface font-medium"
              : "text-on-surface hover:bg-surface-variant/20"
            }`}
        >
          <Icon icon={tab.icon} size="sm" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

