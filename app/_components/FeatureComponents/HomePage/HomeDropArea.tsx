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
import { useRouter } from "next/navigation";

export default function HomeDropArea() {
  const [isReady, setIsReady] = useState(false);
  const { isDragging } = useUploadOverlay();
  const { particlesEnabled, wandCursorEnabled } = usePreferences();
  const router = useRouter();

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
      <div className="text-center space-y-12 max-w-lg relative z-10">
        <div
          className="flex items-center justify-center"
          onClick={() => {
            router.push("/files");
          }}
        >
          <Logo
            className={`w-80 h-80 md:w-96 md:h-96 ${
              isDragging ? "loading-animation" : ""
            }`}
          />
        </div>

        <div className="space-y-6">
          <p className="text-xl md:text-2xl font-medium text-on-surface leading-relaxed px-4">
            Drop something{" "}
            <span className="text-on-surface-variant font-normal">or</span>{" "}
            <Link
              href="/files"
              className={`inline-flex items-center text-primary hover:text-primary/80 transition-colors font-medium decoration-2 underline-offset-4 decoration-primary/40 hover:decoration-primary/70 group ${
                wandCursorEnabled ? "cursor-wand" : ""
              }`}
            >
              <span className="underline">browse files</span>
              <span className="-translate-x-1 pl-1 group-hover:translate-x-0 transition-all opacity-0 group-hover:opacity-100">
                →
              </span>
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
