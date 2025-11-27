"use client";

import { useState, useRef, useEffect } from "react";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";

export interface DropdownMenuItem {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
  isActive?: boolean;
}

interface DropdownMenuProps {
  items: DropdownMenuItem[];
  triggerIcon?: string;
  triggerClassName?: string;
  triggerLabel?: string;
  triggerElement?: React.ReactNode;
}

export default function DropdownMenu({
  items,
  triggerIcon = "more_vert",
  triggerClassName = "",
  triggerLabel,
  triggerElement,
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      {triggerElement ? (
        <div
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          {triggerElement}
        </div>
      ) : (
        <IconButton
          icon={triggerIcon}
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={isOpen ? "bg-primary text-on-primary" : ""}
          title="Options"
        />
      )}

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 min-w-[160px] bg-surface rounded-lg elevation-3 py-2 z-50 shadow-lg">
          {items.map((item, index) => (
            <button
              key={index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!item.disabled) {
                  item.onClick();
                  setIsOpen(false);
                }
              }}
              disabled={item.disabled}
              className={`w-full text-left px-4 py-2 text-sm flex items-center gap-3 transition-colors ${
                item.disabled
                  ? "opacity-50 cursor-not-allowed text-on-surface-variant"
                  : item.isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : item.variant === "danger"
                  ? "hover:bg-error/10 text-error"
                  : "hover:bg-surface-variant text-on-surface"
              }`}
            >
              {item.icon && <Icon icon={item.icon} size="sm" />}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
