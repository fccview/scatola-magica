import { HTMLAttributes } from "react";

interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  icon: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const sizeMap: Record<string, { fontSize: string; width: string; height: string }> = {
  xs: { fontSize: "16px", width: "16px", height: "16px" },
  sm: { fontSize: "20px", width: "20px", height: "20px" },
  md: { fontSize: "24px", width: "24px", height: "24px" },
  lg: { fontSize: "32px", width: "32px", height: "32px" },
  xl: { fontSize: "40px", width: "40px", height: "40px" },
  "2xl": { fontSize: "50px", width: "50px", height: "50px" },
  "3xl": { fontSize: "65px", width: "65px", height: "65px" },
};

export default function Icon({
  icon,
  size = "md",
  className = "",
  style,
  ...props
}: IconProps) {
  const sizeConfig = sizeMap[size] || sizeMap.md;

  const classes = `material-symbols-outlined leading-[0] inline-flex items-center justify-center ${className}`;
  const finalStyle = {
    fontSize: sizeConfig.fontSize,
    width: sizeConfig.width,
    height: sizeConfig.height,
    ...style
  };

  return (
    <span className={classes.trim()} style={finalStyle} {...props}>
      {icon}
    </span>
  );
}
