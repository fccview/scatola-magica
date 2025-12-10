import type { Metadata, Viewport } from "next";
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
import { getCurrentUser, readUsers } from "@/app/_server/actions/user";
import { getUserPreferences } from "@/app/_lib/preferences";
import AnimatedPokemon from "@/app/_components/GlobalComponents/Layout/AnimatedPokemon";
import "@/app/globals.css";

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
  const currentUser = await getCurrentUser();
  const preferences = currentUser
    ? await getUserPreferences(currentUser.username)
    : { particlesEnabled: true, wandCursorEnabled: true, username: "" };
  const initialUsers = await readUsers();

  let encryptionKey: string | null = null;
  if (currentUser) {
    const user = initialUsers.find((u) => u.username === currentUser.username);
    encryptionKey = user?.encryptionKey || null;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
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
        <ThemeProvider>
          <PreferencesProvider
            preferences={{
              particlesEnabled: preferences.particlesEnabled,
              wandCursorEnabled: preferences.wandCursorEnabled,
              pokemonThemesEnabled: preferences.pokemonThemesEnabled,
              user: currentUser,
              encryptionKey,
              customKeysPath: preferences.customKeysPath,
              e2eEncryptionOnTransfer: preferences.e2eEncryptionOnTransfer,
            }}
          >
            <UsersProvider initialUsers={initialUsers}>
              <FoldersProvider>
                <ShortcutsProvider>
                  <ContextMenuProvider>
                    <FileViewerProvider>
                      <UploadOverlayProvider>{children}</UploadOverlayProvider>
                      <FileViewer />
                      <AnimatedPokemon />
                    </FileViewerProvider>
                  </ContextMenuProvider>
                </ShortcutsProvider>
              </FoldersProvider>
            </UsersProvider>
          </PreferencesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
};

export default RootLayout;
