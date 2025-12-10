"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type Theme =
  | "light"
  | "dark"
  | "pikachu"
  | "bulbasaur"
  | "charmander"
  | "squirtle"
  | "gengar";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
};

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const getSystemTheme = useCallback((): Theme => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, []);

  const [theme, setThemeState] = useState<Theme>("light");
  const [resolvedTheme, setResolvedTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  const applyTheme = useCallback((newTheme: Theme) => {
    const root = document.documentElement;
    root.classList.remove(
      "light",
      "dark",
      "pikachu",
      "bulbasaur",
      "charmander",
      "squirtle",
      "gengar"
    );
    root.classList.add(newTheme);
    setResolvedTheme(newTheme);
  }, []);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      if (typeof window !== "undefined") {
        localStorage.setItem("theme", newTheme);
      }
      applyTheme(newTheme);
    },
    [applyTheme]
  );

  const toggleTheme = useCallback(() => {
    const currentResolved = resolvedTheme;
    if (currentResolved === "light") {
      setTheme("dark");
    } else if (currentResolved === "dark") {
      setTheme("pikachu");
    } else {
      setTheme("light");
    }
  }, [resolvedTheme, setTheme]);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme") as Theme | null;
    const initialTheme = stored || getSystemTheme();
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, [applyTheme, getSystemTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
