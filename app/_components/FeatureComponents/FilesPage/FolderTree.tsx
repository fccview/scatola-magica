"use client";

import { usePathname } from "next/navigation";
import FolderTree from "@/app/_components/GlobalComponents/Folders/FolderTree";

export default function FolderTreeSidebar() {
  const pathname = usePathname();
  const currentFolderId = pathname.startsWith("/files/")
    ? decodeURIComponent(pathname.slice(7))
    : null;

  return (
    <FolderTree
      currentFolderId={currentFolderId}
      variant="sidebar"
      showSearch={false}
      showCreate={true}
    />
  );
}
