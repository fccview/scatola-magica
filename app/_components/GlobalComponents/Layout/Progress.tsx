interface ProgressProps {
  value: number;
  variant?: "linear" | "circular";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function Progress({
  value,
  variant = "linear",
  size = "md",
  className = "",
}: ProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value));

  if (variant === "circular") {
    const sizeMap = {
      sm: 32,
      md: 48,
      lg: 64,
    };
    const circleSize = sizeMap[size];
    const strokeWidth = circleSize / 8;
    const radius = (circleSize - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (clampedValue / 100) * circumference;

    return (
      <div className={`inline-block ${className}`}>
        <svg
          width={circleSize}
          height={circleSize}
          className="transform -rotate-90"
        >
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-surface-variant opacity-30"
          />
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="text-primary transition-all duration-300"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  }

  const heightMap = {
    sm: "h-1",
    md: "h-2",
    lg: "h-3",
  };

  return (
    <div
      className={`w-full bg-surface-variant rounded-full overflow-hidden ${heightMap[size]} ${className}`}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
