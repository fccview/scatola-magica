import { DragEvent } from "react";
import Card from "@/app/_components/GlobalComponents/Cards/Card";
import Button from "../../GlobalComponents/Buttons/Button";

interface UploadDropZoneProps {
  isDragging: boolean;
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onFileSelect: (files: FileList | null) => void;
}

export default function UploadDropZone({
  isDragging,
  onDragEnter,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileSelect,
}: UploadDropZoneProps) {
  return (
    <Card
      className={`p-8 mb-6 border-2 border-dashed transition-all ${
        isDragging
          ? "border-primary bg-primary/5"
          : "border-outline hover:border-primary/50"
      }`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="text-center">
        <span className="material-symbols-outlined text-6xl text-primary mb-4 block">
          cloud_upload
        </span>
        <h2 className="text-2xl font-medium text-on-surface mb-2">
          Drop files here
        </h2>
        <p className="text-on-surface-variant mb-6">or click to browse</p>
        <input
          type="file"
          multiple
          onChange={(e) => onFileSelect(e.target.files)}
          className="hidden"
          id="file-input"
        />
        <label htmlFor="file-input" className="inline-block cursor-pointer">
          <Button
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("file-input")?.click();
            }}
            variant="filled"
            size="md"
          >
            <span className="material-symbols-outlined">add</span>
            Select Files
          </Button>
        </label>
      </div>
    </Card>
  );
}
