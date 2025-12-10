"use client";

import { useFolders } from "@/app/_providers/FoldersProvider";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";

interface FilesPageWrapperProps {
  children: React.ReactNode;
  folderPath: string | null;
}

export default function FilesPageWrapper({
  children,
  folderPath,
}: FilesPageWrapperProps) {
  const { loading } = useFolders();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-surface">
        <div className="flex flex-col items-center gap-4">
          <Logo className="w-80 h-80" hoverEffect={true} />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
