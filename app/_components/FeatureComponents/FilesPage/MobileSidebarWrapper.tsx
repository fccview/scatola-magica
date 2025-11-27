"use client";

import { useRef, useEffect } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import { useSidebar } from "@/app/_providers/SidebarProvider";

interface MobileSidebarWrapperProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export default function MobileSidebarWrapper({
  sidebar,
  children,
}: MobileSidebarWrapperProps) {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isSidebarOpen) return;
      const touch = e.touches[0];
      if (touch.clientX < 20) {
        touchStartX.current = touch.clientX;
        touchStartY.current = touch.clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartX.current || !touchStartY.current) return;
      if (isSidebarOpen) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX.current;
      const deltaY = touch.clientY - touchStartY.current;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        touchStartX.current = null;
        touchStartY.current = null;
        return;
      }

      if (deltaX > 50 && Math.abs(deltaY) < 30) {
        openSidebar();
        touchStartX.current = null;
        touchStartY.current = null;
      }
    };

    const handleTouchEnd = () => {
      touchStartX.current = null;
      touchStartY.current = null;
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [isSidebarOpen, openSidebar]);

  useEffect(() => {
    const handleSwipeClose = (e: TouchEvent) => {
      if (!isSidebarOpen || !sidebarRef.current) return;

      const touch = e.touches[0];
      const sidebarRect = sidebarRef.current.getBoundingClientRect();

      if (touch.clientX < sidebarRect.left - 50) {
        closeSidebar();
      }
    };

    if (isSidebarOpen) {
      document.addEventListener("touchmove", handleSwipeClose);
    }

    return () => {
      document.removeEventListener("touchmove", handleSwipeClose);
    };
  }, [isSidebarOpen, openSidebar]);

  return (
    <>
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 medium:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside className="w-96 bg-sidebar flex-shrink-0 hidden medium:block overflow-hidden">
        {sidebar}
      </aside>

      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-[80%] bg-sidebar z-50 transform transition-transform duration-300 medium:hidden overflow-hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold text-on-surface">Folders</h2>
            <IconButton
              icon="close"
              size="sm"
              className="text-on-surface-variant hover:text-on-surface hover:bg-transparent"
              onClick={closeSidebar}
            />
          </div>
          <div className="flex-1 overflow-hidden">{sidebar}</div>
        </div>
      </aside>

      {children}
    </>
  );
}
