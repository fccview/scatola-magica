import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import ServiceWorkerRegistrar from "@/app/_components/GlobalComponents/Layout/ServiceWorkerRegistrar";
import PWAInstallPrompt from "@/app/_components/GlobalComponents/Layout/PWAInstallPrompt";
import ThemeScript from "@/app/_components/GlobalComponents/Layout/ThemeScript";
import UploadOverlayProvider from "@/app/_providers/UploadOverlayProvider";
import FoldersProvider from "@/app/_providers/FoldersProvider";
import UsersProvider from "@/app/_providers/UsersProvider";
import ThemeProvider from "@/app/_providers/ThemeProvider";
import ShortcutsProvider from "@/app/_providers/ShortcutsProvider";
import ContextMenuProvider from "@/app/_providers/ContextMenuProvider";
import FileViewerProvider from "@/app/_providers/FileViewerProvider";
import FileViewer from "@/app/_components/FeatureComponents/Modals/FileViewer";
import { PreferencesProvider } from "@/app/_providers/PreferencesProvider";
import { getUserRecord } from "@/app/_lib/current-user";
import { readUsers, toPublicUser } from "@/app/_lib/auth-utils";
import { getUserPreferences } from "@/app/_lib/preferences-store";
import { pathTokenFor } from "@/app/_lib/path-encryption";
import type { CurrentUser, PublicUser } from "@/app/_types";
import AnimatedPokemon from "@/app/_components/GlobalComponents/Layout/AnimatedPokemon";
import { SIDEBAR_COOKIE } from "@/app/_lib/constants";
import { parseWidth, widthStyle } from "@/app/_lib/sidebar-width";
import "@/app/globals.css";
import "@/app/_styles/effects.css";

export const metadata: Metadata = {
  title: "Scatola Magica",
  description: "Self-hosted file transfer application",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Scatola",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const RootLayout = async ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  const record = await getUserRecord();
  const currentUser: CurrentUser | null = record
    ? {
        username: record.username,
        isAdmin: !!record.isAdmin,
        isSuperAdmin: !!record.isSuperAdmin,
        avatar: record.avatar,
        persistentTheme: record.persistentTheme ?? false,
        pokemonTheme: record.pokemonTheme,
        colorMode: record.colorMode,
      }
    : null;
  const preferences = currentUser
    ? await getUserPreferences(currentUser.username)
    : {
        particlesEnabled: true,
        wandCursorEnabled: true,
        username: "",
      };
  const cookieStore = await cookies();
  const sidebarWidth = parseWidth(cookieStore.get(SIDEBAR_COOKIE)?.value);
  const encryptionKey = record?.encryptionKey || null;
  const pathToken = encryptionKey ? pathTokenFor(encryptionKey) : null;

  const allUsers = currentUser ? await readUsers() : [];
  const initialUsers: PublicUser[] = currentUser?.isAdmin
    ? allUsers.map(toPublicUser)
    : allUsers
        .filter((u) => u.username === currentUser?.username)
        .map(toPublicUser);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      style={widthStyle(sidebarWidth) as CSSProperties}
    >
      <head>
        <ThemeScript
          persistentTheme={currentUser?.persistentTheme ?? false}
          userPokemonTheme={currentUser?.pokemonTheme}
          userColorMode={currentUser?.colorMode}
        />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#A91D52" />
        <link rel="icon" type="image/x-icon" href="/favicon/favicon.ico" />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon/favicon-16x16.png"
        />
        <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
        <link
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
          rel="stylesheet"
        />
      </head>
      <body>
        <ServiceWorkerRegistrar />
        <PWAInstallPrompt />
        <PreferencesProvider
          preferences={{
            particlesEnabled: preferences.particlesEnabled,
            wandCursorEnabled: preferences.wandCursorEnabled,
            sidebarWidth,
            pokemonThemesEnabled: preferences.pokemonThemesEnabled,
            user: currentUser,
            encryptionKey,
            pathToken,
            customKeysPath: preferences.customKeysPath,
            e2eEncryptionOnTransfer: preferences.e2eEncryptionOnTransfer,
            showThumbnails: preferences.showThumbnails ?? false,
            torrentPreferences: preferences.torrentPreferences,
            dropzones: preferences.dropzones,
          }}
        >
          <ThemeProvider>
            <UsersProvider initialUsers={initialUsers}>
              <FoldersProvider>
                <ShortcutsProvider>
                  <ContextMenuProvider>
                    <FileViewerProvider>
                      <UploadOverlayProvider>
                        {children}
                        <FileViewer />
                        <AnimatedPokemon />
                      </UploadOverlayProvider>
                    </FileViewerProvider>
                  </ContextMenuProvider>
                </ShortcutsProvider>
              </FoldersProvider>
            </UsersProvider>
          </ThemeProvider>
        </PreferencesProvider>
      </body>
    </html>
  );
};

export default RootLayout;
