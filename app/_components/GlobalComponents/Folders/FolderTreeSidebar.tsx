"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useFolderTree } from "@/app/_hooks/useFolderTree";
import { usePathEncryption } from "@/app/_hooks/usePathEncryption";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import FolderTreeNode from "@/app/_components/GlobalComponents/Folders/FolderTreeNode";

interface FolderTreeSidebarProps {
  folderTreeHook?: ReturnType<typeof useFolderTree>;
  showSearch?: boolean;
  showCreate?: boolean;
  isCollapsed?: boolean;
}

export default function FolderTreeSidebar({
  folderTreeHook: providedHook,
  showSearch = false,
  showCreate = true,
  isCollapsed = false,
}: FolderTreeSidebarProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const pathname = usePathname();
  const { decryptPath } = usePathEncryption();

  useEffect(() => {
    if (pathname.startsWith("/files/")) {
      const encodedPath = pathname.slice(7);
      if (encodedPath) {
        const segments = encodedPath.split("/").map(decodeURIComponent);
        const joinedPath = segments.join("/");
        const decryptedPath = decryptPath(joinedPath);
        setCurrentFolderId(decryptedPath || null);
      } else {
        setCurrentFolderId(null);
      }
    } else {
      setCurrentFolderId(null);
    }
  }, [pathname, decryptPath]);

  const folderTreeHook =
    providedHook ||
    useFolderTree({
      currentFolderId,
      onFolderSelect: () => {},
      variant: "sidebar",
    });

  const { filteredTree, searchQuery, setSearchQuery } = folderTreeHook;

  return (
    <div className="h-full flex flex-col bg-sidebar">
      {showSearch && !isCollapsed && (
        <div className="px-3 py-2 border-b border-outline-variant/20">
          <div className="relative">
            <Icon
              icon="search"
              size="sm"
              className="absolute left-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search folders..."
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            />
          </div>
        </div>
      )}

      <div className={`flex-1 overflow-y-auto overflow-x-hidden pb-2 pt-4 min-w-0 ${
        isCollapsed ? "px-1" : "px-2"
      }`}>
        <div className="space-y-1">
          <FolderTreeNode
            key="root"
            folder={{
              id: "",
              name: "./",
              parentId: null,
              createdAt: 0,
              updatedAt: 0,
              children: [],
            }}
            level={0}
            folderTreeHook={folderTreeHook}
            variant="sidebar"
            isCollapsed={isCollapsed}
          />

          {filteredTree.map((folder: any) => (
            <FolderTreeNode
              key={folder.id}
              folder={folder}
              level={0}
              folderTreeHook={folderTreeHook}
              variant="sidebar"
              isCollapsed={isCollapsed}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
