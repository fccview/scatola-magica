"use client";

import { ReactNode } from "react";
import { useSidebar } from "@/app/_providers/SidebarProvider";

interface TopAppBarProps {
  title?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
}

export default function TopAppBar({
  title,
  leading,
  trailing,
}: TopAppBarProps) {
  const { isCollapsed } = useSidebar();
  
  return (
    <header className="z-50 bg-surface relative">
      <div className={`absolute left-0 top-0 bottom-0 bg-sidebar hidden lg:block transition-all duration-300 ease-in-out ${
        isCollapsed ? "w-16" : "w-64"
      }`} />

      <div className="h-16 px-4 flex items-center justify-between gap-4 relative z-10">
        <div className="flex items-center gap-4">
          {leading}

          {title && (
            <h1 className="text-xl font-medium text-on-surface truncate">
              {title}
            </h1>
          )}
        </div>

        {trailing && <div className="flex items-center gap-2">{trailing}</div>}
      </div>
    </header>
  );
}
