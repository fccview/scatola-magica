"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Particles from "@tsparticles/react";
import { loadFireflyPreset } from "@tsparticles/preset-firefly";
import type { ISourceOptions } from "@tsparticles/engine";
import { initParticlesEngine } from "@tsparticles/react";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import { useUploadOverlay } from "@/app/_providers/UploadOverlayProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import ThemeToggle from "@/app/_components/GlobalComponents/Layout/ThemeToggle";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";

export default function NotFound() {
  const [isReady, setIsReady] = useState(false);
  const { isDragging } = useUploadOverlay();
  const { particlesEnabled, wandCursorEnabled } = usePreferences();

  useEffect(() => {
    document.documentElement.setAttribute("data-is-not-found", "true");
    return () => {
      document.documentElement.removeAttribute("data-is-not-found");
    };
  }, []);

  useEffect(() => {
    if (particlesEnabled) {
      initParticlesEngine(async (engine) => {
        await loadFireflyPreset(engine);
        setIsReady(true);
      });
    }
  }, [particlesEnabled]);

  const options = useMemo(
    () =>
      ({
        preset: "firefly",
        particles: {
          number: {
            value: 0,
          },
          color: {
            value: "#A91D52",
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
    []
  );

  return (
    <div
      className={`h-screen overflow-hidden transition-all duration-300 border-[3px] border-dashed ${
        isDragging ? "border-primary animate-pulse" : "border-outline"
      }`}
    >
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <UserMenu />
      </div>

      <main
        className={`h-full bg-surface-container flex flex-col items-center justify-center px-4 relative overflow-hidden ${
          wandCursorEnabled ? "cursor-wand" : ""
        }`}
      >
        {particlesEnabled && isReady && (
          <div
            className="absolute inset-0"
            style={{ zIndex: 0, background: "transparent" }}
          >
            <Particles
              id="tsparticles"
              options={options}
              className="w-full h-full"
            />
          </div>
        )}

        <div className="text-center space-y-8 max-w-2xl relative z-10">
          <div className="flex items-center justify-center">
            <Logo
              className="w-64 h-64 md:w-80 md:h-80"
              hoverEffect={isDragging}
            />
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-6xl font-bold text-on-surface">
                404
              </h1>
              <p className="text-xl md:text-2xl font-medium text-on-surface leading-relaxed">
                This page doesn't exist
              </p>
            </div>

            <div className="space-y-2 pt-4">
              <p className="text-base md:text-lg text-on-surface leading-relaxed px-4">
                But don't worry! This is a{" "}
                <span className="text-primary font-semibold">magic box</span>{" "}
                after all.
              </p>
              <p className="text-sm md:text-base text-on-surface leading-relaxed px-4">
                Drag and drop your files anywhere and it'll still get uploaded.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
              <Link
                href="/files"
                className={wandCursorEnabled ? "cursor-wand" : ""}
              >
                <Button variant="filled" size="md">
                  <Icon icon="folder" size="md" />
                  <span>Browse Files</span>
                </Button>
              </Link>
              <Link href="/" className={wandCursorEnabled ? "cursor-wand" : ""}>
                <Button variant="outlined" size="md">
                  <Icon icon="home" size="md" />
                  <span>Go Home</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
