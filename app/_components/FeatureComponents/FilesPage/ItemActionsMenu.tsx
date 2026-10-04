"use client";

import { Fragment, MouseEvent, useState, useRef, useEffect } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Tooltip from "@/app/_components/GlobalComponents/Layout/Tooltip";
import { buildActions, ItemAction, ItemHandlers } from "@/app/_lib/item-actions";
import { ItemActionGroup, ItemActionId } from "@/app/_types/enums";

interface ItemActionsMenuProps extends ItemHandlers {
  fileName?: string;
}

export default function ItemActionsMenu({
  fileName,
  ...handlers
}: ItemActionsMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const isEncrypted =
    fileName?.endsWith(".gpg") || fileName?.endsWith(".folder.gpg") || false;

  useEffect(() => {
    function handleClickOutside(event: globalThis.MouseEvent | TouchEvent) {
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

  const actions = buildActions(handlers, isEncrypted);
  const pillActions = actions.filter(
    (action) => action.id !== ItemActionId.OPEN
  );

  if (pillActions.length === 0) {
    return null;
  }

  const fire = (action: ItemAction) => (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(false);
    action.run();
  };

  const toggle = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(!showMenu);
  };

  return (
    <>
      <div className="medium:hidden relative" ref={triggerRef}>
        <IconButton
          icon="more_vert"
          size="md"
          onClick={toggle}
          ariaLabel="More actions"
          aria-expanded={showMenu}
          className="opacity-100"
        />

        {showMenu && (
          <div
            ref={menuRef}
            className="absolute right-0 top-full mt-2 min-w-[140px] bg-surface rounded-lg elevation-3 py-2 z-50 shadow-lg"
            style={{ touchAction: "none" }}
          >
            {actions.map((action, index) => (
              <Fragment key={action.id}>
                {index > 0 && actions[index - 1].group !== action.group && (
                  <div className="h-px bg-outline-variant my-2" />
                )}
                <button
                  onClick={fire(action)}
                  className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors hover:bg-surface-variant active:bg-surface-variant ${
                    action.group === ItemActionGroup.DANGER
                      ? "text-error"
                      : "text-on-surface"
                  }`}
                  style={{ touchAction: "manipulation" }}
                >
                  <Icon icon={action.icon} size="sm" />
                  <span>{action.label}</span>
                </button>
              </Fragment>
            ))}
          </div>
        )}
      </div>

      <div
        className="hidden medium:block opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto focus-within:pointer-events-auto"
        ref={menuRef}
      >
        <div
          className={`rounded-full p-1 transition-all duration-200 ease-out overflow-hidden ${
            showMenu
              ? "max-w-[300px] bg-surface"
              : "max-w-[48px] bg-surface-variant/30"
          }`}
        >
          <div className="flex items-center gap-2.5 whitespace-nowrap px-1">
            {!showMenu ? (
              <Tooltip label="More actions">
                <IconButton
                  icon="more_vert"
                  size="md"
                  onClick={toggle}
                  ariaLabel="More actions"
                  aria-expanded={showMenu}
                />
              </Tooltip>
            ) : (
              pillActions.map((action) => (
                <Tooltip key={action.id} label={action.hint}>
                  <IconButton
                    icon={action.icon}
                    size="md"
                    onClick={fire(action)}
                    ariaLabel={action.hint}
                  />
                </Tooltip>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
}
