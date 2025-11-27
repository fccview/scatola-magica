import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, "onClick"> {
  variant?: "elevated" | "filled" | "outlined";
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({
  variant = "elevated",
  children,
  className = "",
  onClick,
  ...rest
}: CardProps) {
  const baseStyles = "rounded-xl transition-all";

  const variantStyles = {
    elevated: "bg-surface",
    filled: "bg-surface-container",
    outlined: "border border-outline bg-surface",
  };

  const interactiveStyles = onClick ? "cursor-pointer" : "";

  return (
    <div
      className={`${baseStyles} ${variantStyles[variant]} ${interactiveStyles} ${className}`}
      onClick={onClick}
      {...rest}
    >
      {children}
    </div>
  );
}
