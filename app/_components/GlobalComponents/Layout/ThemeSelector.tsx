"use client";

import { PokemonTheme, useTheme } from "@/app/_providers/ThemeProvider";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/app/_components/GlobalComponents/Form/DropdownMenu";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import { usePathname, useRouter } from "next/navigation";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import { useEffect } from "react";
import Pokeball from "@/app/_components/GlobalComponents/Icons/Pokeball";

const POKEMON_SPRITES = [
  "/pokemon/animations/pikachu/idle.gif",
  "/pokemon/animations/bulbasaur/idle.gif",
  "/pokemon/animations/charmander/idle.gif",
  "/pokemon/animations/squirtle/idle.gif",
  "/pokemon/animations/gengar/idle.gif",
];

const PokemonSprite = ({ src, name }: { src: string; name: string }) => (
  <img
    src={src}
    alt={name}
    className="w-10 h-10 -mt-4 -ml-2.5 -mr-2.5 object-contain"
    loading="eager"
  />
);

export default function ThemeSelector() {
  const {
    pokemonTheme,
    colorMode,
    resolvedColorMode,
    setPokemonTheme,
    setColorMode,
    toggleColorMode,
  } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { pokemonThemesEnabled = false } = usePreferences();

  useEffect(() => {
    if (pokemonThemesEnabled) {
      POKEMON_SPRITES.forEach((src) => {
        const link = document.createElement("link");
        link.rel = "preload";
        link.as = "image";
        link.href = src;
        document.head.appendChild(link);
      });
    }
  }, [pokemonThemesEnabled]);

  const handlePokemonChange = (newPokemon: PokemonTheme) => {
    setPokemonTheme(newPokemon);
    if (pathname === "/") {
      window?.location.reload();
    } else {
      router.refresh();
    }
  };

  const handleColorModeToggle = () => {
    toggleColorMode();
    if (pathname === "/") {
      window?.location.reload();
    } else {
      router.refresh();
    }
  };

  if (!pokemonThemesEnabled) {
    return (
      <IconButton
        icon={resolvedColorMode === "dark" ? "light_mode" : "dark_mode"}
        onClick={handleColorModeToggle}
        aria-label={`Switch to ${
          resolvedColorMode === "dark" ? "light" : "dark"
        } mode`}
      />
    );
  }

  const pokemonThemes: DropdownMenuItem[] = [
    {
      label: "None",
      icon: "close",
      onClick: () => handlePokemonChange(null),
      isActive: pokemonTheme === null,
    },
    {
      label: "Pikachu",
      iconElement: (
        <PokemonSprite
          src="/pokemon/animations/pikachu/idle.gif"
          name="Pikachu"
        />
      ),
      onClick: () => handlePokemonChange("pikachu"),
      isActive: pokemonTheme === "pikachu",
    },
    {
      label: "Bulbasaur",
      iconElement: (
        <PokemonSprite
          src="/pokemon/animations/bulbasaur/idle.gif"
          name="Bulbasaur"
        />
      ),
      onClick: () => handlePokemonChange("bulbasaur"),
      isActive: pokemonTheme === "bulbasaur",
    },
    {
      label: "Charmander",
      iconElement: (
        <PokemonSprite
          src="/pokemon/animations/charmander/idle.gif"
          name="Charmander"
        />
      ),
      onClick: () => handlePokemonChange("charmander"),
      isActive: pokemonTheme === "charmander",
    },
    {
      label: "Squirtle",
      iconElement: (
        <PokemonSprite
          src="/pokemon/animations/squirtle/idle.gif"
          name="Squirtle"
        />
      ),
      onClick: () => handlePokemonChange("squirtle"),
      isActive: pokemonTheme === "squirtle",
    },
    {
      label: "Gengar",
      iconElement: (
        <PokemonSprite
          src="/pokemon/animations/gengar/idle.gif"
          name="Gengar"
        />
      ),
      onClick: () => handlePokemonChange("gengar"),
      isActive: pokemonTheme === "gengar",
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu
        items={pokemonThemes}
        triggerElement={
          <button
            className="rounded-full aspect-square inline-flex items-center justify-center transition-colors p-2 text-on-surface hover:bg-surface-variant active:bg-surface-variant/80 focus:outline-none"
            aria-label="Select pokemon theme"
          >
            <Pokeball className="w-4 h-4" />
          </button>
        }
      />
      <IconButton
        icon={resolvedColorMode === "dark" ? "light_mode" : "dark_mode"}
        onClick={handleColorModeToggle}
        aria-label={`Switch to ${
          resolvedColorMode === "dark" ? "light" : "dark"
        } mode`}
      />
    </div>
  );
}
