"use client";

import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  variant?: "error" | "info" | "warning";
}

export default function ErrorModal({
  isOpen,
  onClose,
  title,
  message,
  variant = "error",
}: ErrorModalProps) {
  const variantConfig = {
    error: {
      icon: "error",
      iconBg: "bg-error-container",
      iconColor: "text-on-error-container",
      title: title || "Error",
    },
    info: {
      icon: "info",
      iconBg: "bg-info-container",
      iconColor: "text-on-info-container",
      title: title || "Information",
    },
    warning: {
      icon: "warning",
      iconBg: "bg-warning-container",
      iconColor: "text-on-warning-container",
      title: title || "Warning",
    },
  };

  const config = variantConfig[variant];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={config.title} size="sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-12 h-12 rounded-full ${config.iconBg} flex items-center justify-center`}
          >
            <Icon icon={config.icon} className={config.iconColor} size="lg" />
          </div>
          <div className="flex-1">
            <p className="text-on-surface">{message}</p>
          </div>
        </div>

        <div className="pt-2 flex gap-3 justify-end">
          <Button variant="filled" onClick={onClose}>
            OK
          </Button>
        </div>
      </div>
    </Modal>
  );
}
