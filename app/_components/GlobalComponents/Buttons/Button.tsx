import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "filled" | "outlined" | "text";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export default function Button({
  variant = "filled",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "rounded-lg font-normal transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none";

  const variantStyles = {
    filled: "bg-primary text-on-primary hover:bg-primary/90",
    outlined:
      "bg-sidebar-active text-on-surface hover:opacity-9 border border-dashed border-sidebar hover:border-primary",
    text: "text-primary hover:bg-primary/10",
  };

  const sizeStyles = {
    sm: "h-8 px-4 text-xs",
    md: "h-10 px-6 text-sm",
    lg: "h-12 px-8 text-base",
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
