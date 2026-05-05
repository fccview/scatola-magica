"use server";

import archiver from "archiver";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";

export const createArchiveToFile = async (
  sourcePath: string,
  outputPath: string
): Promise<void> => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);

    archive.pipe(output);

    void (async () => {
      const stats = await fs.stat(sourcePath);
      if (stats.isDirectory()) {
        archive.directory(sourcePath, false);
      } else {
        archive.file(sourcePath, { name: path.basename(sourcePath) });
      }

      await archive.finalize();
    })().catch(reject);
  });
}

export const extractArchive = async (
  archivePath: string,
  outputDir: string
): Promise<void> => {
  await fs.mkdir(outputDir, { recursive: true });

  const zip = new AdmZip(archivePath);
  zip.extractAllTo(outputDir, true);
}
