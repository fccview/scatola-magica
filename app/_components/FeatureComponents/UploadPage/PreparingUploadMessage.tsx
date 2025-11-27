import { useEffect, useState } from "react";

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
    <div className="flex items-center gap-2 py-2">
      <div className="relative w-5 h-5">
        <div className="absolute inset-0 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
      <span className="text-sm text-on-surface-variant animate-pulse">
        {currentMessage}
      </span>
    </div>
  );
}
