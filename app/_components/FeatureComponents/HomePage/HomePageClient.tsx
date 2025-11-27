"use client";

import { ReactNode } from "react";
import { useUploadOverlay } from "@/app/_providers/UploadOverlayProvider";
import ThemeToggle from "@/app/_components/GlobalComponents/Layout/ThemeToggle";

interface HomePageClientProps {
  children: ReactNode;
  userMenu?: ReactNode;
}

const HomePageClient = ({ children, userMenu }: HomePageClientProps) => {
  const { isDragging } = useUploadOverlay();

  return (
    <div
      className={`h-screen overflow-hidden transition-all duration-300 border-[3px] border-dashed ${
        isDragging ? "border-primary animate-pulse" : "border-outline"
      }`}
    >
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        {userMenu}
      </div>
      {children}
    </div>
  );
};

export default HomePageClient;
