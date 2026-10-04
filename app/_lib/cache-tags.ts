import "server-only";

import { revalidatePath, revalidateTag } from "next/cache";

export enum CacheTag {
  FILES = "files",
  FOLDERS = "folders",
}

export const CACHE_TTL_SECONDS = 60;

const EXPIRE_NOW = { expire: 0 };

export const bustFileCache = (): void => {
  revalidateTag(CacheTag.FILES, EXPIRE_NOW);
  revalidateTag(CacheTag.FOLDERS, EXPIRE_NOW);
  revalidatePath("/files", "layout");
};
