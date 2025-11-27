"use client";

import { useTheme } from "@/app/_providers/ThemeProvider";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";

export default function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <IconButton
      icon={resolvedTheme === "dark" ? "light_mode" : "dark_mode"}
      onClick={toggleTheme}
      aria-label={`Switch to ${
        resolvedTheme === "dark" ? "light" : "dark"
      } mode`}
    />
  );
}
