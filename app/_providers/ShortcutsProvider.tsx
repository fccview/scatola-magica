"use client";

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

interface ShortcutActions {
  onSearch?: () => void;
  onUpload?: () => void;
  onCreateFolder?: () => void;
  onToggleRecursive?: () => void;
  onToggleSelect?: () => void;
  onToggleViewMode?: () => void;
}

interface ShortcutsContextValue {
  registerActions: (actions: ShortcutActions) => void;
  unregisterActions: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextValue | null>(null);

export const useShortcuts = () => {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error("useShortcuts must be used within ShortcutsProvider");
  }
  return context;
};

let globalActions: ShortcutActions = {};

export default function ShortcutsProvider({
  children,
}: {
  children: ReactNode;
}) {
  const registerActions = useCallback((actions: ShortcutActions) => {
    globalActions = { ...globalActions, ...actions };
  }, []);

  const unregisterActions = useCallback(() => {
    globalActions = {};
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const controlKey = isMac ? e.metaKey : e.ctrlKey;

      const target = e.target as HTMLElement;
      const isTyping =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isTyping) return;

      if ((e.key === "f" || e.key === "F") && !controlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (globalActions.onSearch) {
          globalActions.onSearch();
        }
        return;
      }

      if (controlKey && e.shiftKey && (e.key === "U" || e.key === "u")) {
        e.preventDefault();
        e.stopPropagation();
        if (globalActions.onUpload) {
          globalActions.onUpload();
        }
        return;
      }

      if ((e.key === "+" || e.key === "=") && !controlKey && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        if (globalActions.onCreateFolder) {
          globalActions.onCreateFolder();
        }
        return;
      }

      if (
        (e.key === "r" || e.key === "R") &&
        !controlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (globalActions.onToggleRecursive) {
          globalActions.onToggleRecursive();
        }
        return;
      }

      if (
        (e.key === "x" || e.key === "X") &&
        !controlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (globalActions.onToggleSelect) {
          globalActions.onToggleSelect();
        }
        return;
      }

      if (
        (e.key === "v" || e.key === "V") &&
        !controlKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        e.preventDefault();
        if (globalActions.onToggleViewMode) {
          globalActions.onToggleViewMode();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, []);

  return (
    <ShortcutsContext.Provider value={{ registerActions, unregisterActions }}>
      {children}
    </ShortcutsContext.Provider>
  );
}
