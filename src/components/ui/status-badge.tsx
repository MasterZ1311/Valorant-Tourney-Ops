import React from "react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  type?: "match" | "pc" | "tournament" | "team";
  className?: string;
}

export function StatusBadge({ status, type = "match", className }: StatusBadgeProps) {
  let badgeStyles = "bg-gray-800 text-gray-300 border-gray-700";

  switch (status) {
    case "LIVE":
      badgeStyles = "bg-red-500/20 text-red-400 border-red-500/40 animate-pulse font-bold";
      break;
    case "VERIFIED":
    case "AVAILABLE":
    case "CHECKED_IN":
    case "FINALIZED":
    case "COMPLETED":
      badgeStyles = "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
      break;
    case "READY":
    case "LOBBY_READY":
    case "ASSIGNED":
    case "IN_USE":
      badgeStyles = "bg-blue-500/20 text-blue-400 border-blue-500/40";
      break;
    case "PAUSED":
    case "MAINTENANCE":
    case "TECHNICAL_ISSUE":
    case "INCOMPLETE":
    case "RESULT_PENDING":
      badgeStyles = "bg-amber-500/20 text-amber-400 border-amber-500/40";
      break;
    case "OFFLINE":
    case "DISQUALIFIED":
    case "FORFEIT":
    case "CANCELLED":
    case "NO_SHOW":
      badgeStyles = "bg-rose-500/20 text-rose-400 border-rose-500/40";
      break;
    case "SCHEDULED":
    case "CALLED":
    case "REGISTERED":
    case "DRAFT":
      badgeStyles = "bg-zinc-800 text-zinc-300 border-zinc-700";
      break;
    default:
      badgeStyles = "bg-gray-800 text-gray-300 border-gray-700";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border",
        badgeStyles,
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
