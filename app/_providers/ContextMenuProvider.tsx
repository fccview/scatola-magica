"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
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
  onFileOpen?: (fileId: string) => void;
  onFileRename?: (fileId: string, fileName: string) => void;
  onFileMove?: (fileId: string) => void;
  onFileDownload?: (fileId: string) => void;
  onFileEncrypt?: (fileId: string) => void;
  onFileDecrypt?: (fileId: string) => void;
  onFileDelete?: (fileId: string) => void;
  onFolderRename?: (folderId: string, folderName: string) => void;
  onFolderDownload?: (folderId: string) => void;
  onFolderEncrypt?: (folderId: string) => void;
  onFolderDecrypt?: (folderId: string) => void;
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

const VIEWABLE_EXTENSIONS = [
  "txt",
  "md",
  "markdown",
  "html",
  "css",
  "js",
  "jsx",
  "ts",
  "tsx",
  "json",
  "xml",
  "yaml",
  "yml",
  "sh",
  "bash",
  "py",
  "java",
  "c",
  "cpp",
  "h",
  "hpp",
  "go",
  "rs",
  "php",
  "rb",
  "sql",
  "log",
  "csv",
  "config",
  "conf",
  "ini",
  "env",
  "jpg",
  "jpeg",
  "png",
  "gif",
  "svg",
  "webp",
  "bmp",
  "ico",
  "mp4",
  "webm",
  "ogg",
  "mov",
  "avi",
  "mkv",
  "pdf",
];

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
        const extension = target.name?.split(".").pop()?.toLowerCase() || "";
        const isViewable = VIEWABLE_EXTENSIONS.includes(extension);
        const isEncrypted = target.name?.endsWith(".gpg") || false;

        if (isViewable && actions.onFileOpen && target.id) {
          items.push({
            label: "Open",
            icon: "open_in_new",
            onClick: () => actions.onFileOpen!(target.id!),
          });
        }

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

        if (actions.onFileDownload && target.id) {
          items.push({
            label: "Download",
            icon: "download",
            onClick: () => actions.onFileDownload!(target.id!),
          });
        }

        if (isEncrypted && actions.onFileDecrypt && target.id) {
          if (items.length > 0) {
            items.push({
              label: "",
              icon: "",
              onClick: () => {},
              divider: true,
            });
          }
          items.push({
            label: "Decrypt",
            icon: "lock_open",
            onClick: () => actions.onFileDecrypt!(target.id!),
          });
        }

        if (!isEncrypted && actions.onFileEncrypt && target.id) {
          if (items.length > 0) {
            items.push({
              label: "",
              icon: "",
              onClick: () => {},
              divider: true,
            });
          }
          items.push({
            label: "Encrypt",
            icon: "lock",
            onClick: () => actions.onFileEncrypt!(target.id!),
          });
        }

        if (actions.onFileDelete && target.id) {
          if (items.length > 0) {
            items.push({
              label: "",
              icon: "",
              onClick: () => {},
              divider: true,
            });
          }
          items.push({
            label: "Delete",
            icon: "delete",
            onClick: () => {
              actions.onFileDelete!(target.id!);
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

        if (actions.onFolderDownload && target.id) {
          items.push({
            label: "Download Folder",
            icon: "download",
            onClick: () => actions.onFolderDownload!(target.id!),
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

        const isEncrypted = target.name?.endsWith(".folder.gpg") || false;

        if (isEncrypted && actions.onFolderDecrypt && target.id) {
          if (items.length > 0) {
            items.push({
              label: "",
              icon: "",
              onClick: () => {},
              divider: true,
            });
          }
          items.push({
            label: "Decrypt",
            icon: "lock_open",
            onClick: () => actions.onFolderDecrypt!(target.id!),
          });
        }

        if (!isEncrypted && actions.onFolderEncrypt && target.id) {
          if (items.length > 0) {
            items.push({
              label: "",
              icon: "",
              onClick: () => {},
              divider: true,
            });
          }
          items.push({
            label: "Encrypt",
            icon: "lock",
            onClick: () => actions.onFolderEncrypt!(target.id!),
          });
        }

        if (actions.onFolderDelete && target.id) {
          if (items.length > 0) {
            items.push({
              label: "",
              icon: "",
              onClick: () => {},
              divider: true,
            });
          }
          items.push({
            label: "Delete Folder",
            icon: "delete",
            onClick: () => {
              actions.onFolderDelete!(target.id!);
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
