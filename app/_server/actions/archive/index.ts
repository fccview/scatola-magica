"use server";

import archiver from "archiver";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import { createWriteStream, statSync } from "fs";
import path from "path";

export const createArchiveToFile = async (
  sourcePath: string,
  outputPath: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    output.on("close", () => {
      resolve();
    });

    archive.on("error", (err) => {
      reject(err);
    });

    archive.pipe(output);

    const stats = statSync(sourcePath);
    if (stats.isDirectory()) {
      archive.directory(sourcePath, false);
    } else {
      archive.file(sourcePath, { name: path.basename(sourcePath) });
    }

    archive.finalize();
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
