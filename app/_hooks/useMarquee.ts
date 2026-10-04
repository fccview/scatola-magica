import { PointerEvent, RefObject, useEffect, useRef } from "react";
import { SelectKind } from "@/app/_types/enums";

const DRAG_THRESHOLD = 5;
const EDGE_ZONE = 48;
const MAX_SCROLL_STEP = 18;
const ACTIVE_CLASS = "marquee-active";
const BLOCKED_TARGETS = "[data-select-id], button, a, input, textarea, select, label";

interface Point {
  x: number;
  y: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface Target extends Box {
  id: string;
  kind: SelectKind;
}

interface Session {
  origin: Point;
  pointer: Point;
  targets: Target[];
  baseFiles: string[];
  baseFolders: string[];
  isActive: boolean;
  hits: Set<Target>;
}

interface MarqueeOptions {
  containerRef: RefObject<HTMLElement | null>;
  boxRef: RefObject<HTMLElement | null>;
  selectedFiles: Set<string>;
  selectedFolders: Set<string>;
  onSelect: (fileIds: string[], folderIds: string[]) => void;
}

const _toContent = (container: HTMLElement, clientX: number, clientY: number): Point => {
  const rect = container.getBoundingClientRect();
  return {
    x: clientX - rect.left + container.scrollLeft,
    y: clientY - rect.top + container.scrollTop,
  };
};

const _collect = (container: HTMLElement): Target[] =>
  Array.from(container.querySelectorAll<HTMLElement>("[data-select-id]")).map((el) => {
    const rect = el.getBoundingClientRect();
    const topLeft = _toContent(container, rect.left, rect.top);
    return {
      id: el.dataset.selectId ?? "",
      kind: el.dataset.selectKind as SelectKind,
      left: topLeft.x,
      top: topLeft.y,
      right: topLeft.x + rect.width,
      bottom: topLeft.y + rect.height,
    };
  });

const _boxOf = (a: Point, b: Point): Box => ({
  left: Math.min(a.x, b.x),
  top: Math.min(a.y, b.y),
  right: Math.max(a.x, b.x),
  bottom: Math.max(a.y, b.y),
});

const _overlaps = (a: Box, b: Box): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const _edgeStep = (container: HTMLElement, clientY: number): number => {
  const rect = container.getBoundingClientRect();
  if (clientY < rect.top + EDGE_ZONE) {
    return -MAX_SCROLL_STEP * Math.min(1, (rect.top + EDGE_ZONE - clientY) / EDGE_ZONE);
  }
  if (clientY > rect.bottom - EDGE_ZONE) {
    return MAX_SCROLL_STEP * Math.min(1, (clientY - rect.bottom + EDGE_ZONE) / EDGE_ZONE);
  }
  return 0;
};

const _paint = (el: HTMLElement | null, box: Box | null): void => {
  if (!el) return;
  if (!box) {
    el.style.display = "none";
    return;
  }
  el.style.display = "block";
  el.style.transform = `translate(${box.left}px, ${box.top}px)`;
  el.style.width = `${box.right - box.left}px`;
  el.style.height = `${box.bottom - box.top}px`;
};

export const useMarquee = ({
  containerRef,
  boxRef,
  selectedFiles,
  selectedFolders,
  onSelect,
}: MarqueeOptions) => {
  const sessionRef = useRef<Session | null>(null);
  const frameRef = useRef<number | null>(null);
  const onSelectRef = useRef(onSelect);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => () => cleanupRef.current?.(), []);

  const emit = (session: Session) => {
    const files = new Set(session.baseFiles);
    const folders = new Set(session.baseFolders);

    session.hits.forEach((target) => {
      if (target.kind === SelectKind.FOLDER) folders.add(target.id);
      else files.add(target.id);
    });

    onSelectRef.current([...files], [...folders]);
  };

  const resolve = (session: Session, box: Box) => {
    let changed = false;

    for (const target of session.targets) {
      const isHit = _overlaps(box, target);
      if (isHit === session.hits.has(target)) continue;

      changed = true;
      if (isHit) session.hits.add(target);
      else session.hits.delete(target);
    }

    if (changed) emit(session);
  };

  const tick = () => {
    frameRef.current = null;
    const session = sessionRef.current;
    const container = containerRef.current;
    if (!session?.isActive || !container) return;

    const step = _edgeStep(container, session.pointer.y);
    if (step !== 0) container.scrollTop += step;

    const current = _toContent(container, session.pointer.x, session.pointer.y);
    const box = _boxOf(session.origin, current);
    _paint(boxRef.current, box);
    resolve(session, box);

    if (step !== 0) frameRef.current = requestAnimationFrame(tick);
  };

  const schedule = () => {
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(tick);
  };

  const finish = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    sessionRef.current = null;
    _paint(boxRef.current, null);
    document.body.classList.remove(ACTIVE_CLASS);
    cleanupRef.current?.();
    cleanupRef.current = null;
  };

  const handleMove = (e: globalThis.PointerEvent) => {
    const session = sessionRef.current;
    const container = containerRef.current;
    if (!session || !container) return;

    session.pointer = { x: e.clientX, y: e.clientY };

    if (!session.isActive) {
      const start = _toContent(container, e.clientX, e.clientY);
      const distance = Math.hypot(start.x - session.origin.x, start.y - session.origin.y);
      if (distance < DRAG_THRESHOLD) return;
      session.isActive = true;
      session.targets = _collect(container);
      document.body.classList.add(ACTIVE_CLASS);
      emit(session);
    }

    schedule();
  };

  const onPointerDown = (e: PointerEvent<HTMLElement>) => {
    const container = containerRef.current;
    if (!container || e.button !== 0 || e.pointerType !== "mouse") return;
    if ((e.target as HTMLElement).closest(BLOCKED_TARGETS)) return;

    const rect = container.getBoundingClientRect();
    if (e.clientX - rect.left > container.clientWidth) return;

    e.preventDefault();
    const isAdditive = e.shiftKey || e.metaKey || e.ctrlKey;

    sessionRef.current = {
      origin: _toContent(container, e.clientX, e.clientY),
      pointer: { x: e.clientX, y: e.clientY },
      targets: [],
      baseFiles: isAdditive ? [...selectedFiles] : [],
      baseFolders: isAdditive ? [...selectedFolders] : [],
      isActive: false,
      hits: new Set(),
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    container.addEventListener("scroll", schedule);
    cleanupRef.current = () => {
      container.removeEventListener("scroll", schedule);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
    };
  };

  return { onPointerDown };
};
