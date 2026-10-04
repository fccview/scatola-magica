import { TorrentPreferences } from "@/app/_types/torrent";

export interface DropzonePreferences {
  enabled?: boolean;
  zone1?: string;
  zone2?: string;
  zone3?: string;
  zone4?: string;
}

export interface UserPreferences {
  username: string;
  particlesEnabled: boolean;
  wandCursorEnabled: boolean;
  pokemonThemesEnabled?: boolean;
  customKeysPath?: string;
  e2eEncryptionOnTransfer?: boolean;
  showThumbnails?: boolean;
  torrentPreferences?: TorrentPreferences;
  dropzones?: DropzonePreferences;
}

export type PartialUserPreferences = Partial<
  Omit<UserPreferences, "username" | "torrentPreferences" | "dropzones">
> & {
  torrentPreferences?: Partial<TorrentPreferences>;
  dropzones?: Partial<DropzonePreferences>;
};

export enum RemovablePreference {
  CUSTOM_KEYS_PATH = "customKeysPath",
}
