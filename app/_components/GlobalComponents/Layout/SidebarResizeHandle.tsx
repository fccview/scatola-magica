"use client";

import { RefObject } from "react";
import { SIDEBAR_WIDTH } from "@/app/_lib/constants";
import { useSidebarResize } from "@/app/_hooks/useSidebarResize";

interface SidebarResizeHandleProps {
  targetRef: RefObject<HTMLElement | null>;
}

const SidebarResizeHandle = ({ targetRef }: SidebarResizeHandleProps) => {
  const { width, isResizing, handlers } = useSidebarResize(targetRef);

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuemin={SIDEBAR_WIDTH.MIN}
      aria-valuemax={SIDEBAR_WIDTH.MAX}
      aria-valuenow={width}
      tabIndex={0}
      title="Drag to resize, double click to reset"
      className="group absolute top-0 right-0 h-full w-2 cursor-col-resize touch-none z-10 focus:outline-none"
      {...handlers}
    >
      <span
        className={`fx-handle absolute inset-y-0 right-0 w-0.5 rounded-full bg-primary transition-opacity ${
          isResizing
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-60 group-focus-visible:opacity-100"
        }`}
      />
    </div>
  );
};

export default SidebarResizeHandle;
