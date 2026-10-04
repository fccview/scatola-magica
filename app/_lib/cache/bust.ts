import "server-only";

import { revalidatePath } from "next/cache";
import { toRelative } from "@/app/_lib/cache/scopes";
import { flushChanges, recordChange } from "@/app/_lib/disk-watch";

export const bustFileCache = async (...absolutes: string[]): Promise<void> => {
  recordChange(absolutes.map(toRelative));
  await flushChanges();
  revalidatePath("/files", "layout");
};
