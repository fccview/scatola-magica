export interface FileWithPath {
  file: File;
  relativePath: string;
  fullPath: string;
}

export interface FolderStructure {
  files: FileWithPath[];
  rootFolderName: string;
}

const _readDir = async (
  directoryEntry: FileSystemDirectoryEntry,
  basePath: string
): Promise<FileWithPath[]> => {
  const files: FileWithPath[] = [];
  const entries = await _readAllDirEntries(directoryEntry);

  for (const entry of entries) {
    if (entry.isFile) {
      const file = await _getFileFromEntry(entry as FileSystemFileEntry);
      if (file) {
        const fullPath = `${basePath}/${entry.name}`;
        const relativePath = fullPath.substring(
          basePath.split("/")[0].length + 1
        );
        files.push({
          file,
          relativePath,
          fullPath,
        });
      }
    } else if (entry.isDirectory) {
      const subFiles = await _readDir(
        entry as FileSystemDirectoryEntry,
        `${basePath}/${entry.name}`
      );
      files.push(...subFiles);
    }
  }

  return files;
}

const _readAllDirEntries = async (
  directoryEntry: FileSystemDirectoryEntry
): Promise<FileSystemEntry[]> => {
  const reader = directoryEntry.createReader();
  const entries: FileSystemEntry[] = [];

  return new Promise((resolve, reject) => {
    const readBatch = () => {
      reader.readEntries(
        (batch) => {
          if (batch.length === 0) {
            resolve(entries);
          } else {
            entries.push(...batch);
            readBatch();
          }
        },
        (error) => {
          reject(error);
        }
      );
    };

    readBatch();
  });
}

const _getFileFromEntry = async (
  fileEntry: FileSystemFileEntry
): Promise<File | null> => {
  return new Promise((resolve) => {
    fileEntry.file(
      (file) => resolve(file),
      (error) => {
        console.error("Error reading file:", error);
        resolve(null);
      }
    );
  });
}

export const readFilesFromDataTransfer = async (
  dataTransfer: DataTransfer
): Promise<FolderStructure> => {
  const items = Array.from(dataTransfer.items);
  const allFiles: FileWithPath[] = [];
  const folderNames: string[] = [];
  const regularFiles: FileWithPath[] = [];
  let hasDirectories = false;

  for (const item of items) {
    if (item.kind === "file") {
      const entry = item.webkitGetAsEntry();
      if (entry && entry.isDirectory) {
        hasDirectories = true;
        folderNames.push(entry.name);
        const folderFiles = await _readDir(
          entry as FileSystemDirectoryEntry,
          entry.name
        );
        allFiles.push(...folderFiles);
      }
    }
  }

  if (!hasDirectories) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      regularFiles.push({
        file,
        relativePath: file.name,
        fullPath: file.name,
      });
    }
  }

  allFiles.push(...regularFiles);

  let rootFolderName = "";
  if (folderNames.length === 1) {
    rootFolderName = folderNames[0];
  } else if (folderNames.length > 1) {
    rootFolderName = folderNames.join(", ");
  }

  return {
    files: allFiles,
    rootFolderName,
  };
}

export const extractFolderPaths = (files: FileWithPath[]): string[] => {
  const folderSet = new Set<string>();

  for (const fileWithPath of files) {
    const pathParts = fileWithPath.relativePath.split("/");
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderPath = pathParts.slice(0, i + 1).join("/");
      folderSet.add(folderPath);
    }
  }

  return Array.from(folderSet).sort();
};
