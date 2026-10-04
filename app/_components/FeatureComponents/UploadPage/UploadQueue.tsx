"use client";

import { useState } from "react";
import { UploadingFile } from "@/app/_types/upload";
import { UPLOAD_QUEUE } from "@/app/_lib/constants";
import { fmtBytes, plural } from "@/app/_lib/upload-format";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";

interface UploadQueueProps {
  queued: UploadingFile[];
  onCancel: (id: string) => void;
}

const UploadQueue = ({ queued, onCancel }: UploadQueueProps) => {
  const [isOpen, setIsOpen] = useState(false);

  if (queued.length === 0) return null;

  const visible = isOpen ? queued : queued.slice(0, UPLOAD_QUEUE.QUEUE_PREVIEW);
  const hidden = queued.length - visible.length;
  const queuedBytes = queued.reduce((sum, f) => sum + f.file.size, 0);

  return (
    <div className="fx-rise rounded-lg border border-dashed border-outline-variant p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm text-on-surface-variant">
        <Icon icon="hourglass_empty" size="xs" />
        <span className="flex-1">
          {plural(queued.length, "file")} waiting their turn · {fmtBytes(queuedBytes)}
        </span>
      </div>

      <ul className="max-h-48 overflow-y-auto space-y-1">
        {visible.map((upload) => (
          <li
            key={upload.id}
            className="flex items-center gap-2 text-xs text-on-surface-variant pl-6"
          >
            <span className="flex-1 truncate">
              {upload.relativePath || upload.file.name}
            </span>
            <span className="tabular-nums">{fmtBytes(upload.file.size)}</span>
            <IconButton
              icon="close"
              size="xs"
              ariaLabel={`Remove ${upload.file.name} from queue`}
              onClick={() => onCancel(upload.id)}
            />
          </li>
        ))}
      </ul>

      {(hidden > 0 || isOpen) && (
        <button
          type="button"
          className="fx-press text-xs text-primary pl-6 hover:underline"
          onClick={() => setIsOpen((prev) => !prev)}
        >
          {isOpen ? "Show less" : `and ${hidden} more`}
        </button>
      )}
    </div>
  );
};

export default UploadQueue;
