"use client";

import { useEffect, useRef, useState } from "react";
import PreviewStatus from "./PreviewStatus";
import { useFileBuffer } from "@/app/_hooks/useFileBuffer";
import { logger } from "@/app/_lib/logger";

interface SlidesViewerProps {
  fileUrl: string;
}

const SCOPE = "slides-viewer";
const VIEWPORT_RATIO = 0.7;

const SlidesViewer = ({ fileUrl }: SlidesViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { buffer, error: loadError } = useFileBuffer(fileUrl);
  const [renderError, setRenderError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!buffer || !container) return;

    let isActive = true;
    let destroy: (() => void) | null = null;

    const render = async () => {
      try {
        const { init } = await import("pptx-preview");
        if (!isActive) return;

        const previewer = init(container, {
          width: container.clientWidth,
          height: Math.round(window.innerHeight * VIEWPORT_RATIO),
          mode: "list",
        });
        destroy = () => previewer.destroy();

        await previewer.preview(buffer);
      } catch (err) {
        logger.error(SCOPE, "Failed to render slides", err);
        if (isActive) setRenderError("This presentation could not be previewed");
      }
    };

    render();

    return () => {
      isActive = false;
      destroy?.();
      container.replaceChildren();
    };
  }, [buffer]);

  const error = loadError || renderError;

  return (
    <>
      {(error || !buffer) && <PreviewStatus error={error} />}
      <div
        ref={containerRef}
        className={`w-full rounded-lg bg-surface-container ${error ? "hidden" : ""}`}
      />
    </>
  );
};

export default SlidesViewer;
