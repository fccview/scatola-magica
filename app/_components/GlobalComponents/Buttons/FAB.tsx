"use client";

import { ButtonHTMLAttributes } from "react";

interface FABProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  label?: string;
  size?: "sm" | "md" | "lg";
}

export default function FAB({
  icon,
  label,
  size = "md",
  className = "",
  ...props
}: FABProps) {
  const sizeMap = {
    sm: label ? "h-10 px-4" : "w-10 h-10",
    md: label ? "h-14 px-6" : "w-14 h-14",
    lg: label ? "h-16 px-8" : "w-16 h-16",
  };

  const iconSizeMap = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl",
  };

  return (
    <button
      className={`rounded-lg bg-surface-container text-on-surface transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-primary focus:border focus:border-dashed ${sizeMap[size]} ${className}`}
      {...props}
    >
      <span className={`material-symbols-outlined ${iconSizeMap[size]}`}>
        {icon}
      </span>
      {label && <span className="font-medium">{label}</span>}
    </button>
  );
}
