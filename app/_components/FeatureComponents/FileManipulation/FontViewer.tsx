"use client";

import { useCallback, useEffect, useId, useState } from "react";
import PreviewStatus from "./PreviewStatus";
import { useFileParse } from "@/app/_hooks/useFileParse";
import { FONT_PREVIEW_SIZES } from "@/app/_lib/constants";
import { NERDY_QUOTES } from "@/app/_lib/font-quotes";

interface FontViewerProps {
  fileUrl: string;
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789";

const pickQuotes = (count: number): string[] =>
  [...NERDY_QUOTES].sort(() => Math.random() - 0.5).slice(0, count);

const FontViewer = ({ fileUrl }: FontViewerProps) => {
  const family = `preview-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const [quotes] = useState(() => pickQuotes(FONT_PREVIEW_SIZES.length));

  const loadFace = useCallback(
    async (buffer: ArrayBuffer): Promise<FontFace> => {
      const face = new FontFace(family, buffer);
      await face.load();
      document.fonts.add(face);
      return face;
    },
    [family]
  );

  const { result: face, error, isLoading } = useFileParse(fileUrl, loadFace);

  useEffect(() => {
    if (!face) return;
    return () => {
      document.fonts.delete(face);
    };
  }, [face]);

  if (isLoading || error || !face) {
    return <PreviewStatus error={error} />;
  }

  return (
    <div
      className="flex flex-col gap-6 rounded-lg bg-surface-container p-6 text-on-surface overflow-auto max-h-[70vh]"
      style={{ fontFamily: `"${family}"` }}
    >
      <p className="text-lg break-words">{GLYPHS}</p>
      {FONT_PREVIEW_SIZES.map((size, index) => (
        <div key={size} className="flex flex-col gap-1">
          <span className="text-xs text-on-surface-variant font-sans">
            {size}px
          </span>
          <p style={{ fontSize: size }} className="leading-tight break-words">
            {quotes[index]}
          </p>
        </div>
      ))}
    </div>
  );
};

export default FontViewer;
