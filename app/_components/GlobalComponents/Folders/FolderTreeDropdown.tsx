"use client";

import { useFolderTree } from "@/app/_hooks/useFolderTree";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import FolderTreeNode from "@/app/_components/GlobalComponents/Folders/FolderTreeNode";

interface FolderTreeDropdownProps {
  folderTreeHook?: ReturnType<typeof useFolderTree>;
  selectedFolderId?: string | null;
  onFolderSelect?: (folderId: string | null) => void;
  maxHeight?: string;
}

export default function FolderTreeDropdown({
  folderTreeHook: providedHook,
  selectedFolderId,
  onFolderSelect,
  maxHeight,
}: FolderTreeDropdownProps) {
  const folderTreeHook =
    providedHook ||
    useFolderTree({
      currentFolderId: null,
      onFolderSelect: onFolderSelect || (() => {}),
      variant: "dropdown",
    });

  const { filteredTree, isExpanded, isActive, toggleFolder, currentFolderId } =
    folderTreeHook;

  return (
    <div className={`overflow-y-auto ${maxHeight || "max-h-80"}`}>
      <div className="space-y-1">
        <button
          onClick={() => onFolderSelect?.(null)}
          className={`w-full text-left px-3 py-2.5 text-sm mb-1 flex items-center gap-2 rounded-lg transition-colors ${
            selectedFolderId === null || selectedFolderId === ""
              ? "bg-sidebar-active text-on-surface font-medium"
              : "text-on-surface hover:bg-surface-variant/30"
          }`}
        >
          <Icon icon="home" size="sm" />
          <span>Root</span>
        </button>

        {filteredTree.map((folder: any) => (
          <FolderTreeNode
            key={folder.id}
            folder={folder}
            level={0}
            folderTreeHook={folderTreeHook}
            variant="dropdown"
            onFolderSelect={onFolderSelect}
          />
        ))}
      </div>
    </div>
  );
}
