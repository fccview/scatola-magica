"use client";

import { useEffect, useState } from "react";
import LottieAnimation from "@/app/_components/GlobalComponents/Layout/LottieAnimation";
import { ANIMATIONS } from "@/app/_lib/animations";

const PREPARING_MESSAGES = [
  "Chopping your chunks...",
  "Julienning your file...",
  "Slicing and dicing...",
  "Preparing the magic...",
  "Getting things ready...",
  "Almost there...",
  "Working on it...",
  "Setting things up...",
  "Preparing your upload...",
  "Getting organized...",
];

export default function PreparingUploadMessage() {
  const [currentMessage, setCurrentMessage] = useState(PREPARING_MESSAGES[0]);

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % PREPARING_MESSAGES.length;
      setCurrentMessage(PREPARING_MESSAGES[index]);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-12 h-5">
        <LottieAnimation
          animationUrl={ANIMATIONS.LOADING_DOTS}
          loop={true}
          autoplay={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
      <span className="text-sm text-on-surface-variant">
        {currentMessage}
      </span>
    </div>
  );
}
