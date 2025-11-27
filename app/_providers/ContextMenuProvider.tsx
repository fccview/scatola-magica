"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import ContextMenu, {
  ContextMenuItem,
} from "@/app/_components/GlobalComponents/Layout/ContextMenu";

export interface ContextMenuTarget {
  type: "file" | "folder" | "empty";
  id?: string;
  name?: string;
  data?: any;
}

interface ContextMenuActions {
  onFileRename?: (fileId: string, fileName: string) => void;
  onFileMove?: (fileId: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFolderRename?: (folderId: string, folderName: string) => void;
  onFolderDelete?: (folderId: string) => void;
  onCreateFolder?: () => void;
  onUpload?: () => void;
}

interface ContextMenuContextValue {
  showContextMenu: (
    e: React.MouseEvent,
    target: ContextMenuTarget,
    actions: ContextMenuActions
  ) => void;
  hideContextMenu: () => void;
}

const ContextMenuContext = createContext<ContextMenuContextValue | null>(null);

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error("useContextMenu must be used within ContextMenuProvider");
  }
  return context;
};

export default function ContextMenuProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [menuItems, setMenuItems] = useState<ContextMenuItem[]>([]);

  const showContextMenu = useCallback(
    (
      e: React.MouseEvent,
      target: ContextMenuTarget,
      actions: ContextMenuActions
    ) => {
      e.preventDefault();

      const items: ContextMenuItem[] = [];

      if (target.type === "file") {
        if (actions.onFileRename && target.id && target.name) {
          items.push({
            label: "Rename",
            icon: "edit",
            onClick: () => {
              const newName = prompt("Enter new name:", target.name);
              if (newName && newName.trim()) {
                actions.onFileRename!(target.id!, newName.trim());
              }
            },
          });
        }

        if (actions.onFileMove && target.id) {
          items.push({
            label: "Move",
            icon: "drive_file_move",
            onClick: () => actions.onFileMove!(target.id!),
          });
        }

        if (actions.onFileDelete && target.id) {
          if (items.length > 0) {
            items.push({ label: "", icon: "", onClick: () => {}, divider: true });
          }
          items.push({
            label: "Delete",
            icon: "delete",
            onClick: () => {
              if (confirm(`Are you sure you want to delete "${target.name}"?`)) {
                actions.onFileDelete!(target.id!);
              }
            },
            danger: true,
          });
        }
      } else if (target.type === "folder") {
        if (actions.onFolderRename && target.id && target.name) {
          items.push({
            label: "Rename Folder",
            icon: "edit",
            onClick: () => {
              const newName = prompt("Enter new folder name:", target.name);
              if (newName && newName.trim()) {
                actions.onFolderRename!(target.id!, newName.trim());
              }
            },
          });
        }

        if (actions.onCreateFolder) {
          items.push({
            label: "New Folder",
            icon: "create_new_folder",
            onClick: () => actions.onCreateFolder!(),
          });
        }

        if (actions.onUpload) {
          items.push({
            label: "Upload Files",
            icon: "upload",
            onClick: () => actions.onUpload!(),
          });
        }

        if (actions.onFolderDelete && target.id) {
          if (items.length > 0) {
            items.push({ label: "", icon: "", onClick: () => {}, divider: true });
          }
          items.push({
            label: "Delete Folder",
            icon: "delete",
            onClick: () => {
              if (
                confirm(
                  `Are you sure you want to delete the folder "${target.name}"? This will delete all contents.`
                )
              ) {
                actions.onFolderDelete!(target.id!);
              }
            },
            danger: true,
          });
        }
      } else if (target.type === "empty") {
        if (actions.onCreateFolder) {
          items.push({
            label: "New Folder",
            icon: "create_new_folder",
            onClick: () => actions.onCreateFolder!(),
          });
        }

        if (actions.onUpload) {
          items.push({
            label: "Upload Files",
            icon: "upload",
            onClick: () => actions.onUpload!(),
          });
        }
      }

      if (items.length > 0) {
        setMenuItems(items);
        setMenuPosition({ x: e.clientX, y: e.clientY });
        setMenuVisible(true);
      }
    },
    []
  );

  const hideContextMenu = useCallback(() => {
    setMenuVisible(false);
  }, []);

  return (
    <ContextMenuContext.Provider value={{ showContextMenu, hideContextMenu }}>
      {children}
      {menuVisible && (
        <ContextMenu
          items={menuItems}
          x={menuPosition.x}
          y={menuPosition.y}
          onClose={hideContextMenu}
        />
      )}
    </ContextMenuContext.Provider>
  );
}
