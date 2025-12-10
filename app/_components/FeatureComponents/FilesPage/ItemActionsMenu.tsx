"use client";

import { useState, useRef, useEffect } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface ItemActionsMenuProps {
  onOpen?: () => void;
  onRename?: () => void;
  onMove?: () => void;
  onDownload?: () => void;
  onDelete?: () => void;
  onEncrypt?: () => void;
  onDecrypt?: () => void;
  fileName?: string;
}

export default function ItemActionsMenu({
  onOpen,
  onRename,
  onMove,
  onDownload,
  onDelete,
  onEncrypt,
  onDecrypt,
  fileName,
}: ItemActionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isEncrypted =
    fileName?.endsWith(".gpg") || fileName?.endsWith(".folder.gpg") || false;

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
        document.addEventListener("click", handleClickOutside, false);
        document.addEventListener("touchend", handleClickOutside, false);
      }, 0);
      return () => {
        document.removeEventListener("click", handleClickOutside, false);
        document.removeEventListener("touchend", handleClickOutside, false);
      };
    }
  }, [showMenu]);

  if (
    !onRename &&
    !onMove &&
    !onDownload &&
    !onDelete &&
    !onEncrypt &&
    !onDecrypt
  ) {
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
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 min-w-[140px] bg-surface rounded-lg elevation-3 py-2 z-50 shadow-lg"
            style={{ touchAction: "none" }}
          >
            {onOpen && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onOpen();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-on-surface"
                style={{ touchAction: "manipulation" }}
              >
                <Icon icon="open_in_new" size="sm" />
                <span>Open</span>
              </button>
            )}
            {onRename && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRename();
                  setShowMenu(false);
                }}
                className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-on-surface"
                style={{ touchAction: "manipulation" }}
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
                style={{ touchAction: "manipulation" }}
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
                style={{ touchAction: "manipulation" }}
              >
                <Icon icon="download" size="sm" />
                <span>Download</span>
              </button>
            )}
            {(onEncrypt || onDecrypt) && (
              <>
                {(onOpen || onRename || onMove || onDownload) && (
                  <div className="h-px bg-outline-variant my-2" />
                )}
                {isEncrypted && onDecrypt && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDecrypt();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-on-surface"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Icon icon="lock_open" size="sm" />
                    <span>Decrypt</span>
                  </button>
                )}
                {!isEncrypted && onEncrypt && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onEncrypt();
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-on-surface"
                    style={{ touchAction: "manipulation" }}
                  >
                    <Icon icon="lock" size="sm" />
                    <span>Encrypt</span>
                  </button>
                )}
              </>
            )}
            {onDelete && (
              <>
                {(onOpen ||
                  onRename ||
                  onMove ||
                  onDownload ||
                  onEncrypt ||
                  onDecrypt) && (
                    <div className="h-px bg-outline-variant my-2" />
                  )}
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant text-error"
                  style={{ touchAction: "manipulation" }}
                >
                  <Icon icon="delete" size="sm" />
                  <span>Delete</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      <div
        className="hidden medium:block opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto"
        ref={menuRef}
      >
        <div
          className={`rounded-full p-1 transition-all duration-200 ease-out overflow-hidden ${showMenu
            ? "max-w-[300px] bg-surface"
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
                {isEncrypted && onDecrypt && (
                  <IconButton
                    icon="lock_open"
                    size="md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onDecrypt();
                    }}
                    title="Decrypt"
                  />
                )}
                {!isEncrypted && onEncrypt && (
                  <IconButton
                    icon="lock"
                    size="md"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowMenu(false);
                      onEncrypt();
                    }}
                    title="Encrypt"
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
