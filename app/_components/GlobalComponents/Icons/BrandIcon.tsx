"use client";

import { FileIcon, defaultStyles } from "react-file-icon";
import { useTheme } from "@/app/_providers/ThemeProvider";
import { HTMLAttributes } from "react";

interface FileIconComponentProps extends HTMLAttributes<HTMLDivElement> {
  extension: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const sizeMap: Record<string, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 40,
  "2xl": 50,
  "3xl": 65,
};

export default function FileIconComponent({
  extension,
  size = "md",
  className = "",
  style,
}: FileIconComponentProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const iconSize = sizeMap[size] || sizeMap.md;

  const extensionLower = extension.toLowerCase();
  const defaultStyle =
    defaultStyles[extensionLower as keyof typeof defaultStyles];

  const iconProps = {
    extension: extensionLower,
    size: iconSize,
    ...defaultStyle,
    color: isDark
      ? defaultStyle?.color || "#5a5a5a"
      : defaultStyle?.color || "#f5f5f5",
    labelColor: defaultStyle?.labelColor,
    glyphColor: isDark
      ? defaultStyle?.glyphColor || "#e0e0e0"
      : defaultStyle?.glyphColor || "#333333",
    foldColor: defaultStyle?.foldColor,
    gradientColor: isDark
      ? defaultStyle?.gradientColor || "#4a4a4a"
      : defaultStyle?.gradientColor || "#ffffff",
    gradientOpacity: isDark
      ? defaultStyle?.gradientOpacity || 0.4
      : defaultStyle?.gradientOpacity || 0.2,
  };

  return (
    <div
      className={className}
      style={{
        width: `${iconSize}px`,
        height: `${iconSize}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        ...style,
      }}
    >
      <FileIcon {...iconProps} />
    </div>
  );
}
