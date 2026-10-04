import {
  KeyboardEvent,
  PointerEvent,
  RefObject,
  useRef,
  useState,
} from "react";
import { SIDEBAR_WIDTH } from "@/app/_lib/constants";
import { clampWidth, storeWidth } from "@/app/_lib/sidebar-width";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

const RESIZING_CLASS = "sidebar-resizing";

enum ResizeKey {
  LEFT = "ArrowLeft",
  RIGHT = "ArrowRight",
  HOME = "Home",
  END = "End",
}

interface DragState {
  startX: number;
  startWidth: number;
  width: number;
}

const _ceiling = (): number => window.innerWidth * SIDEBAR_WIDTH.VIEWPORT_RATIO;

const _keyWidth = (key: string, width: number): number | null => {
  switch (key) {
    case ResizeKey.LEFT:
      return width - SIDEBAR_WIDTH.STEP;
    case ResizeKey.RIGHT:
      return width + SIDEBAR_WIDTH.STEP;
    case ResizeKey.HOME:
      return SIDEBAR_WIDTH.MIN;
    case ResizeKey.END:
      return SIDEBAR_WIDTH.MAX;
    default:
      return null;
  }
};

export const useSidebarResize = (asideRef: RefObject<HTMLElement | null>) => {
  const { sidebarWidth } = usePreferences();
  const [width, setWidth] = useState(sidebarWidth);
  const [isResizing, setIsResizing] = useState(false);
  const dragRef = useRef<DragState | null>(null);
  const frameRef = useRef<number | null>(null);

  const commit = (next: number) => {
    const clamped = clampWidth(next, _ceiling());
    if (asideRef.current) asideRef.current.style.width = "";
    storeWidth(clamped);
    setWidth(clamped);
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    if (e.button !== 0 || !asideRef.current) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startWidth = asideRef.current.getBoundingClientRect().width;
    dragRef.current = { startX: e.clientX, startWidth, width: startWidth };
    document.body.classList.add(RESIZING_CLASS);
    setIsResizing(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.width = clampWidth(drag.startWidth + e.clientX - drag.startX, _ceiling());
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      if (asideRef.current && dragRef.current) {
        asideRef.current.style.width = `${dragRef.current.width}px`;
      }
    });
  };

  const onPointerUp = (e: PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    dragRef.current = null;
    document.body.classList.remove(RESIZING_CLASS);
    setIsResizing(false);
    commit(drag.width);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const next = _keyWidth(e.key, width);
    if (next === null) return;
    e.preventDefault();
    commit(next);
  };

  const onDoubleClick = () => commit(SIDEBAR_WIDTH.DEFAULT);

  return {
    width,
    isResizing,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel: onPointerUp,
      onKeyDown,
      onDoubleClick,
    },
  };
};
