"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { playButtonClick } from "@/lib/sound/audio";

export interface ValorantButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "amber" | "mint" | "gold" | "danger" | "ghost";
  size?: "sm" | "md" | "lg" | "touch";
  withAudio?: boolean;
}

export const ValorantButton = React.forwardRef<HTMLButtonElement, ValorantButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      withAudio = true,
      onClick,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (withAudio && !disabled) {
        playButtonClick();
      }
      if (onClick) {
        onClick(e);
      }
    };

    const variantStyles = {
      primary:
        "bg-valorant-red hover:bg-valorant-redDark text-white shadow-lg shadow-valorant-red/20 active:translate-y-0.5",
      secondary:
        "bg-valorant-surface hover:bg-valorant-elevated text-valorant-ivory border border-valorant-border hover:border-valorant-red/60 active:translate-y-0.5",
      amber:
        "bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 active:translate-y-0.5",
      mint:
        "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 active:translate-y-0.5",
      gold:
        "bg-amber-500 hover:bg-amber-400 text-black font-black shadow-lg shadow-amber-500/20 active:translate-y-0.5",
      danger:
        "bg-red-800 hover:bg-red-700 text-white shadow-lg shadow-red-900/30 active:translate-y-0.5",
      ghost:
        "bg-transparent hover:bg-valorant-elevated text-valorant-slate hover:text-valorant-ivory",
    };

    const sizeStyles = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2.5 text-xs",
      lg: "px-6 py-3.5 text-sm",
      touch: "px-6 py-4 text-sm min-h-[52px]", // Field mobile marshal touch-optimized
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        onClick={handleClick}
        className={cn(
          "val-chamfer-btn relative inline-flex items-center justify-center font-heading font-bold uppercase tracking-widest transition-all duration-150 select-none",
          disabled && "opacity-45 cursor-not-allowed pointer-events-none grayscale",
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ValorantButton.displayName = "ValorantButton";
