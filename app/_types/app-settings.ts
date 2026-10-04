export interface AppSettings {
  upload: {
    maxChunkSize: number;
    parallelUploads: number;
    maxFileSize: number;
  };
}
