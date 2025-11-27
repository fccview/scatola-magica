"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createFolder } from "@/app/actions/folders";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Card from "@/app/_components/GlobalComponents/Cards/Card";
import Input from "@/app/_components/GlobalComponents/Form/Input";

interface FolderCreatorProps {
  parentId?: string | null;
  onCreated?: () => void;
}

const FolderCreator = ({ parentId, onCreated }: FolderCreatorProps) => {
  const router = useRouter();
  const [showInput, setShowInput] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!folderName.trim() || creating) return;

    setCreating(true);
    const result = await createFolder(folderName.trim(), parentId);
    setCreating(false);

    if (result.success) {
      setFolderName("");
      setShowInput(false);
      router.refresh();
      onCreated?.();
    } else {
      alert(result.error || "Failed to create folder");
    }
  };

  if (!showInput) {
    return (
      <Button
        variant="outlined"
        onClick={() => setShowInput(true)}
        className="mb-4"
      >
        <span className="material-symbols-outlined">create_new_folder</span>
        New Folder
      </Button>
    );
  }

  return (
    <Card className="p-4 mb-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Folder name"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleCreate();
              } else if (e.key === "Escape") {
                setShowInput(false);
                setFolderName("");
              }
            }}
            autoFocus
            disabled={creating}
          />
        </div>
        <Button
          variant="filled"
          onClick={handleCreate}
          disabled={creating || !folderName.trim()}
        >
          {creating ? "Creating..." : "Create"}
        </Button>
        <Button
          variant="outlined"
          onClick={() => {
            setShowInput(false);
            setFolderName("");
          }}
          disabled={creating}
        >
          Cancel
        </Button>
      </div>
    </Card>
  );
};

export default FolderCreator;
