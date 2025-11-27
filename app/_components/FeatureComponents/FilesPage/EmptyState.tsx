export default function EmptyState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">
          folder_open
        </span>
        <p className="text-xl text-on-surface-variant">
          No files or folders
        </p>
        <p className="text-sm text-on-surface-variant mt-2">
          Upload your first file or create a folder to get started
        </p>
      </div>
    </div>
  );
}
