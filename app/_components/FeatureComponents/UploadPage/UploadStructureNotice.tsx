import { UploadStructure } from "@/app/_types/upload";
import { plural } from "@/app/_lib/upload-format";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";

interface UploadStructureNoticeProps {
  structure: UploadStructure;
  onDismiss?: () => void;
}

const UploadStructureNotice = ({ structure, onDismiss }: UploadStructureNoticeProps) => {
  const { created, total, fileCount, error } = structure;
  const percent = total > 0 ? (created / total) * 100 : 0;

  return (
    <div className="fx-rise bg-surface-container rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-3">
        <span
          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
            error ? "bg-error/10 text-error" : "bg-primary/10 text-primary"
          }`}
        >
          <Icon icon={error ? "error" : "create_new_folder"} size="xs" className={error ? "" : "fx-blink"} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-on-surface">
            {error ? "Couldn't build the folder structure" : "Building the folder structure"}
          </p>
          <p className={`text-xs mt-0.5 ${error ? "text-error" : "text-on-surface-variant"}`}>
            {error ||
              `${created} of ${plural(total, "folder")} ready · ${plural(fileCount, "file")} lined up behind it`}
          </p>
        </div>
        {error && onDismiss && (
          <IconButton icon="close" size="sm" ariaLabel="Dismiss" onClick={onDismiss} />
        )}
      </div>
      {!error && <Progress value={percent} size="sm" shimmer />}
    </div>
  );
};

export default UploadStructureNotice;
