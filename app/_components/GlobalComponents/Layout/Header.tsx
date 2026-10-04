"use client";

import { useRouter } from "next/navigation";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import BrandLink from "@/app/_components/GlobalComponents/Layout/BrandLink";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import HelpButton from "@/app/_components/GlobalComponents/Layout/HelpButton";
import ThemeSelector from "@/app/_components/GlobalComponents/Layout/ThemeSelector";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

export default function Header({
  showHelpButton = true,
  showTorrentsButton = true,
  showFilesButton = true,
  showSettingsButton = true,
  showThemeSelector = true,
  showUserMenu = true,
  docked = false,
}: {
  showHelpButton?: boolean;
  showTorrentsButton?: boolean;
  showFilesButton?: boolean;
  showSettingsButton?: boolean;
  showThemeSelector?: boolean;
  showUserMenu?: boolean;
  docked?: boolean;
}) {
  const router = useRouter();
  const { torrentPreferences } = usePreferences();
  const torrentsEnabled = torrentPreferences?.enabled ?? false;

  return (
    <TopAppBar
      docked={docked}
      leading={<BrandLink />}
      trailing={
        <div className="flex items-center gap-2">
          {showTorrentsButton && torrentsEnabled && (
            <IconButton
              icon="p2p"
              onClick={() => {
                router.push("/torrents");
              }}
            />
          )}
          {showFilesButton && (
            <IconButton
              icon="folder"
              onClick={() => {
                router.push("/files");
              }}
            />
          )}
          {showHelpButton && <HelpButton />}
          {showThemeSelector && <ThemeSelector />}
          {showUserMenu && <UserMenu />}
        </div>
      }
    />
  );
}
