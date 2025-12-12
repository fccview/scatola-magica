"use client";

import { useEffect, useRef } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  headerActions?: React.ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  headerActions,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: "lg:max-w-md",
    md: "lg:max-w-2xl",
    lg: "lg:max-w-4xl",
    xl: "lg:max-w-6xl",
  };

  return (
    <div
      className="modal-overlay fixed inset-0 z-[100] flex justify-center items-end lg:items-center lg:align-middle lg:p-4 bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className={`bg-surface rounded-t-lg lg:rounded-b-lg shadow-xl w-full max-w-full ${sizeClasses[size]} max-h-[90vh] flex flex-col overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-dashed border-outline-variant flex-shrink-0">
            <h2 className="text-xl font-semibold text-on-surface">{title}</h2>
            <div className="flex items-center gap-2">
              {headerActions}
              <IconButton icon="close" onClick={onClose} />
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
