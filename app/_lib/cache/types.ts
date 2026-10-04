export interface DiskChange {
  paths: string[];
  everything: boolean;
}

export type ChangeListener = (change: DiskChange) => void;

export interface CacheBackend {
  read: (key: string) => Promise<string | null>;
  write: (key: string, value: string, ttlSeconds: number) => Promise<void>;
  epochs: (scopes: string[]) => Promise<string[]>;
  bump: (scopes: string[]) => Promise<void>;
  announce: (change: DiskChange) => Promise<void>;
  listen: (listener: ChangeListener) => () => void;
}
