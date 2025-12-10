"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { FileMetadata, User } from "@/app/_types";
import { formatBytes } from "@/app/_lib/file-utils";
import { FolderMetadata } from "@/app/_server/actions/folders";
import ItemActionsMenu from "@/app/_components/FeatureComponents/FilesPage/ItemActionsMenu";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import { getFileIconInfo } from "@/app/_lib/file-icons";
import FileIconComponent from "@/app/_components/GlobalComponents/Icons/BrandIcon";
import UserAvatar from "@/app/_components/FeatureComponents/User/UserAvatar";
import { useContextMenu } from "@/app/_providers/ContextMenuProvider";
import { usePathEncryption } from "@/app/_hooks/usePathEncryption";

interface ListCardProps {
  file?: FileMetadata;
  folder?: FolderMetadata;
  onDelete?: (id: string) => void;
  onDownload?: (id: string) => void;
  onMove?: (id: string) => void;
  onRename?: (id: string, newName: string) => void;
  onOpen?: (id: string) => void;
  onEncrypt?: (id: string) => void;
  onDecrypt?: (id: string) => void;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  currentUser?: User;
  allUsers?: User[];
  recursive?: boolean;
}

export default function ListCard({
  file,
  folder,
  onDelete,
  onDownload,
  onMove,
  onRename,
  onOpen,
  onEncrypt,
  onDecrypt,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelect,
  currentUser,
  allUsers = [],
  recursive = false,
}: ListCardProps) {
  const { showContextMenu } = useContextMenu();
  const { encryptPath } = usePathEncryption();
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const isFolder = !!folder;
  const item = (folder || file)!;
  const itemId = item.id;
  const itemName = isFolder
    ? (item as FolderMetadata).name
    : (item as FileMetadata).originalName;

  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (isRenaming) {
      setRenameValue(itemName);
    }
  }, [isRenaming, itemName]);

  const handleRenameStart = () => {
    setIsRenaming(true);
  };

  const handleRenameSave = () => {
    if (renameValue.trim() && renameValue.trim() !== itemName) {
      onRename?.(itemId, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSave();
    } else if (e.key === "Escape") {
      setIsRenaming(false);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSelectionMode) return;

    showContextMenu(
      e,
      {
        type: isFolder ? "folder" : "file",
        id: itemId,
        name: itemName,
      },
      {
        onFileOpen: isFolder ? undefined : onOpen,
        onFileRename: isFolder ? undefined : onRename ? handleRenameStart : undefined,
        onFileMove: isFolder ? undefined : onMove,
        onFileDownload: isFolder ? undefined : onDownload,
        onFileEncrypt: isFolder ? undefined : onEncrypt,
        onFileDecrypt: isFolder ? undefined : onDecrypt,
        onFileDelete: isFolder ? undefined : onDelete,
        onFolderRename: isFolder && onRename ? handleRenameStart : undefined,
        onFolderDownload: isFolder ? onDownload : undefined,
        onFolderEncrypt: isFolder ? onEncrypt : undefined,
        onFolderDecrypt: isFolder ? onDecrypt : undefined,
        onFolderDelete: isFolder ? onDelete : undefined,
      }
    );
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (isSelectionMode || isRenaming) return;

    if (!isFolder && onOpen) {
      e.preventDefault();
      e.stopPropagation();
      onOpen(itemId);
    }
  };

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
      }
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString();
  };

  const renderItemIcon = () => {
    if (isFolder) {
      const folderData = item as FolderMetadata;
      let folderUser = null;

      const userSpecificMatch = itemId.match(/^([^\/]+)\//);
      if (userSpecificMatch) {
        folderUser = allUsers.find((u) => u.username === userSpecificMatch[1]);
      } else {
        const folderName = folderData.name;
        folderUser = allUsers.find((u) => u.username === folderName);
        if (!folderUser && currentUser && !currentUser.isAdmin) {
          if (itemId === "" && folderName === currentUser.username) {
            folderUser = currentUser;
          }
        }
      }

      if (folderUser) {
        return (
          <UserAvatar user={folderUser} size="md" className="flex-shrink-0" />
        );
      }

      const hasItems =
        (folderData.fileCount || 0) + (folderData.folderCount || 0) > 0;
      return (
        <Icon
          icon={hasItems ? "folder_open" : "folder"}
          size="md"
          className="flex-shrink-0"
        />
      );
    }

    const iconInfo = getFileIconInfo((item as FileMetadata).originalName);
    return iconInfo.extension ? (
      <FileIconComponent
        extension={iconInfo.extension}
        size="md"
        className="flex-shrink-0"
      />
    ) : (
      <Icon
        icon={iconInfo.materialIcon}
        size="md"
        className="text-on-surface-variant flex-shrink-0"
      />
    );
  };

  const renderItemSize = () => {
    if (isFolder) {
      const folder = item as FolderMetadata;
      const total = (folder.fileCount || 0) + (folder.folderCount || 0);
      return `${total} item${total !== 1 ? "s" : ""}`;
    }
    return formatBytes((item as FileMetadata).size);
  };

  const renderItemName = () => {
    if (recursive) {
      const fullPath = isFolder ? itemId : file?.folderPath || "";
      const fileName = itemName;

      if (!fullPath) {
        return (
          <span className="text-base font-normal text-on-surface">
            {fileName}
          </span>
        );
      }

      const pathParts = fullPath.split("/");
      const elements: React.JSX.Element[] = [];

      pathParts.forEach((part, index) => {
        if (part) {
          const pathToHere = pathParts.slice(0, index + 1).join("/");
          const encryptedPath = encryptPath(pathToHere);
          elements.push(
            <Link
              key={`folder-${index}`}
              href={`/files/${encryptedPath
                .split("/")
                .map(encodeURIComponent)
                .join("/")}`}
              className="text-base font-normal text-on-surface-variant hover:text-primary hover:underline break-all"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
          elements.push(
            <span
              key={`separator-${index}`}
              className="text-on-surface-variant"
            >
              /
            </span>
          );
        }
      });

      elements.push(
        <span
          key="filename"
          className="text-base font-normal text-on-surface break-all"
        >
          {fileName}
        </span>
      );

      return <div className="break-all">{elements}</div>;
    }

    if (isFolder && !isSelectionMode) {
      const encryptedPath = encryptPath(itemId);
      return (
        <Link
          href={`/files/${encryptedPath
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`}
          className="hover:underline text-base font-normal text-on-surface break-all"
        >
          {itemName}
        </Link>
      );
    }

    return (
      <div className="flex flex-col">
        {!isFolder && file?.folderPath && (
          <span className="text-on-surface-variant/60 font-normal text-sm">
            {file.folderPath}/
          </span>
        )}
        <span className="text-base font-normal text-on-surface break-all">
          {itemName}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`group flex items-center gap-4 pl-4 pr-12 py-3 rounded-lg hover:bg-surface-container transition-colors ${
        isSelectionMode ? "cursor-pointer" : ""
      } ${isSelected ? "bg-primary/10 hover:bg-primary/15" : ""}`}
      onClick={isSelectionMode ? onToggleSelect : undefined}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {isSelectionMode && (
        <div
          className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
            isSelected
              ? "bg-primary border-primary"
              : "bg-transparent border-outline"
          }`}
        >
          {isSelected && (
            <Icon icon="check" size="xs" className="text-on-primary" />
          )}
        </div>
      )}

      {renderItemIcon()}

      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            ref={renameInputRef}
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={handleRenameKeyDown}
            onBlur={handleRenameSave}
            className="text-sm font-normal text-on-surface bg-surface-container px-2 py-1 rounded outline-none focus:ring-2 focus:ring-primary w-full"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          renderItemName()
        )}
      </div>

      <div className="flex items-center gap-4 medium:gap-8 text-sm text-on-surface-variant flex-shrink-0">
        <span className="w-16 medium:w-20 text-right flex-shrink-0">
          {renderItemSize()}
        </span>
        <span className="hidden medium:block w-32 text-right flex-shrink-0">
          {formatDate(
            isFolder
              ? (item as FolderMetadata).createdAt
              : (item as FileMetadata).uploadedAt
          )}
        </span>
      </div>

      {!isSelectionMode && (
        <div className="absolute right-2">
          <ItemActionsMenu
            onOpen={onOpen ? () => onOpen(itemId) : undefined}
            onRename={onRename ? handleRenameStart : undefined}
            onMove={onMove ? () => onMove(itemId) : undefined}
            onDownload={onDownload ? () => onDownload(itemId) : undefined}
            onDelete={onDelete ? () => onDelete(itemId) : undefined}
            onEncrypt={
              isFolder
                ? onEncrypt
                  ? () => onEncrypt(itemId)
                  : undefined
                : onEncrypt
                ? () => onEncrypt(itemId)
                : undefined
            }
            onDecrypt={
              isFolder
                ? onDecrypt
                  ? () => onDecrypt(itemId)
                  : undefined
                : onDecrypt
                ? () => onDecrypt(itemId)
                : undefined
            }
            fileName={itemName}
          />
        </div>
      )}
    </div>
  );
}
