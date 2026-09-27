"use client";

import React, { useState } from "react";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { MatchStatus } from "@/lib/tournament/types";
import { StatusBadge } from "../ui/status-badge";
import { ValorantButton } from "../ui/valorant-button";
import { TacticalCard } from "../ui/tactical-card";
import {
  Activity,
  Play,
  Pause,
  CheckCircle2,
  PhoneCall,
  Monitor,
  ShieldAlert,
  Radio,
} from "lucide-react";
import { playMatchStart, playTechPause, playButtonClick } from "@/lib/sound/audio";

interface LiveMatchBoardProps {
  initialFixtures: ScheduledFixture[];
  tournamentId: string;
}

export function LiveMatchBoard({ initialFixtures, tournamentId }: LiveMatchBoardProps) {
  const [fixtures, setFixtures] = useState<ScheduledFixture[]>(initialFixtures);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const updateStatus = async (matchId: string, status: MatchStatus) => {
    setUpdatingId(matchId);
    if (status === "LIVE") {
      playMatchStart();
    } else if (status === "PAUSED") {
      playTechPause();
    } else {
      playButtonClick();
    }

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
      {/* Top Tactical Banner */}
      <TacticalCard
        telemetryTag="CONTROL_SECTOR // LIVE_MATCH_DESK"
        cornerColor="red"
        className="flex flex-wrap items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-display font-black text-valorant-ivory uppercase tracking-wider flex items-center gap-2.5">
            <Radio className="h-6 w-6 text-valorant-red animate-pulse" />
            Live Match Operations Desk
          </h2>
          <p className="text-xs font-mono text-valorant-slate mt-1">
            Simultaneous Station Execution • Real-time State Enforcement • Protocol 10 PCs
          </p>
        </div>

        <div className="flex items-center gap-2 bg-valorant-elevated px-3 py-1.5 border border-valorant-border">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-[11px] uppercase font-mono font-bold text-emerald-400 tracking-widest">
            LAN DECK SYNC ACTIVE
          </span>
        </div>
      </TacticalCard>

      {playableMatches.length === 0 ? (
        <TacticalCard cornerColor="slate" className="p-8 text-center text-valorant-slate">
          <Activity className="h-8 w-8 text-valorant-slate mx-auto mb-2 opacity-60" />
          <div className="text-base font-heading font-bold uppercase tracking-wider text-valorant-ivory">
            No Active Match Operations
          </div>
          <div className="text-xs font-mono text-valorant-slate mt-1">
            Fixtures have not been scheduled yet. Once matches are scheduled, live station controls will appear here.
          </div>
        </TacticalCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {playableMatches.map((m) => {
            const isUpdating = updatingId === m.matchId;
            const isLive = m.status === "LIVE";
            const isPaused = m.status === "PAUSED";

            return (
              <TacticalCard
                key={m.matchId}
                cornerColor={isLive ? "red" : isPaused ? "amber" : "slate"}
                className={`space-y-4 transition-all ${
                  isLive
                    ? "border-valorant-red shadow-lg shadow-valorant-red/15"
                    : isPaused
                    ? "border-amber-500/80 shadow-lg shadow-amber-500/10 val-hazard-bg"
                    : "border-valorant-border"
                }`}
              >
                {/* Header: Code & Status */}
                <div className="flex items-center justify-between border-b border-valorant-border/60 pb-2">
                  <span className="text-xs font-mono font-bold tracking-widest text-valorant-slate">
                    {m.matchCode} // {m.roundName}
                  </span>
                  <StatusBadge status={m.status} />
                </div>

                {/* Station Info Box */}
                <div className="bg-valorant-dark p-2.5 border border-valorant-border flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-valorant-red" />
                    <span className="font-heading font-bold text-valorant-ivory uppercase tracking-wider">
                      {m.stationName || "Station 1"}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-valorant-slate uppercase">
                    {m.labName || "Lab"}
                  </span>
                </div>

                {/* Team Lineups */}
                <div className="space-y-2 py-1">
                  <div className="bg-valorant-dark/80 px-3 py-2 border border-valorant-border/60 flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-valorant-ivory truncate uppercase tracking-wider">
                      {m.teamAName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-emerald-400">TEAM A</span>
                  </div>

                  <div className="text-[10px] font-mono text-valorant-slate tracking-widest text-center font-bold">
                    // VS //
                  </div>

                  <div className="bg-valorant-dark/80 px-3 py-2 border border-valorant-border/60 flex items-center justify-between">
                    <span className="font-heading font-bold text-sm text-valorant-ivory truncate uppercase tracking-wider">
                      {m.teamBName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-cyan-400">TEAM B</span>
                  </div>
                </div>

                {/* Interactive State Control Action Buttons */}
                <div className="pt-2 border-t border-valorant-border/60 space-y-2">
                  {m.status === "SCHEDULED" && (
                    <ValorantButton
                      variant="secondary"
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "CALLED")}
                      className="w-full"
                    >
                      <PhoneCall className="h-3.5 w-3.5 mr-1.5" />
                      Call Teams To Station
                    </ValorantButton>
                  )}

                  {m.status === "CALLED" && (
                    <ValorantButton
                      variant="primary"
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "READY")}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Confirm Teams Seated
                    </ValorantButton>
                  )}

                  {m.status === "READY" && (
                    <ValorantButton
                      variant="secondary"
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "LOBBY_READY")}
                      className="w-full border-purple-500/60 hover:bg-purple-900/40 text-purple-300"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Ready Custom Lobby
                    </ValorantButton>
                  )}

                  {m.status === "LOBBY_READY" && (
                    <ValorantButton
                      variant="primary"
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "LIVE")}
                      className="w-full text-base py-3"
                    >
                      <Play className="h-4 w-4 mr-1.5" />
                      Start Match (LIVE)
                    </ValorantButton>
                  )}

                  {m.status === "LIVE" && (
                    <div className="grid grid-cols-2 gap-2">
                      <ValorantButton
                        variant="amber"
                        disabled={isUpdating}
                        onClick={() => updateStatus(m.matchId, "PAUSED")}
                        className="w-full"
                      >
                        <Pause className="h-3.5 w-3.5 mr-1" />
                        Tech Pause
                      </ValorantButton>
                      <ValorantButton
                        variant="mint"
                        disabled={isUpdating}
                        onClick={() => updateStatus(m.matchId, "FINISHED")}
                        className="w-full"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Finish Match
                      </ValorantButton>
                    </div>
                  )}

                  {m.status === "PAUSED" && (
                    <ValorantButton
                      variant="mint"
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "LIVE")}
                      className="w-full"
                    >
                      <Play className="h-3.5 w-3.5 mr-1.5" />
                      Resume Match Play
                    </ValorantButton>
                  )}

                  {m.status === "FINISHED" && (
                    <ValorantButton
                      variant="amber"
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "RESULT_PENDING")}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Submit For Official Verification
                    </ValorantButton>
                  )}

                  {m.status === "RESULT_PENDING" && (
                    <ValorantButton
                      variant="mint"
                      disabled={isUpdating}
                      onClick={() => updateStatus(m.matchId, "VERIFIED")}
                      className="w-full"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      Verify Score & Advance
                    </ValorantButton>
                  )}

                  {m.status === "VERIFIED" && (
                    <div className="py-2.5 text-center text-xs font-mono font-bold text-emerald-400 flex items-center justify-center gap-1.5 bg-emerald-950/30 border border-emerald-500/20 uppercase tracking-widest">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Match Concluded & Verified
                    </div>
                  )}
                </div>
              </TacticalCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
