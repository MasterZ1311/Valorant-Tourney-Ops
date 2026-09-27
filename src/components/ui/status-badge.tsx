import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "match" | "pc" | "tournament" | "team";
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  let badgeStyles = "bg-valorant-elevated text-valorant-slate border-valorant-border";
  let dotColor = "bg-valorant-slate";
  let isPulsing = false;

  switch (status) {
    case "LIVE":
      badgeStyles =
        "bg-valorant-red/15 text-valorant-red border-valorant-red shadow-sm shadow-valorant-red/30 font-bold";
      dotColor = "bg-valorant-red";
      isPulsing = true;
      break;
    case "LOBBY_READY":
      badgeStyles = "bg-purple-950/40 text-purple-400 border-purple-500/50";
      dotColor = "bg-purple-400";
      isPulsing = true;
      break;
    case "READY":
      badgeStyles = "bg-indigo-950/40 text-indigo-400 border-indigo-500/40";
      dotColor = "bg-indigo-400";
      break;
    case "CALLED":
      badgeStyles = "bg-cyan-950/40 text-cyan-400 border-cyan-500/40";
      dotColor = "bg-cyan-400";
      isPulsing = true;
      break;
    case "VERIFIED":
    case "AVAILABLE":
    case "CHECKED_IN":
    case "FINALIZED":
    case "COMPLETED":
      badgeStyles = "bg-emerald-950/40 text-emerald-400 border-emerald-500/40";
      dotColor = "bg-emerald-400";
      break;
    case "PAUSED":
    case "MAINTENANCE":
    case "TECHNICAL_ISSUE":
    case "INCOMPLETE":
    case "RESULT_PENDING":
      badgeStyles = "bg-amber-950/40 text-amber-400 border-amber-500/50";
      dotColor = "bg-amber-400";
      isPulsing = true;
      break;
    case "OFFLINE":
    case "DISQUALIFIED":
    case "FORFEIT":
    case "CANCELLED":
    case "NO_SHOW":
      badgeStyles = "bg-red-950/40 text-rose-400 border-rose-600/40 line-through";
      dotColor = "bg-rose-500";
      break;
    case "SCHEDULED":
    case "REGISTERED":
    case "DRAFT":
      badgeStyles = "bg-valorant-elevated text-valorant-slate border-valorant-border";
      dotColor = "bg-valorant-slate";
      break;
    default:
      badgeStyles = "bg-valorant-elevated text-valorant-slate border-valorant-border";
      dotColor = "bg-valorant-slate";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-widest border transition-all select-none",
        badgeStyles,
        className
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full inline-block",
          dotColor,
          isPulsing && "animate-ping"
        )}
      />
      <span>{status.replace(/_/g, " ")}</span>
    </span>
  );
}
