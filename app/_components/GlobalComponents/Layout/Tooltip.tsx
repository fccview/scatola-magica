"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { useTooltip } from "@/app/_hooks/useTooltip";
import { TooltipSide } from "@/app/_types/enums";

interface TooltipProps {
  label: string;
  children: ReactNode;
}

const SIDE_CLASSES: Record<TooltipSide, string> = {
  [TooltipSide.TOP]: "-translate-y-full",
  [TooltipSide.BOTTOM]: "",
};

const Tooltip = ({ label, children }: TooltipProps) => {
  const { anchorRef, anchor, show, hide } = useTooltip();

  return (
    <span
      ref={anchorRef}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      onClick={hide}
    >
      {children}
      {anchor &&
        createPortal(
          <span
            role="tooltip"
            className={`fx-fade pointer-events-none fixed z-[10000] -translate-x-1/2 whitespace-nowrap rounded-md bg-on-surface px-2 py-1 text-xs font-medium text-surface shadow-md ${SIDE_CLASSES[anchor.side]}`}
            style={{ left: anchor.x, top: anchor.y }}
          >
            {label}
          </span>,
          document.body
        )}
    </span>
  );
};

export default Tooltip;
