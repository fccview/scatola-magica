"use client";

import { useState, useRef, useEffect } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface ItemActionsMenuProps {
  onRename?: () => void;
  onMove?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
}

export default function ItemActionsMenu({
  onRename,
  onMove,
  onDownload,
  onDelete,
}: ItemActionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      setTimeout(() => {
        document.addEventListener("click", handleClickOutside, true);
        document.addEventListener("touchend", handleClickOutside, true);
      }, 0);
      return () => {
        document.removeEventListener("click", handleClickOutside, true);
        document.removeEventListener("touchend", handleClickOutside, true);
      };
    }
  }, [showMenu]);

  if (!onRename && !onMove && !onDownload && !onDelete) {
    return null;
  }

  return (
    <>
      <div className="medium:hidden relative" ref={triggerRef}>
        <IconButton
          icon="more_vert"
          size="md"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          title="More actions"
          className="opacity-100"
        />

        {showMenu && (
          <div ref={menuRef} className="absolute right-0 top-full mt-2 min-w-[140px] bg-surface rounded-lg elevation-3 py-2 z-50 shadow-lg" style={{ touchAction: 'none' }}>
            {onRename && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRename();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-on-surface"
                style={{ touchAction: 'manipulation' }}
              >
                <Icon icon="edit" size="sm" />
                <span>Rename</span>
              </button>
            )}
            {onMove && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMove();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-on-surface"
                style={{ touchAction: 'manipulation' }}
              >
                <Icon icon="drive_file_move" size="sm" />
                <span>Move</span>
              </button>
            )}
            {onDownload && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDownload();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-on-surface"
                style={{ touchAction: 'manipulation' }}
              >
                <Icon icon="download" size="sm" />
                <span>Download</span>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDelete();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-error"
                style={{ touchAction: 'manipulation' }}
              >
                <Icon icon="delete" size="sm" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div
        className="hidden medium:block opacity-0 group-hover:opacity-100 transition-opacity"
        ref={menuRef}
      >
        <div
          className={`rounded-full p-1 transition-all duration-200 ease-out overflow-hidden ${showMenu
            ? "max-w-[200px] bg-surface"
            : "max-w-[48px] bg-surface-variant/30"
            }`}
        >
          <div className="flex items-center gap-2.5 whitespace-nowrap px-1">
            {!showMenu ? (
              <IconButton
                icon="more_vert"
                size="md"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowMenu(true);
                }}
                title="More actions"
              />
            ) : (
              <>
                {onRename && (
                  <IconButton
                    icon="edit"
                    size="md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onRename();
                    }}
                    title="Rename"
                  />
                )}
                {onMove && (
                  <IconButton
                    icon="drive_file_move"
                    size="md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onMove();
                    }}
                    title="Move"
                  />
                )}
                {onDownload && (
                  <IconButton
                    icon="download"
                    size="md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDownload();
                    }}
                    title="Download"
                  />
                )}
                {onDelete && (
                  <IconButton
                    icon="delete"
                    size="md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDelete();
                    }}
                    title="Delete"
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
