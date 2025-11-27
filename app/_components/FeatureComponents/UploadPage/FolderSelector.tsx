"use client";

import { useState, useEffect } from "react";
import {
  getFolders,
  createFolder,
  type FolderMetadata,
} from "@/app/actions/folders";
import Card from "@/app/_components/GlobalComponents/Cards/Card";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Input from "@/app/_components/GlobalComponents/Form/Input";

interface FolderSelectorProps {
  selectedFolderPath?: string;
  onFolderChange: (folderPath: string) => void;
}

export default function FolderSelector({
  selectedFolderPath,
  onFolderChange,
}: FolderSelectorProps) {
  const [folders, setFolders] = useState<FolderMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  useEffect(() => {
    loadFolders();
  }, []);

  const loadFolders = async () => {
    setLoading(true);
    const result = await getFolders(null);
    if (result.success && result.data) {
      setFolders(result.data);
    }
    setLoading(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const result = await createFolder(newFolderName.trim(), null);
    if (result.success && result.data) {
      setFolders([...folders, result.data]);
      setNewFolderName("");
      setShowCreate(false);
    }
  };

  return (
    <Card className="p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-on-surface">
          Upload to folder:
        </label>
        <Button
          variant="outlined"
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
        >
          <span className="material-symbols-outlined text-base">
            {showCreate ? "close" : "create_new_folder"}
          </span>
          {showCreate ? "Cancel" : "New Folder"}
        </Button>
      </div>

      {showCreate && (
        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <Input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreateFolder();
                }
              }}
              autoFocus
            />
          </div>
          <Button variant="filled" size="sm" onClick={handleCreateFolder}>
            Create
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onFolderChange("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            selectedFolderPath === ""
              ? "bg-primary text-on-primary"
              : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80"
          }`}
        >
          Root
        </button>
        {loading ? (
          <span className="text-on-surface-variant text-sm">Loading...</span>
        ) : (
          folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => onFolderChange(folder.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedFolderPath === folder.id
                  ? "bg-primary text-on-primary"
                  : "bg-surface-variant text-on-surface-variant hover:bg-surface-variant/80"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                folder
              </span>
              {folder.name}
            </button>
          ))
        )}
      </div>
    </Card>
  );
}
