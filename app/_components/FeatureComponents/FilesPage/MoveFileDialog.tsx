"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { moveFile } from "@/app/actions/files";
import Card from "@/app/_components/GlobalComponents/Cards/Card";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import FolderTreeSelector from "@/app/_components/FeatureComponents/UploadPage/FolderTreeSelector";

interface MoveFileDialogProps {
  fileIds: string[];
  currentFolderId?: string | null;
  onClose: () => void;
}

const MoveFileDialog = ({
  fileIds,
  currentFolderId,
  onClose,
}: MoveFileDialogProps) => {
  const router = useRouter();
  const [selectedFolderPath, setSelectedFolderPath] = useState<string>(
    currentFolderId || ""
  );
  const [moving, setMoving] = useState(false);

  const handleMove = async () => {
    if (moving) return;

    setMoving(true);
    try {
      const results = await Promise.all(
        fileIds.map((fileId) => moveFile(fileId, selectedFolderPath))
      );

      const failed = results.filter((r) => !r.success);
      if (failed.length > 0) {
        alert(
          `Failed to move ${failed.length} file${
            failed.length !== 1 ? "s" : ""
          }`
        );
      }

      router.refresh();
      onClose();
    } catch (error) {
      console.error("Move failed:", error);
      alert("Failed to move files");
    } finally {
      setMoving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-on-surface">
            Move {fileIds.length} File{fileIds.length !== 1 ? "s" : ""}
          </h2>
          <IconButton icon="close" onClick={onClose} />
        </div>

        <div className="mb-6">
          <FolderTreeSelector
            selectedFolderId={selectedFolderPath}
            onFolderChange={setSelectedFolderPath}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outlined" onClick={onClose} disabled={moving}>
            Cancel
          </Button>
          <Button variant="filled" onClick={handleMove} disabled={moving}>
            {moving ? "Moving..." : "Move"}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default MoveFileDialog;
