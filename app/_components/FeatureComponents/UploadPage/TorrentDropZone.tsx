"use client";

interface TorrentDropZoneProps {
    isDragging: boolean;
    onDragEnter: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onFileSelect: () => void;
    disabled?: boolean;
    selectedFile?: File | null;
}

const TorrentDropZone = ({
                             isDragging,
                             onDragEnter,
                             onDragOver,
                             onDragLeave,
                             onDrop,
                             onFileSelect,
                             disabled = false,
                             selectedFile = null,
                         }: TorrentDropZoneProps) => {
    return (
        <div
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
        relative border-2 border-dashed rounded-lg p-8 transition-all
        ${
                isDragging
                    ? "border-primary bg-primary/10"
                    : "border-outline bg-surface-container/50"
            }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:border-primary hover:bg-surface-container"}
      `}
            onClick={disabled ? undefined : onFileSelect}
        >
            <div className="flex flex-col items-center gap-3 text-center">
        <span
            className={`material-symbols-outlined text-5xl ${
                isDragging ? "text-primary" : "text-on-surface-variant"
            }`}
        >
          {selectedFile ? "check_circle" : "folder_zip"}
        </span>

                {selectedFile ? (
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-on-surface">
                            {selectedFile.name}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                            Click to select a different file
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-sm font-medium text-on-surface">
                            {isDragging
                                ? "Drop torrent file here"
                                : "Drop torrent file or click to browse"}
                        </p>
                        <p className="text-xs text-on-surface-variant">
                            Supports .torrent files
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default TorrentDropZone;