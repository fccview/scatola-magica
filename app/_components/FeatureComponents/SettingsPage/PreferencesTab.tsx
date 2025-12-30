"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserPreferences } from "@/app/_lib/preferences";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";

export default function PreferencesTab() {
  const router = useRouter();
  const {
    particlesEnabled: initialParticles,
    wandCursorEnabled: initialWand,
    pokemonThemesEnabled: initialPokemonThemes,
    torrentPreferences,
    user,
  } = usePreferences();

  if (!user) {
    return null;
  }

  const [particlesEnabled, setParticlesEnabled] = useState(initialParticles);
  const [wandCursorEnabled, setWandCursorEnabled] = useState(initialWand);
  const [pokemonThemesEnabled, setPokemonThemesEnabled] = useState(
    initialPokemonThemes ?? false
  );
  const [torrentsEnabled, setTorrentsEnabled] = useState(
    torrentPreferences?.enabled ?? false
  );

  const handleParticlesToggle = async () => {
    const newValue = !particlesEnabled;
    setParticlesEnabled(newValue);
    await updateUserPreferences(user?.username ?? "", {
      particlesEnabled: newValue,
    });
    router.refresh();
  };

  const handleWandCursorToggle = async () => {
    const newValue = !wandCursorEnabled;
    setWandCursorEnabled(newValue);
    await updateUserPreferences(user?.username ?? "", {
      wandCursorEnabled: newValue,
    });
    router.refresh();
  };

  const handlePokemonThemesToggle = async () => {
    const newValue = !pokemonThemesEnabled;
    setPokemonThemesEnabled(newValue);
    await updateUserPreferences(user?.username ?? "", {
      pokemonThemesEnabled: newValue,
    });

    if (!newValue && typeof window !== "undefined") {
      const currentPokemonTheme = localStorage.getItem("pokemonTheme");
      if (currentPokemonTheme) {
        localStorage.removeItem("pokemonTheme");
        window.location.reload();
      }
    }

    router.refresh();
  };

  const handleTorrentsEnabledToggle = async () => {
    const newValue = !torrentsEnabled;
    setTorrentsEnabled(newValue);
    await updateUserPreferences(user?.username ?? "", {
      torrentPreferences: {
        enabled: newValue,
      },
    });
    router.refresh();
  };

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">Home Page</h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Switch
            id="particles"
            checked={particlesEnabled}
            onChange={handleParticlesToggle}
            label="Particle Animation"
            description="Show animated particles on the home page"
          />

          <Switch
            id="wand-cursor"
            checked={wandCursorEnabled}
            onChange={handleWandCursorToggle}
            label="Magic Wand Cursor"
            description="Show magic wand cursor on the home page"
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">Themes</h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Switch
            id="pokemon-themes"
            checked={pokemonThemesEnabled}
            onChange={handlePokemonThemesToggle}
            label="Pokemon Themes"
            description={
              <>
                Show Pokemon-themed color schemes in theme selector. Animations
                by{" "}
                <a
                  href="https://github.com/jakobhoeg/vscode-pokemon"
                  target="_blank"
                  className="text-primary underline"
                  rel="noopener noreferrer"
                >
                  vscode-pokemon
                </a>{" "}
                dev.
              </>
            }
          />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">Torrents (beta)</h2>
        <div className="p-6 bg-surface-container rounded-lg space-y-6">
          <Switch
            id="enable-torrents"
            checked={torrentsEnabled}
            onChange={handleTorrentsEnabledToggle}
            label="Enable Torrents"
            description="Enable torrent functionality. When enabled, you can create, share, and download torrent files. This functionality is in beta and may have some issues."
          />
        </div>
      </div>
    </div>
  );
}
