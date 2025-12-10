"use server";

import { readdir, readFile } from "fs/promises";
import path from "path";

export const listHowtoFiles = async () => {
  const howtoDir = path.join(process.cwd(), "howto");
  const files = await readdir(howtoDir);

  return files
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const name = file.replace(".md", "");
      const title = name
        .replace(/-/g, " ")
        .replace(/\b\w/g, (char) => char.toUpperCase());

      return {
        id: name,
        title,
        file,
      };
    });
}

export const getHowtoContent = async (filename: string): Promise<string> => {
  const howtoDir = path.join(process.cwd(), "howto");
  const filePath = path.join(howtoDir, filename);
  const content = await readFile(filePath, "utf-8");
  return content;
}
