"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useFolderTree,
  type FolderWithChildren,
} from "@/app/_hooks/useFolderTree";
import DropdownMenu from "@/app/_components/GlobalComponents/Form/DropdownMenu";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import UserAvatar from "@/app/_components/FeatureComponents/User/UserAvatar";
import { useContextMenu } from "@/app/_providers/ContextMenuProvider";
import { updateFolder } from "@/app/actions/folders";

interface FolderTreeNodeProps {
  folder: FolderWithChildren;
  level: number;
  folderTreeHook: ReturnType<typeof useFolderTree>;
  variant: "sidebar" | "dropdown";
  onFolderSelect?: (folderId: string | null) => void;
}

export default function FolderTreeNode({
  folder,
  level,
  folderTreeHook,
  variant,
  onFolderSelect,
}: FolderTreeNodeProps) {
  const {
    creatingInFolder,
    newFolderName,
    setNewFolderName,
    renamingFolder,
    renameFolderName,
    setRenameFolderName,
    isExpanded,
    isActive,
    toggleFolder,
    expandFolder,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    startCreatingInFolder,
    cancelCreate,
    startRenaming,
    cancelRename,
    allUsers,
  } = folderTreeHook;

  const { showContextMenu } = useContextMenu();
  const router = useRouter();

  const hasChildren = (folder.children?.length || 0) > 0;
  const isCreating = creatingInFolder === folder.id;
  const isRenaming = renamingFolder === folder.id;
  const folderIsExpanded = isExpanded(folder.id);
  const folderIsActive = isActive(folder.id);

  const indentStyle = level > 0 ? { paddingLeft: `${level * 16 + 12}px` } : {};

  const handleContextMenuEvent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    showContextMenu(
      e,
      {
        type: "folder",
        id: folder.id,
        name: folder.name,
      },
      {
        onFolderRename: async (id: string, newName: string) => {
          const result = await updateFolder(id, newName);
          if (result.success) {
            router.refresh();
          } else {
            alert(result.error || "Failed to rename folder");
          }
        },
        onFolderDelete: (id: string) => handleDeleteFolder(id, folder.name),
        onCreateFolder: () => startCreatingInFolder(folder.id),
      }
    );
  };

  if (variant === "dropdown") {
    return (
      <div className="select-none">
        <button
          onClick={() => onFolderSelect?.(folder.id)}
          className={`w-full text-left px-2.5 py-1.5 rounded text-sm mb-0.5 flex items-center gap-2 transition-colors min-w-0 ${
            folderIsActive
              ? "bg-primary/10 text-primary"
              : "hover:bg-surface-variant/30 text-on-surface"
          }`}
          style={indentStyle}
        >
          {hasChildren && (
            <Icon
              icon={folderIsExpanded ? "expand_more" : "chevron_right"}
              size="xs"
              className="flex-shrink-0 text-on-surface-variant"
              onClick={(e) => {
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
            />
          )}
          {(() => {
            let folderUser = null;
            const userSpecificMatch = folder.id.match(/^([^\/]+)\//);
            if (userSpecificMatch) {
              folderUser = allUsers.find(
                (u) => u.username === userSpecificMatch[1]
              );
            } else {
              folderUser = allUsers.find((u) => u.username === folder.name);
            }

            if (folderUser) {
              return (
                <UserAvatar
                  user={folderUser}
                  size="sm"
                  className="flex-shrink-0"
                />
              );
            }

            return <Icon icon="folder" size="sm" className="flex-shrink-0" />;
          })()}
          <span className="text-xs flex-1 truncate min-w-0">{folder.name}</span>
        </button>

        {folderIsExpanded && folder.children && folder.children.length > 0 && (
          <div className="mt-0.5">
            {folder.children.map((child) => (
              <FolderTreeNode
                key={child.id}
                folder={child}
                level={level + 1}
                folderTreeHook={folderTreeHook}
                variant={variant}
                onFolderSelect={onFolderSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="relative group">
        <Link
          href={`/files/${folder.id
            .split("/")
            .map(encodeURIComponent)
            .join("/")}`}
          data-folder-id={folder.id}
          className="block"
          onClick={(e) => {
            if (hasChildren && !folderIsExpanded) {
              toggleFolder(folder.id);
            }
          }}
        >
          <div
            className={`flex items-center gap-2 pl-3 py-2 rounded-lg mb-1 transition-colors cursor-pointer ${
              folderIsActive
                ? "bg-sidebar-active text-on-surface"
                : "text-on-surface hover:bg-surface-variant/20"
            }`}
            style={indentStyle}
            onContextMenu={handleContextMenuEvent}
          >
            <Icon
              icon={
                folderIsExpanded && hasChildren
                  ? "expand_more"
                  : "chevron_right"
              }
              size="xs"
              className={`flex-shrink-0 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer ${
                !hasChildren ? "opacity-0" : ""
              }`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFolder(folder.id);
              }}
            />

            {(() => {
              let folderUser = null;
              const userSpecificMatch = folder.id.match(/^([^\/]+)\//);
              if (userSpecificMatch) {
                folderUser = allUsers.find(
                  (u) => u.username === userSpecificMatch[1]
                );
              } else {
                folderUser = allUsers.find((u) => u.username === folder.name);
              }

              if (folderUser) {
                return (
                  <UserAvatar
                    user={folderUser}
                    size="sm"
                    className="flex-shrink-0"
                  />
                );
              }

              return (
                <Icon
                  icon="folder"
                  size="sm"
                  className={`flex-shrink-0 ${
                    folderIsActive
                      ? "text-on-surface"
                      : "text-on-surface-variant"
                  }`}
                />
              );
            })()}

            <span
              className={`text-sm flex-1 truncate ${
                folderIsActive
                  ? "text-on-surface font-medium"
                  : "text-on-surface"
              }`}
            >
              {folder.name}

              {(folder.fileCount || 0) > 0 && (
                <span
                  className={`px-2 py-0.5 text-xs rounded-full font-normal ${
                    folderIsActive
                      ? "bg-surface-variant/60 text-on-surface"
                      : "bg-surface-variant/30 text-on-surface-variant"
                  }`}
                >
                  ({folder.fileCount})
                </span>
              )}
            </span>

            <div className="flex-shrink-0 transition-opacity opacity-30 group-hover:opacity-100">
              <DropdownMenu
                items={[
                  {
                    label: "Add subfolder",
                    icon: "add",
                    onClick: () => startCreatingInFolder(folder.id),
                  },
                  {
                    label: "Rename",
                    icon: "edit",
                    onClick: () => startRenaming(folder.id, folder.name),
                  },
                  {
                    label: "Delete",
                    icon: "delete",
                    onClick: () => handleDeleteFolder(folder.id, folder.name),
                    variant: "danger",
                  },
                ]}
              />
            </div>
          </div>
        </Link>
      </div>

      {isCreating && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={
            level > 0
              ? { paddingLeft: `${level * 16 + 24}px` }
              : { paddingLeft: "24px" }
          }
        >
          <Icon
            icon="subdirectory_arrow_right"
            size="xs"
            className="text-on-surface-variant flex-shrink-0"
          />
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder name..."
            className="flex-1 px-3 py-1.5 text-sm bg-surface-container border border-outline-variant/30 rounded-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateFolder();
              else if (e.key === "Escape") cancelCreate();
            }}
            autoFocus
          />
          <button
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
            className="px-2 py-1 text-xs rounded bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Icon icon="check" size="xs" />
          </button>
          <button
            onClick={cancelCreate}
            className="px-2 py-1 text-xs rounded hover:bg-surface-variant/50"
          >
            <Icon icon="close" size="xs" />
          </button>
        </div>
      )}

      {isRenaming && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={
            level > 0
              ? { paddingLeft: `${level * 16 + 24}px` }
              : { paddingLeft: "24px" }
          }
        >
          <Icon icon="edit" size="xs" className="text-primary flex-shrink-0" />
          <input
            type="text"
            value={renameFolderName}
            onChange={(e) => setRenameFolderName(e.target.value)}
            placeholder="New folder name..."
            className="flex-1 px-3 py-1.5 text-sm bg-surface-container border border-primary/30 rounded-md text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameFolder();
              else if (e.key === "Escape") cancelRename();
            }}
            autoFocus
          />
          <button
            onClick={handleRenameFolder}
            disabled={!renameFolderName.trim()}
            className="px-2 py-1 text-xs rounded bg-primary text-on-primary hover:bg-primary/90 disabled:opacity-50"
          >
            <Icon icon="check" size="xs" />
          </button>
          <button
            onClick={cancelRename}
            className="px-2 py-1 text-xs rounded hover:bg-surface-variant/50"
          >
            <Icon icon="close" size="xs" />
          </button>
        </div>
      )}

      {folderIsExpanded && folder.children && folder.children.length > 0 && (
        <div className="mt-1">
          {folder.children.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              level={level + 1}
              folderTreeHook={folderTreeHook}
              variant={variant}
              onFolderSelect={onFolderSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
