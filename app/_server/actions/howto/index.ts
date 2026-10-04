"use server";

import { readdir, readFile } from "fs/promises";
import path from "path";
import { getCurrentUser } from "@/app/_lib/current-user";
import { logger } from "@/app/_lib/logger";

const SCOPE = "howto";
const HOWTO_DIR = path.join(process.cwd(), "howto");
const MARKDOWN_EXTENSION = ".md";

interface HowtoFile {
  id: string;
  title: string;
  file: string;
}

const _toTitle = (name: string): string =>
  name.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const _markdownFiles = async (): Promise<string[]> => {
  const files = await readdir(HOWTO_DIR);
  return files.filter((file) => file.endsWith(MARKDOWN_EXTENSION));
};

export const listHowtoFiles = async (): Promise<HowtoFile[]> => {
  try {
    const files = await _markdownFiles();
    return files.map((file) => {
      const id = file.slice(0, -MARKDOWN_EXTENSION.length);
      return { id, title: _toTitle(id), file };
    });
  } catch (error) {
    logger.error(SCOPE, "Failed to list howto files", error);
    return [];
  }
};

export const getHowtoContent = async (filename: string): Promise<string> => {
  if (!(await getCurrentUser())) return "";

  const files = await _markdownFiles();
  if (!files.includes(filename)) return "";

  return readFile(path.join(HOWTO_DIR, filename), "utf-8");
};
