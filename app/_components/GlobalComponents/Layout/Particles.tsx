"use client";

import { Particles as ReactParticles } from "@tsparticles/react";
import { loadFireflyPreset } from "@tsparticles/preset-firefly";
import type { ISourceOptions } from "@tsparticles/engine";
import { initParticlesEngine } from "@tsparticles/react";
import { useEffect, useMemo, useState } from "react";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import { useTheme } from "@/app/_providers/ThemeProvider";

const Particles = () => {
  const [isReady, setIsReady] = useState(false);
  const { particlesEnabled } = usePreferences();
  const { resolvedColorMode, resolvedPokemonTheme } = useTheme();

  useEffect(() => {
    if (particlesEnabled) {
      initParticlesEngine(async (engine) => {
        await loadFireflyPreset(engine);
        setIsReady(true);
      });
    }
  }, [particlesEnabled]);

  const particleColor = useMemo(() => {
    if (typeof window === "undefined") return "#A91D52";
    const root = document.documentElement;
    return (
      getComputedStyle(root).getPropertyValue("--primary").trim() || "#A91D52"
    );
  }, [resolvedColorMode, resolvedPokemonTheme]);

  const options = useMemo(
    () =>
      ({
        preset: "firefly",
        particles: {
          number: {
            value: 0,
          },
          color: {
            value: particleColor,
          },
          reduceDuplicates: true,
          size: {
            value: { min: 2, max: 4 },
          },
          opacity: {
            value: { min: 0, max: 1 },
            animation: {
              enable: true,
              speed: 1.2,
              sync: false,
              destroy: "min",
              startValue: "max",
            },
          },
          life: {
            count: 1,
            delay: {
              value: 0,
            },
            duration: {
              value: { min: 1, max: 1.8 },
            },
          },
          move: {
            enable: true,
            speed: { min: 0.6, max: 1.4 },
            direction: "none",
            random: true,
            straight: false,
            outModes: {
              default: "destroy",
            },
          },
        },
        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: "trail",
            },
          },
          modes: {
            trail: {
              delay: 0.2,
              quantity: 1,
              pauseOnStop: false,
            },
          },
        },
      } as unknown as ISourceOptions),
    [particleColor]
  );

  return (
    <>
      {particlesEnabled && isReady && (
        <div
          className="absolute inset-0"
          style={{ zIndex: 0, background: "transparent" }}
        >
          <ReactParticles
            id="tsparticles"
            options={options}
            className="w-full h-full"
          />
        </div>
      )}
    </>
  );
};

export default Particles;
