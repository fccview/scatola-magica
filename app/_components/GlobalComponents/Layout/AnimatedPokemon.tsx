"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/_providers/ThemeProvider";

const POKEMON_SIZE = 64;
const SPEED_BASE = 0.5; // Lowered speed for a more natural walk
const IDLE_MIN = 2000;
const IDLE_MAX = 5000;

const POKEMON_THEMES = {
  pikachu: {
    name: "Pikachu",
    walk: "/pokemon/animations/pikachu/walk.gif",
    idle: "/pokemon/animations/pikachu/idle.gif",
  },
  bulbasaur: {
    name: "Bulbasaur",
    walk: "/pokemon/animations/bulbasaur/walk.gif",
    idle: "/pokemon/animations/bulbasaur/idle.gif",
  },
  charmander: {
    name: "Charmander",
    walk: "/pokemon/animations/charmander/walk.gif",
    idle: "/pokemon/animations/charmander/idle.gif",
  },
  squirtle: {
    name: "Squirtle",
    walk: "/pokemon/animations/squirtle/walk.gif",
    idle: "/pokemon/animations/squirtle/idle.gif",
  },
  gengar: {
    name: "Gengar",
    walk: "/pokemon/animations/gengar/walk.gif",
    idle: "/pokemon/animations/gengar/idle.gif",
  },
} as const;

type PokemonState = "IDLE" | "WALKING";

export default function AnimatedPokemon() {
  const { resolvedPokemonTheme } = useTheme();

  // Only use State for things that actually need to re-render the DOM (changing the image source)
  const [visualState, setVisualState] = useState<PokemonState>("IDLE");

  // Use Refs for everything related to the high-frequency game loop
  const elementRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(-1); // Start at -1 to indicate uninitialized
  const targetRef = useRef(0);
  const timerRef = useRef(0);
  const frameRef = useRef<number>(0);
  const facingRef = useRef<"left" | "right">("right"); // Moved from State to Ref to prevent re-renders

  const pokemon =
    resolvedPokemonTheme && resolvedPokemonTheme in POKEMON_THEMES
      ? POKEMON_THEMES[resolvedPokemonTheme as keyof typeof POKEMON_THEMES]
      : null;

  useEffect(() => {
    if (!pokemon) return;

    // 1. Initialize Position (Only if not already set)
    // We check if it's -1 so we don't reset position if the component re-renders for other reasons
    const windowWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    const maxX = windowWidth - POKEMON_SIZE;

    if (positionRef.current === -1) {
      positionRef.current = Math.random() * maxX;
    }

    // 2. The Game Loop
    const tick = () => {
      if (!elementRef.current) return;

      const now = Date.now();
      const currentPos = positionRef.current;
      const targetPos = targetRef.current;

      // We recalculate window boundaries every frame in case user resized window
      const currentWindowWidth = window.innerWidth;
      const currentMaxX = currentWindowWidth - POKEMON_SIZE;

      // --- LOGIC: WALKING ---
      if (Math.abs(currentPos - targetPos) > SPEED_BASE) {
        // Switch image to Walk
        setVisualState((prev) => (prev !== "WALKING" ? "WALKING" : prev));

        // Calculate movement
        const direction = targetPos > currentPos ? 1 : -1;
        positionRef.current += direction * SPEED_BASE;

        // Clamp to screen
        positionRef.current = Math.max(
          0,
          Math.min(positionRef.current, currentMaxX)
        );

        // Update Facing Direction (Ref only, no re-render)
        const newFacing = direction === 1 ? "right" : "left";
        facingRef.current = newFacing;
      } else {
        // --- LOGIC: IDLE ---
        // Switch image to Idle
        setVisualState((prev) => (prev !== "IDLE" ? "IDLE" : prev));

        // Start Idle Timer if not running
        if (timerRef.current === 0) {
          timerRef.current =
            now + (IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN));
        }

        // Timer finished? Pick new target
        if (now > timerRef.current) {
          timerRef.current = 0; // Reset timer

          let newTarget = Math.random() * currentMaxX;
          newTarget = Math.max(0, Math.min(newTarget, currentMaxX));

          targetRef.current = newTarget;
        }
      }

      // 3. RENDER (Direct DOM manipulation for performance)
      if (elementRef.current) {
        // We read facingRef.current here immediately
        elementRef.current.style.transform = `translateX(${
          positionRef.current
        }px) scaleX(${facingRef.current === "left" ? -1 : 1})`;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [pokemon]); // Dependency array is now ONLY pokemon.

  if (!pokemon) return null;

  return (
    <div
      ref={elementRef}
      className="fixed bottom-0 z-40 pointer-events-none will-change-transform"
      style={{
        width: POKEMON_SIZE,
        height: POKEMON_SIZE,
        left: 0,
      }}
    >
      <img
        src={visualState === "WALKING" ? pokemon.walk : pokemon.idle}
        alt={pokemon.name}
        className="w-full h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
