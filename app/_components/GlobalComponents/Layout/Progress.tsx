interface ProgressProps {
  value: number;
  variant?: "linear" | "circular";
  size?: "sm" | "md" | "lg";
  className?: string;
  indeterminate?: boolean;
  shimmer?: boolean;
}

export default function Progress({
  value,
  variant = "linear",
  size = "md",
  className = "",
  indeterminate = false,
  shimmer = false,
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

  if (indeterminate) {
    return (
      <div
        role="progressbar"
        aria-busy="true"
        className={`bar-busy w-full rounded-full ${heightMap[size]} ${className}`}
      />
    );
  }

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clampedValue)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full bg-surface-variant rounded-full overflow-hidden ${heightMap[size]} ${className}`}
    >
      <div
        className={`h-full bg-primary rounded-full transition-all duration-300 ease-out ${
          shimmer ? "fx-shimmer" : ""
        }`}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}
