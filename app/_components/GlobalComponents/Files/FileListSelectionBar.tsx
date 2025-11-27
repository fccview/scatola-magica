import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";

interface FileListSelectionBarProps {
  totalSelected: number;
  totalItems: number;
  onClear: () => void;
  onDelete: () => void;
  onMove: () => void;
  onSelectAll: () => void;
}

export default function FileListSelectionBar({
  totalSelected,
  totalItems,
  onClear,
  onDelete,
  onMove,
  onSelectAll,
}: FileListSelectionBarProps) {
  const allSelected = totalSelected === totalItems && totalItems > 0;

  return (
    <div className="flex items-center justify-between mb-4 p-4 border-2 border-outline-variant border-dashed rounded-lg flex-shrink-0">
      <div className="flex items-center gap-4">
        <IconButton
          icon="close"
          onClick={onClear}
          title="Exit selection mode"
          className="bg-surface text-on-surface"
        />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Icon icon="checklist" size="md" className="text-primary" />
          </div>
          <p className="text-sm text-on-primary-container/80">
            {totalSelected} of {totalItems} selected
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {!allSelected && (
          <Button
            variant="outlined"
            size="sm"
            onClick={onSelectAll}
            className="border-primary-container text-on-primary-container hover:bg-primary-container/20"
          >
            <Icon icon="select_all" size="sm" />
            Select All
          </Button>
        )}
        <Button
          variant="filled"
          size="sm"
          onClick={onMove}
          disabled={totalSelected === 0}
        >
          <Icon icon="drive_file_move" size="sm" />
          Move
        </Button>
        <Button
          variant="filled"
          size="sm"
          onClick={onDelete}
          disabled={totalSelected === 0}
          className="!bg-error !text-on-error hover:!bg-error/90"
        >
          <Icon icon="delete" size="sm" />
          Delete
        </Button>
      </div>
    </div>
  );
}
