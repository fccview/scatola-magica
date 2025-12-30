"use client";

import { createContext, useContext, ReactNode } from "react";
import { User, TorrentPreferences } from "@/app/_types";

interface PreferencesContextType {
  particlesEnabled: boolean;
  wandCursorEnabled: boolean;
  pokemonThemesEnabled?: boolean;
  user: Partial<User> | null;
  encryptionKey: string | null;
  customKeysPath?: string;
  e2eEncryptionOnTransfer?: boolean;
  torrentPreferences?: TorrentPreferences;
}

const PreferencesContext = createContext<PreferencesContextType>({
  particlesEnabled: true,
  wandCursorEnabled: true,
  pokemonThemesEnabled: false,
  user: null,
  encryptionKey: null,
  customKeysPath: undefined,
  e2eEncryptionOnTransfer: true,
  torrentPreferences: {
    seedRatio: 1.0,
    autoStartTorrents: true,
    maxActiveTorrents: 5,
    maxTorrentFileSize: 10 * 1024 * 1024,
    maxSingleFileSize: 50 * 1024 * 1024 * 1024,
    maxTotalTorrentSize: 100 * 1024 * 1024 * 1024,
    maxFolderFileCount: 10000,
    maxPathDepth: 10,
    maxDownloadSpeed: -1,
    maxUploadSpeed: -1,
    trackers: [],
    allowCustomTrackers: false,
  },
});

export const PreferencesProvider = ({
  children,
  preferences,
}: {
  children: ReactNode;
  preferences: PreferencesContextType;
}) => {
  return (
    <PreferencesContext.Provider value={preferences}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  return useContext(PreferencesContext);
};
