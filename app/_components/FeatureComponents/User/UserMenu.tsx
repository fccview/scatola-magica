"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import type { CurrentUser } from "@/app/_types";
import DropdownMenu from "@/app/_components/GlobalComponents/Form/DropdownMenu";
import UserAvatar from "@/app/_components/FeatureComponents/User/UserAvatar";
import CreateUserModal from "@/app/_components/FeatureComponents/Modals/CreateUserModal";

export default function UserMenu() {
  const { user } = usePreferences();

  if (!user) {
    return null;
  }

  return <UserMenuContent user={user} />;
}

const UserMenuContent = ({ user }: { user: CurrentUser }) => {
  const { username, isAdmin } = user;
  const router = useRouter();
  const [showCreateUser, setShowCreateUser] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
      if (response.ok) {
        router.push("/auth/login");
        router.refresh();
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/api/auth/logout";
    }
  };

  const menuItems = [
    {
      label: "Settings",
      icon: "settings",
      onClick: () => router.push("/settings"),
      disabled: false,
    },
    ...(isAdmin
      ? [
          {
            label: "Create User",
            icon: "person_add",
            onClick: () => setShowCreateUser(true),
            disabled: false,
          },
        ]
      : []),
    {
      label: "Logout",
      icon: "logout",
      onClick: handleLogout,
      variant: "danger" as const,
      disabled: false,
    },
  ];

  return (
    <>
      <DropdownMenu
        items={menuItems}
        triggerElement={
          <div className="cursor-pointer">
            <UserAvatar user={user} size="md" />
          </div>
        }
      />
      {showCreateUser && (
        <CreateUserModal
          isOpen={showCreateUser}
          onClose={() => setShowCreateUser(false)}
        />
      )}
    </>
  );
};
