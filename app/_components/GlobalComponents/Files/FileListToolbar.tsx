import { FileViewMode } from "@/app/_types/enums";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface FileListToolbarProps {
  filesCount: number;
  foldersCount: number;
  isRecursive: boolean;
  viewMode: FileViewMode;
  isSelectionMode: boolean;
  onToggleRecursive: () => void;
  onEnterSelectionMode: () => void;
  onSelectAll: () => void;
  onViewModeChange: (mode: FileViewMode) => void;
}

export default function FileListToolbar({
  filesCount,
  foldersCount,
  isRecursive,
  viewMode,
  isSelectionMode,
  onToggleRecursive,
  onEnterSelectionMode,
  onSelectAll,
  onViewModeChange,
}: FileListToolbarProps) {
  return (
    <div className="flex items-center justify-between mb-4 flex-shrink-0 p-2">
      <p className="text-sm text-on-surface-variant">
        {filesCount} file{filesCount !== 1 ? "s" : ""}
        {!isRecursive && foldersCount > 0 && (
          <>
            {" "}
            • {foldersCount} folder{foldersCount !== 1 ? "s" : ""}
          </>
        )}
      </p>

      <div className="flex items-center gap-2">
        {filesCount > 0 && !isSelectionMode && (
          <button
            onClick={onEnterSelectionMode}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm"
          >
            <Icon icon="checklist" size="sm" />
            Select
          </button>
        )}
        {isSelectionMode && filesCount > 0 && (
          <button
            onClick={onSelectAll}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high transition-colors text-sm"
          >
            <Icon icon="select_all" size="sm" />
            Select All
          </button>
        )}
        <IconButton
          icon={isRecursive ? "folder_open" : "source"}
          onClick={onToggleRecursive}
          className={isRecursive ? "bg-primary text-on-primary" : ""}
          title={
            isRecursive
              ? "Normal view (folders + direct files)"
              : "Recursive view (all files from subfolders)"
          }
        />
        <IconButton
          icon="grid_view"
          onClick={() => onViewModeChange(FileViewMode.GRID)}
          className={
            viewMode === FileViewMode.GRID ? "bg-primary text-on-primary" : ""
          }
          title="Grid view"
        />
        <IconButton
          icon="list"
          onClick={() => onViewModeChange(FileViewMode.LIST)}
          className={
            viewMode === FileViewMode.LIST ? "bg-primary text-on-primary" : ""
          }
          title="List view"
        />
      </div>
    </div>
  );
}
