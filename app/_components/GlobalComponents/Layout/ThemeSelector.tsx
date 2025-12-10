"use client";

import { Theme, useTheme } from "@/app/_providers/ThemeProvider";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/app/_components/GlobalComponents/Form/DropdownMenu";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import { usePathname, useRouter } from "next/navigation";
import { usePreferences } from "@/app/_providers/PreferencesProvider";

const PokemonSprite = ({ src, name }: { src: string; name: string }) => (
  <img
    src={src}
    alt={name}
    className="w-5 h-5 object-contain"
    onError={(e) => {
      const target = e.target as HTMLImageElement;
      target.style.display = "none";
    }}
  />
);

export default function ThemeSelector() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const { pokemonThemesEnabled = false } = usePreferences();

  const themeSetter = (newTheme: Theme) => {
    setTheme(newTheme);

    if (pathname === "/") {
      window?.location.reload();
    } else {
      router.refresh();
    }
  };

  const handleToggle = () => {
    const currentTheme = resolvedTheme === "light" ? "dark" : "light";
    themeSetter(currentTheme);
  };

  if (!pokemonThemesEnabled) {
    return (
      <IconButton
        icon={resolvedTheme === "dark" ? "light_mode" : "dark_mode"}
        onClick={handleToggle}
        aria-label={`Switch to ${
          resolvedTheme === "dark" ? "light" : "dark"
        } mode`}
      />
    );
  }

  const pokemonThemes: DropdownMenuItem[] = [
    {
      label: "Pikachu",
      iconElement: <PokemonSprite src="/pokemon/pikachu.png" name="Pikachu" />,
      onClick: () => themeSetter("pikachu"),
      isActive: theme === "pikachu",
    },
    {
      label: "Bulbasaur",
      iconElement: (
        <PokemonSprite src="/pokemon/bulbasaur.png" name="Bulbasaur" />
      ),
      onClick: () => themeSetter("bulbasaur"),
      isActive: theme === "bulbasaur",
    },
    {
      label: "Charmander",
      iconElement: (
        <PokemonSprite src="/pokemon/charmander.png" name="Charmander" />
      ),
      onClick: () => themeSetter("charmander"),
      isActive: theme === "charmander",
    },
    {
      label: "Squirtle",
      iconElement: (
        <PokemonSprite src="/pokemon/squirtle.png" name="Squirtle" />
      ),
      onClick: () => themeSetter("squirtle"),
      isActive: theme === "squirtle",
    },
    {
      label: "Gengar",
      iconElement: <PokemonSprite src="/pokemon/gengar.png" name="Gengar" />,
      onClick: () => themeSetter("gengar"),
      isActive: theme === "gengar",
    },
  ];

  const themeOptions: DropdownMenuItem[] = [
    {
      label: "Light",
      icon: "light_mode",
      onClick: () => themeSetter("light"),
      isActive: theme === "light",
    },
    {
      label: "Dark",
      icon: "dark_mode",
      onClick: () => themeSetter("dark"),
      isActive: theme === "dark",
    },
    ...pokemonThemes,
  ];

  return (
    <DropdownMenu
      items={themeOptions}
      triggerElement={<IconButton icon="palette" aria-label="Select theme" />}
    />
  );
}
