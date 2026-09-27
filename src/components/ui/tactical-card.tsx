import React from "react";
import { cn } from "@/lib/utils";

export interface TacticalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  telemetryTag?: string;
  telemetry?: string;
  variant?: "red" | "mint" | "slate" | "gold" | "amber";
  cornerColor?: "red" | "mint" | "slate" | "gold" | "amber";
  withScanline?: boolean;
}

export function TacticalCard({
  children,
  className,
  title,
  telemetryTag,
  telemetry,
  variant,
  cornerColor = "red",
  withScanline = false,
  ...props
}: TacticalCardProps) {
  const activeColor = variant || cornerColor;
  const tagText = telemetry || telemetryTag;

  const cornerColorClasses: Record<string, string> = {
    red: "border-valorant-red",
    mint: "border-valorant-mint",
    slate: "border-valorant-slate",
    gold: "border-valorant-gold",
    amber: "border-amber-500",
  };

  const selectedCornerClass = cornerColorClasses[activeColor] || cornerColorClasses.red;

  return (
    <div
      className={cn(
        "relative bg-valorant-surface border border-valorant-border p-5 transition-all val-chamfer",
        withScanline && "val-scanline",
        className
      )}
      {...props}
    >
      {/* HUD Framing Corner Brackets */}
      <span
        className={cn(
          "absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2",
          selectedCornerClass
        )}
      />
      <span
        className={cn(
          "absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2",
          selectedCornerClass
        )}
      />
      <span
        className={cn(
          "absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2",
          selectedCornerClass
        )}
      />
      <span
        className={cn(
          "absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2",
          selectedCornerClass
        )}
      />

      {/* Header bar with optional Title and Telemetry */}
      {(title || tagText) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-valorant-border/60 pb-3 mb-4">
          {title ? (
            <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory">
              {title}
            </h3>
          ) : (
            <div />
          )}
          {tagText && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-widest text-valorant-slate uppercase">
              <span>{tagText}</span>
              <span className="text-valorant-red font-bold">+</span>
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
}
