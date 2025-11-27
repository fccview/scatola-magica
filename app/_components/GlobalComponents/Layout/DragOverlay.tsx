"use client";

import { usePathname } from "next/navigation";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";

interface DragOverlayProps {
  isVisible: boolean;
  targetFolderName?: string | null;
}

export default function DragOverlay({ isVisible }: DragOverlayProps) {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  if (!isVisible) return null;

  if (isHomePage) return null;

  return (
    <div className="fixed w-[calc(100vw-10px)] h-[calc(100vh-10px)] top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] z-[100] pointer-events-none transition-all duration-300 flex items-center justify-center backdrop-blur-[1.5px]">
      <Logo
        className="w-48 h-48 md:w-64 md:h-64 loading-animation"
        hideBox={false}
      />
    </div>
  );
}
