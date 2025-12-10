"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "@/app/_providers/ThemeProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import { updateUserPreferences } from "@/app/_lib/preferences";
import { useRouter } from "next/navigation";
import { getKeyStatus } from "@/app/_server/actions/pgp";

const POKEMON_SIZE = 64;
const SPEED_BASE = 0.5;
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
  const { user, e2eEncryptionOnTransfer } = usePreferences();
  const router = useRouter();
  const [visualState, setVisualState] = useState<PokemonState>("IDLE");
  const [isHovered, setIsHovered] = useState(false);

  const elementRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef(-1);
  const targetRef = useRef(0);
  const timerRef = useRef(0);
  const frameRef = useRef<number>(0);
  const facingRef = useRef<"left" | "right">("right");


  const handleE2EToggle = async () => {
    if (!user?.username) return;
    const hasKey = await getKeyStatus().then((status) => status.hasKeys);
    if (!hasKey) {
      router.push("/settings");
    }

    await updateUserPreferences(user.username, {
      e2eEncryptionOnTransfer: !e2eEncryptionOnTransfer,
    });
    router.refresh();
  }

  const pokemon =
    resolvedPokemonTheme && resolvedPokemonTheme in POKEMON_THEMES
      ? POKEMON_THEMES[resolvedPokemonTheme as keyof typeof POKEMON_THEMES]
      : null;

  useEffect(() => {
    if (!pokemon) return;

    const windowWidth =
      typeof window !== "undefined" ? window.innerWidth : 1000;
    const maxX = windowWidth - POKEMON_SIZE;

    if (positionRef.current === -1) {
      positionRef.current = Math.random() * maxX;
    }

    const tick = () => {
      if (!elementRef.current) return;

      if (isHovered) {
        setVisualState("IDLE");
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const currentPos = positionRef.current;
      const targetPos = targetRef.current;

      const currentWindowWidth = window.innerWidth;
      const currentMaxX = currentWindowWidth - POKEMON_SIZE;

      if (Math.abs(currentPos - targetPos) > SPEED_BASE) {
        setVisualState((prev) => (prev !== "WALKING" ? "WALKING" : prev));

        const direction = targetPos > currentPos ? 1 : -1;
        positionRef.current += direction * SPEED_BASE;

        positionRef.current = Math.max(
          0,
          Math.min(positionRef.current, currentMaxX)
        );

        const newFacing = direction === 1 ? "right" : "left";
        facingRef.current = newFacing;
      } else {
        setVisualState((prev) => (prev !== "IDLE" ? "IDLE" : prev));

        if (timerRef.current === 0) {
          timerRef.current =
            now + (IDLE_MIN + Math.random() * (IDLE_MAX - IDLE_MIN));
        }

        if (now > timerRef.current) {
          timerRef.current = 0;

          let newTarget = Math.random() * currentMaxX;
          newTarget = Math.max(0, Math.min(newTarget, currentMaxX));

          targetRef.current = newTarget;
        }
      }

      if (elementRef.current) {
        elementRef.current.style.transform = `translateX(${positionRef.current
          }px) scaleX(${facingRef.current === "left" ? -1 : 1})`;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(frameRef.current);
  }, [pokemon, isHovered]);

  if (!pokemon) return null;

  return (
    <div
      ref={elementRef}
      className="fixed bottom-0 z-50 will-change-transform group cursor-pointer"
      style={{
        width: POKEMON_SIZE,
        height: POKEMON_SIZE,
        left: 0,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleE2EToggle}
    >
      <div className="absolute -top-2 left-[50%] -translate-x-1/2 group-hover:opacity-100 opacity-0 transition-opacity duration-300">
        <img className="w-6 h-6" style={{ imageRendering: "pixelated" }} src={`/pokemon/speech/${e2eEncryptionOnTransfer ? 'closed-lock' : 'open-lock'}.png`} />
      </div>
      <img
        src={visualState === "WALKING" ? pokemon.walk : pokemon.idle}
        alt={pokemon.name}
        className="w-full h-full object-contain"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
