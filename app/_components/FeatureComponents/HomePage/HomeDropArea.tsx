"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import { useUploadOverlay } from "@/app/_providers/UploadOverlayProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import { useRouter } from "next/navigation";
import Particles from "@/app/_components/GlobalComponents/Layout/Particles";

export default function HomeDropArea() {
  const { isDragging } = useUploadOverlay();
  const { wandCursorEnabled } = usePreferences();
  const router = useRouter();

  return (
    <main
      className={`h-full bg-surface-container flex flex-col items-center justify-center px-4 relative overflow-hidden ${
        wandCursorEnabled ? "cursor-wand" : ""
      }`}
    >
      <Particles />
      <div className="text-center space-y-12 max-w-lg relative z-10">
        <div
          className="flex items-center justify-center"
          onClick={() => {
            router.push("/files");
          }}
        >
          <Logo
            className="w-80 h-80 md:w-96 md:h-96"
            hoverEffect={isDragging}
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
