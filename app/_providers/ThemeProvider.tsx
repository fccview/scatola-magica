"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { updateThemePreferences } from "@/app/_server/actions/user";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

export type PokemonTheme = "pikachu" | "bulbasaur" | "charmander" | "squirtle" | "gengar" | null;
export type ColorMode = "light" | "dark";

interface ThemeContextValue {
  pokemonTheme: PokemonTheme;
  colorMode: ColorMode;
  resolvedPokemonTheme: PokemonTheme;
  resolvedColorMode: ColorMode;
  setPokemonTheme: (theme: PokemonTheme) => Promise<void>;
  setColorMode: (mode: ColorMode) => Promise<void>;
  toggleColorMode: () => Promise<void>;
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
  const { user } = usePreferences();
  const getSystemColorMode = useCallback((): ColorMode => {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }, []);

  const [pokemonTheme, setPokemonThemeState] = useState<PokemonTheme>(null);
  const [colorMode, setColorModeState] = useState<ColorMode>("light");
  const [resolvedPokemonTheme, setResolvedPokemonTheme] = useState<PokemonTheme>(null);
  const [resolvedColorMode, setResolvedColorMode] = useState<ColorMode>("light");

  const applyTheme = useCallback((pokemon: PokemonTheme, mode: ColorMode) => {
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
    
    root.classList.add(mode);
    if (pokemon) {
      root.classList.add(pokemon);
    }
    
    setResolvedPokemonTheme(pokemon);
    setResolvedColorMode(mode);
  }, []);

  const setPokemonTheme = useCallback(
    async (newPokemonTheme: PokemonTheme) => {
      setPokemonThemeState(newPokemonTheme);

      if (typeof window !== "undefined") {
        if (newPokemonTheme) {
          localStorage.setItem("pokemonTheme", newPokemonTheme);
        } else {
          localStorage.removeItem("pokemonTheme");
        }
      }
      applyTheme(newPokemonTheme, colorMode);

      const persistentTheme = user?.persistentTheme ?? false;
      if (persistentTheme && user) {
        await updateThemePreferences(undefined, newPokemonTheme, undefined);
      }
    },
    [applyTheme, colorMode, user]
  );

  const setColorMode = useCallback(
    async (newColorMode: ColorMode) => {
      setColorModeState(newColorMode);

      if (typeof window !== "undefined") {
        localStorage.setItem("colorMode", newColorMode);
      }
      applyTheme(pokemonTheme, newColorMode);

      const persistentTheme = user?.persistentTheme ?? false;
      if (persistentTheme && user) {
        await updateThemePreferences(undefined, undefined, newColorMode);
      }
    },
    [applyTheme, pokemonTheme, user]
  );

  const toggleColorMode = useCallback(async () => {
    const newMode = resolvedColorMode === "light" ? "dark" : "light";
    await setColorMode(newMode);
  }, [resolvedColorMode, setColorMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const persistentTheme = user?.persistentTheme ?? false;
    const validPokemonThemes: PokemonTheme[] = ["pikachu", "bulbasaur", "charmander", "squirtle", "gengar"];

    let initialPokemon: PokemonTheme = null;
    let initialColorMode: ColorMode;

    if (persistentTheme && user) {
      initialPokemon = user.pokemonTheme && validPokemonThemes.includes(user.pokemonTheme as PokemonTheme)
        ? (user.pokemonTheme as PokemonTheme)
        : null;
      initialColorMode = user.colorMode || getSystemColorMode();
    } else {
      const storedPokemon = localStorage.getItem("pokemonTheme") as PokemonTheme | null;
      const storedColorMode = localStorage.getItem("colorMode") as ColorMode | null;

      initialPokemon = storedPokemon && validPokemonThemes.includes(storedPokemon) ? storedPokemon : null;
      initialColorMode = storedColorMode === "light" || storedColorMode === "dark" ? storedColorMode : getSystemColorMode();
    }

    setPokemonThemeState(initialPokemon);
    setColorModeState(initialColorMode);
    applyTheme(initialPokemon, initialColorMode);
  }, [applyTheme, getSystemColorMode, user]);

  return (
    <ThemeContext.Provider
      value={{
        pokemonTheme,
        colorMode,
        resolvedPokemonTheme,
        resolvedColorMode,
        setPokemonTheme,
        setColorMode,
        toggleColorMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
