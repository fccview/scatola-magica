import "server-only";

import fs from "fs/promises";
import path from "path";
import { UPLOAD_DIR } from "@/app/_lib/storage";
import { AVATARS_DIR } from "@/app/_lib/auth-utils";
import { logger } from "@/app/_lib/logger";

const SCOPE = "user-files";

export const AVATAR_EXTENSIONS = [".png", ".jpg", ".jpeg", ".gif", ".webp"];
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export const userFolder = (username: string): string =>
  path.join(UPLOAD_DIR, username);

export const createUserFolder = async (username: string): Promise<void> => {
  try {
    await fs.mkdir(userFolder(username), { recursive: true });
  } catch (error) {
    logger.error(SCOPE, `Failed to create folder for ${username}`, error);
  }
};

export const removeUserFolder = async (username: string): Promise<void> => {
  try {
    await fs.rm(userFolder(username), { recursive: true, force: true });
  } catch (error) {
    logger.error(SCOPE, `Failed to remove folder for ${username}`, error);
  }
};

export const avatarPath = (filename: string): string | null => {
  const absolute = path.resolve(AVATARS_DIR, filename);
  return path.dirname(absolute) === AVATARS_DIR ? absolute : null;
};

export const removeAvatarFile = async (filename?: string): Promise<void> => {
  if (!filename) return;

  const absolute = avatarPath(filename);
  if (!absolute) return;

  try {
    await fs.unlink(absolute);
  } catch (error) {
    logger.warn(SCOPE, `Failed to delete avatar ${filename}`, error);
  }
};

export const renameIfExists = async (
  from: string,
  to: string
): Promise<void> => {
  try {
    await fs.access(from);
  } catch {
    return;
  }

  try {
    await fs.mkdir(path.dirname(to), { recursive: true });
    await fs.rename(from, to);
  } catch (error) {
    logger.error(SCOPE, `Failed to move ${from} -> ${to}`, error);
  }
};
