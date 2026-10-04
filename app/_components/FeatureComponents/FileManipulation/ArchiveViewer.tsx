"use client";

import PreviewStatus from "./PreviewStatus";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import { useArchivePeek } from "@/app/_hooks/useArchivePeek";
import { formatBytes } from "@/app/_lib/file-utils";
import { getFileIcon } from "@/app/_lib/file-icons";

interface ArchiveViewerProps {
  fileId: string;
}

const ArchiveViewer = ({ fileId }: ArchiveViewerProps) => {
  const { listing, error, isLoading } = useArchivePeek(fileId);

  if (isLoading || error || !listing) {
    return <PreviewStatus error={error} />;
  }

  const hidden = listing.total - listing.entries.length;

  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm text-on-surface-variant">
        {listing.total} item{listing.total !== 1 ? "s" : ""} inside
      </div>

      <ul className="overflow-auto max-h-[65vh] rounded-lg bg-surface-container divide-y divide-outline-variant">
        {listing.entries.map((entry) => (
          <li
            key={entry.name}
            className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface"
          >
            <Icon
              icon={entry.isDirectory ? "folder" : getFileIcon(entry.name)}
              size="sm"
              className="text-on-surface-variant flex-shrink-0"
            />
            <span className="flex-1 min-w-0 truncate" title={entry.name}>
              {entry.name}
            </span>
            {!entry.isDirectory && (
              <span className="text-xs text-on-surface-variant tabular-nums flex-shrink-0">
                {formatBytes(entry.size)}
              </span>
            )}
          </li>
        ))}
      </ul>

      {hidden > 0 && (
        <div className="text-xs text-on-surface-variant">
          And {hidden} more. Download the archive to see everything.
        </div>
      )}
    </div>
  );
};

export default ArchiveViewer;
