"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import HelpButton from "@/app/_components/GlobalComponents/Layout/HelpButton";
import ThemeSelector from "@/app/_components/GlobalComponents/Layout/ThemeSelector";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";

export default function Header({
  showHelpButton = true,
  showTorrentsButton = true,
  showFilesButton = true,
  showSettingsButton = true,
  showThemeSelector = true,
  showUserMenu = true,
}: {
  showHelpButton?: boolean;
  showTorrentsButton?: boolean;
  showFilesButton?: boolean;
  showSettingsButton?: boolean;
  showThemeSelector?: boolean;
  showUserMenu?: boolean;
}) {
  const router = useRouter();

  return (
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
          {showTorrentsButton && (
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
