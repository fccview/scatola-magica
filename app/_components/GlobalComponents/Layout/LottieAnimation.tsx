"use client";

import { useEffect, useRef, useState, CSSProperties } from "react";
import Lottie, { LottieRefCurrentProps } from "lottie-react";

interface LottieAnimationProps {
  animationUrl: string;
  loop?: boolean;
  autoplay?: boolean;
  style?: CSSProperties;
  className?: string;
  speed?: number;
  onComplete?: () => void;
}

export default function LottieAnimation({
  animationUrl,
  loop = true,
  autoplay = true,
  style,
  className,
  speed = 1,
  onComplete,
}: LottieAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const [animationData, setAnimationData] = useState<any>(null);

  useEffect(() => {
    fetch(animationUrl)
      .then((response) => response.json())
      .then((data) => setAnimationData(data))
      .catch((error) => console.error("Error loading animation:", error));
  }, [animationUrl]);

  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed]);

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  if (!animationData) {
    return null;
  }

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={autoplay}
      style={style}
      className={className}
      onComplete={handleComplete}
    />
  );
}
