import "server-only";

import archiver from "archiver";
import AdmZip from "adm-zip";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import { isInside } from "@/app/_lib/storage";

const SYMLINK_MODE = 0o120000;
const FILE_TYPE_MASK = 0o170000;
const ZIP_LEVEL = 9;

export const createArchiveToFile = async (
  sourcePath: string,
  outputPath: string
): Promise<void> => {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  const stats = await fs.stat(sourcePath);

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(outputPath);
    const archive = archiver("zip", { zlib: { level: ZIP_LEVEL } });

    output.on("close", resolve);
    output.on("error", reject);
    archive.on("error", reject);
    archive.pipe(output);

    if (stats.isDirectory()) {
      archive.directory(sourcePath, false);
    } else {
      archive.file(sourcePath, { name: path.basename(sourcePath) });
    }

    archive.finalize().catch(reject);
  });
};

const _isSymlink = (entry: AdmZip.IZipEntry): boolean =>
  ((entry.header.attr >>> 16) & FILE_TYPE_MASK) === SYMLINK_MODE;

export const extractArchive = async (
  archivePath: string,
  outputDir: string
): Promise<void> => {
  const root = path.resolve(outputDir);
  await fs.mkdir(root, { recursive: true });

  const zip = new AdmZip(archivePath);

  for (const entry of zip.getEntries()) {
    if (_isSymlink(entry)) continue;

    const target = path.resolve(root, entry.entryName);
    if (!isInside(root, target) || target === root) {
      throw new Error(`Unsafe archive entry: ${entry.entryName}`);
    }

    if (entry.isDirectory) {
      await fs.mkdir(target, { recursive: true });
      continue;
    }

    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, entry.getData(), { flag: "wx" });
  }
};
