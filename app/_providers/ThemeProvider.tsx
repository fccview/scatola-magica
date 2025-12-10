"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

export type PokemonTheme = "pikachu" | "bulbasaur" | "charmander" | "squirtle" | "gengar" | null;
export type ColorMode = "light" | "dark";

interface ThemeContextValue {
  pokemonTheme: PokemonTheme;
  colorMode: ColorMode;
  resolvedPokemonTheme: PokemonTheme;
  resolvedColorMode: ColorMode;
  setPokemonTheme: (theme: PokemonTheme) => void;
  setColorMode: (mode: ColorMode) => void;
  toggleColorMode: () => void;
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
    (newPokemonTheme: PokemonTheme) => {
      setPokemonThemeState(newPokemonTheme);
      if (typeof window !== "undefined") {
        if (newPokemonTheme) {
          localStorage.setItem("pokemonTheme", newPokemonTheme);
        } else {
          localStorage.removeItem("pokemonTheme");
        }
      }
      applyTheme(newPokemonTheme, colorMode);
    },
    [applyTheme, colorMode]
  );

  const setColorMode = useCallback(
    (newColorMode: ColorMode) => {
      setColorModeState(newColorMode);
      if (typeof window !== "undefined") {
        localStorage.setItem("colorMode", newColorMode);
      }
      applyTheme(pokemonTheme, newColorMode);
    },
    [applyTheme, pokemonTheme]
  );

  const toggleColorMode = useCallback(() => {
    const newMode = resolvedColorMode === "light" ? "dark" : "light";
    setColorMode(newMode);
  }, [resolvedColorMode, setColorMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const storedPokemon = localStorage.getItem("pokemonTheme") as PokemonTheme | null;
    const storedColorMode = localStorage.getItem("colorMode") as ColorMode | null;
    
    const validPokemonThemes: PokemonTheme[] = ["pikachu", "bulbasaur", "charmander", "squirtle", "gengar"];
    const initialPokemon = storedPokemon && validPokemonThemes.includes(storedPokemon) ? storedPokemon : null;
    const initialColorMode = storedColorMode === "light" || storedColorMode === "dark" ? storedColorMode : getSystemColorMode();
    
    setPokemonThemeState(initialPokemon);
    setColorModeState(initialColorMode);
    applyTheme(initialPokemon, initialColorMode);
  }, [applyTheme, getSystemColorMode]);

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
