"use client";

import { User } from "@/app/_types";

interface UserAvatarProps {
  user: Partial<User>;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  onClick?: () => void;
}

export default function UserAvatar({
  user,
  size = "md",
  className = "",
  onClick,
}: UserAvatarProps) {
  const sizeClasses = {
    sm: "w-6 h-6 text-xs",
    md: "w-8 h-8 text-sm",
    lg: "w-10 h-10 text-base",
    xl: "w-12 h-12 text-lg",
  };

  const avatarUrl = user.avatar ? `/api/avatar/${user.avatar}` : null;
  const initial = user.username?.charAt(0).toUpperCase() || "";

  return (
    <div
      className={`rounded-full flex items-center justify-center font-medium transition-all ${
        avatarUrl ? "bg-transparent" : "bg-primary text-on-primary"
      } ${sizeClasses[size]} ${className} ${
        onClick ? "cursor-pointer hover:scale-105" : ""
      }`}
      onClick={onClick}
      title={user.username}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={user.username}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
            const parent = e.currentTarget.parentElement;
            if (parent && !parent.textContent) {
              parent.textContent = initial;
              parent.className = parent.className.replace(
                "bg-transparent",
                "bg-primary text-on-primary"
              );
            }
          }}
        />
      ) : (
        initial
      )}
    </div>
  );
}
