"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import { useUploadOverlay } from "@/app/_providers/UploadOverlayProvider";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import ThemeSelector from "@/app/_components/GlobalComponents/Layout/ThemeSelector";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Particles from "@/app/_components/GlobalComponents/Layout/Particles";

export default function NotFound() {
  const { isDragging } = useUploadOverlay();
  const { wandCursorEnabled } = usePreferences();

  useEffect(() => {
    document.documentElement.setAttribute("data-is-not-found", "true");
    return () => {
      document.documentElement.removeAttribute("data-is-not-found");
    };
  }, []);

  return (
    <div
      className={`h-screen overflow-hidden transition-all duration-300 border-[3px] border-dashed ${
        isDragging ? "border-primary animate-pulse" : "border-outline"
      }`}
    >
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <ThemeSelector />
        <UserMenu />
      </div>

      <main
        className={`h-full bg-surface-container flex flex-col items-center justify-center px-4 relative overflow-hidden ${
          wandCursorEnabled ? "cursor-wand" : ""
        }`}
      >
        <Particles />

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
