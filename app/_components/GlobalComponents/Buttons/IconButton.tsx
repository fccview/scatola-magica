import { ButtonHTMLAttributes } from "react";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  size?: "xs" | "sm" | "md" | "lg";
  ariaLabel?: string;
}

export default function IconButton({
  icon,
  ariaLabel,
  size = "md",
  className = "",
  ...props
}: IconButtonProps) {
  const paddingMap = {
    xs: "p-0.5",
    sm: "p-1.5",
    md: "p-2",
    lg: "p-2.5",
  };

  const iconSizeMap = {
    xs: "xs" as const,
    sm: "sm" as const,
    md: "sm" as const,
    lg: "md" as const,
  };

  const isActive = className.includes("bg-primary");

  return (
    <button
      aria-label={ariaLabel}
      className={`rounded-full aspect-square inline-flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none ${
        paddingMap[size]
      } ${
        isActive
          ? "bg-primary text-on-primary"
          : "text-on-surface hover:bg-surface-variant active:bg-surface-variant/80"
      } ${className}`}
      {...props}
    >
      <Icon icon={icon} size={iconSizeMap[size]} />
    </button>
  );
}
