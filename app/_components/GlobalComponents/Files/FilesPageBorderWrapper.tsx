"use client";

import { ReactNode } from "react";
import { useUploadOverlay } from "@/app/_providers/UploadOverlayProvider";

interface FilesPageBorderWrapperProps {
  children: ReactNode;
}

const FilesPageBorderWrapper = ({ children }: FilesPageBorderWrapperProps) => {
  const { isDragging } = useUploadOverlay();

  return (
    <div
      className={`h-screen bg-surface flex flex-col overflow-hidden lg:border-[3px] border-dashed transition-all duration-300 ${
        isDragging ? "border-primary animate-pulse" : "border-outline"
      }`}
    >
      {children}
    </div>
  );
};

export default FilesPageBorderWrapper;
