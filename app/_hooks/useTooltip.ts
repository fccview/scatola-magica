"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOOLTIP } from "@/app/_lib/constants";
import { TooltipSide } from "@/app/_types/enums";

export interface TooltipAnchor {
  x: number;
  y: number;
  side: TooltipSide;
}

export const useTooltip = () => {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<TooltipAnchor | null>(null);

  const show = useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;

    const fitsAbove = rect.top > TOOLTIP.FLIP_ZONE_PX;

    setAnchor({
      x: rect.left + rect.width / 2,
      y: fitsAbove ? rect.top - TOOLTIP.GAP_PX : rect.bottom + TOOLTIP.GAP_PX,
      side: fitsAbove ? TooltipSide.TOP : TooltipSide.BOTTOM,
    });
  }, []);

  const hide = useCallback(() => setAnchor(null), []);

  useEffect(() => {
    if (!anchor) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hide();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", hide, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", hide, true);
    };
  }, [anchor, hide]);

  return { anchorRef, anchor, show, hide };
};
