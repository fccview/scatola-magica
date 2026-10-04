"use client";

import { useRef, useEffect } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import BrandLink from "@/app/_components/GlobalComponents/Layout/BrandLink";
import SidebarResizeHandle from "@/app/_components/GlobalComponents/Layout/SidebarResizeHandle";
import { useSidebar } from "@/app/_providers/SidebarProvider";

interface MobileSidebarWrapperProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  title?: string;
  header?: React.ReactNode;
}

export default function MobileSidebarWrapper({
  sidebar,
  children,
  title = "Folders",
  header,
}: MobileSidebarWrapperProps) {
  const { isSidebarOpen, openSidebar, closeSidebar } = useSidebar();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const desktopRef = useRef<HTMLElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (isSidebarOpen) return;
      const touch = e.touches[0];
      const screenWidth = window.innerWidth;
      if (touch.clientX < screenWidth * 0.3) {
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

    document.addEventListener("touchstart", handleTouchStart, {
      passive: true,
    });
    document.addEventListener("touchmove", handleTouchMove, { passive: true });
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
          className="fx-fade fixed inset-0 bg-black/50 z-50 medium:hidden"
          onClick={closeSidebar}
        />
      )}

      <aside
        ref={desktopRef}
        className={`relative w-[var(--sidebar-width,24rem)] bg-sidebar flex-shrink-0 hidden overflow-hidden ${
          header ? "medium:flex flex-col" : "medium:block"
        }`}
      >
        {header ? (
          <>
            <div className="relative z-10 h-16 px-4 flex items-center flex-shrink-0">
              <BrandLink />
            </div>
            <div className="flex-1 min-h-0">{sidebar}</div>
          </>
        ) : (
          sidebar
        )}
        <SidebarResizeHandle targetRef={desktopRef} />
      </aside>

      <aside
        ref={sidebarRef}
        className={`fixed inset-y-0 left-0 w-[80%] bg-sidebar z-50 transform transition-transform duration-300 medium:hidden overflow-hidden ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h2 className="text-lg font-semibold text-on-surface">{title}</h2>
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

      {header ? (
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-shrink-0">{header}</div>
          <div className="flex flex-1 overflow-hidden min-h-0">{children}</div>
        </div>
      ) : (
        children
      )}
    </>
  );
}
