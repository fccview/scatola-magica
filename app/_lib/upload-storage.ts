interface StoredUpload {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileData: ArrayBuffer;
  uploadId: string;
  totalChunks: number;
  uploadedChunks: number[];
  status: string;
  createdAt: number;
}

const DB_NAME = "scatola-uploads";
const DB_VERSION = 1;
const STORE_NAME = "uploads";

let dbInstance: IDBDatabase | null = null;

async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveUpload(
  id: string,
  file: File,
  uploadId: string,
  totalChunks: number,
  uploadedChunks: number[],
  status: string
): Promise<void> {
  if (!id) {
    throw new Error("Upload ID is required");
  }

  const db = await getDB();
  const arrayBuffer = await file.arrayBuffer();

  const upload: StoredUpload = {
    id: String(id),
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    fileData: arrayBuffer,
    uploadId: String(uploadId),
    totalChunks,
    uploadedChunks,
    status,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(upload);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getUpload(id: string): Promise<StoredUpload | null> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllUploads(): Promise<StoredUpload[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function updateUploadProgress(
  id: string,
  uploadedChunks: number[],
  status: string
): Promise<void> {
  if (!id) {
    return;
  }

  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const getRequest = store.get(String(id));

    getRequest.onsuccess = () => {
      const upload = getRequest.result;
      if (upload) {
        upload.uploadedChunks = uploadedChunks;
        upload.status = status;
        const putRequest = store.put(upload);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function deleteUpload(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export const restoreFileFromStorage = (stored: StoredUpload): File => {
  return new File([stored.fileData], stored.fileName, {
    type: stored.fileType,
  });
};
