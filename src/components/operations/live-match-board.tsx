"use client";

import React, { useState } from "react";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { MatchStatus } from "@/lib/tournament/types";
import { StatusBadge } from "../ui/status-badge";
import { Activity, Play, Pause, CheckCircle2, PhoneCall, Monitor, AlertCircle, ShieldAlert } from "lucide-react";

interface LiveMatchBoardProps {
  initialFixtures: ScheduledFixture[];
  tournamentId: string;
}

export function LiveMatchBoard({ initialFixtures, tournamentId }: LiveMatchBoardProps) {
  const [fixtures, setFixtures] = useState<ScheduledFixture[]>(initialFixtures);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = async (matchId: string, status: MatchStatus) => {
    setUpdatingId(matchId);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setFixtures((prev) =>
          prev.map((f) => (f.matchId === matchId ? { ...f, status } : f))
        );
      }
    } catch (e) {
      console.error("Failed to update status", e);
    } finally {
      setUpdatingId(null);
    }
  };

  const playableMatches = fixtures.filter((f) => !f.isBye);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17202a] border border-[#2b3844] rounded-lg p-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Activity className="h-6 w-6 text-[#ff4655]" />
            Live Match Control Desk
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Simultaneous station operations • One-touch match state control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs uppercase font-mono font-bold text-emerald-400">
            Operations Sync Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {playableMatches.map((m) => {
          const isUpdating = updatingId === m.matchId;

          return (
            <div
              key={m.matchId}
              className={`rounded-xl border p-4 space-y-4 transition-all ${
                m.status === "LIVE"
                  ? "bg-[#17202a] border-red-500 shadow-lg shadow-red-500/10"
                  : m.status === "PAUSED"
                  ? "bg-[#17202a] border-amber-500/80 shadow-lg shadow-amber-500/10"
                  : "bg-[#17202a] border-[#2b3844]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-gray-400">
                  {m.matchCode} • {m.roundName}
                </span>
                <StatusBadge status={m.status} />
              </div>

              {/* Station Info */}
              <div className="bg-[#0f1923] p-2.5 rounded-lg border border-[#2b3844] flex items-center gap-2 text-xs">
                <Monitor className="h-4 w-4 text-[#ff4655]" />
                <span className="font-bold text-white">{m.stationName || "Station Assigned"}</span>
                <span className="text-gray-500">({m.labName || "Lab"})</span>
              </div>

              {/* Teams */}
              <div className="space-y-1.5 py-1">
                <div className="text-sm font-bold text-white truncate flex items-center justify-between">
                  <span className="truncate">{m.teamAName}</span>
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-widest text-center font-bold">
                  VS
                </div>
                <div className="text-sm font-bold text-white truncate flex items-center justify-between">
                  <span className="truncate">{m.teamBName}</span>
                </div>
              </div>

              {/* Action Buttons based on status */}
              <div className="pt-2 border-t border-[#2b3844]/60 space-y-2">
                {m.status === "SCHEDULED" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(m.matchId, "CALLED")}
                    className="w-full py-2.5 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <PhoneCall className="h-3.5 w-3.5" />
                    Call Teams to Station
                  </button>
                )}

                {m.status === "CALLED" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(m.matchId, "READY")}
                    className="w-full py-2.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Mark Teams Seated & Ready
                  </button>
                )}

                {m.status === "READY" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(m.matchId, "LOBBY_READY")}
                    className="w-full py-2.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Configure Lobby (LOBBY READY)
                  </button>
                )}

                {m.status === "LOBBY_READY" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(m.matchId, "LIVE")}
                    className="w-full py-2.5 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors shadow-lg shadow-[#ff4655]/20"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Start Match (LIVE)
                  </button>
                )}

                {m.status === "LIVE" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "PAUSED")}
                      className="py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Pause className="h-3.5 w-3.5" />
                      Tech Pause
                    </button>
                    <button
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "FINISHED")}
                      className="py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Finish Match
                    </button>
                  </div>
                )}

                {m.status === "PAUSED" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(m.matchId, "LIVE")}
                    className="w-full py-2.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" />
                    Resume Match Play
                  </button>
                )}

                {m.status === "FINISHED" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(m.matchId, "RESULT_PENDING")}
                    className="w-full py-2.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Submit For Official Verification
                  </button>
                )}

                {m.status === "RESULT_PENDING" && (
                  <button
                    disabled={isUpdating}
                    onClick={() => updateStatus(m.matchId, "VERIFIED")}
                    className="w-full py-2.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verify Score & Advance
                  </button>
                )}

                {m.status === "VERIFIED" && (
                  <div className="py-2 text-center text-xs font-bold text-emerald-400 flex items-center justify-center gap-1 bg-emerald-950/30 rounded border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Match Concluded & Verified
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
