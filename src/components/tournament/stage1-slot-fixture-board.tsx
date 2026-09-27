"use client";

import React, { useState } from "react";
import {
  Stage1ScheduleResult,
  Stage1MatchSlot,
  Stage1MatchStatus,
} from "@/lib/scheduling/stage1-fixtures";
import {
  Calendar,
  Monitor,
  RefreshCw,
  PhoneCall,
  CheckCircle2,
  Play,
  Pause,
  ArrowRightLeft,
  Award,
  Clock,
  Info,
  X,
} from "lucide-react";
import { ValorantButton } from "../ui/valorant-button";
import { soundFX } from "@/lib/sound/audio";

interface Stage1SlotFixtureBoardProps {
  initialSchedule: Stage1ScheduleResult | null;
  tournamentId: string;
}

export function Stage1SlotFixtureBoard({
  initialSchedule,
  tournamentId,
}: Stage1SlotFixtureBoardProps) {
  const [schedule, setSchedule] = useState<Stage1ScheduleResult | null>(initialSchedule);
  const [selectedMatch, setSelectedMatch] = useState<Stage1MatchSlot | null>(null);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [scoreA, setScoreA] = useState(13);
  const [scoreB, setScoreB] = useState(9);
  const [isUpdating, setIsUpdating] = useState(false);

  // Swap modal state
  const [swapTargetMatchId, setSwapTargetMatchId] = useState<string>("");
  const [swapSlotA, setSwapSlotA] = useState<"TEAM_A" | "TEAM_B">("TEAM_A");
  const [swapSlotB, setSwapSlotB] = useState<"TEAM_A" | "TEAM_B">("TEAM_A");

  const playableMatches = schedule ? schedule.allMatches.filter((m) => !m.isUnused && !m.isBye) : [];

  const handleUpdateStatus = async (matchId: string, status: Stage1MatchStatus) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stage1/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "STATUS", status }),
      });
      const data = await res.json();
      if (data.success) {
        if (status === "Live") {
          soundFX.playMatchStart();
        } else if (status === "Paused") {
          soundFX.playTechPause();
        } else {
          soundFX.playClick();
        }
        setSchedule(data.data);
      }
    } catch (e) {
      console.error("Failed to update match status", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitScore = async () => {
    if (!selectedMatch) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stage1/${selectedMatch.matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "RESULT",
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundFX.playClick();
        setSchedule(data.data);
        setIsScoreModalOpen(false);
      }
    } catch (e) {
      console.error("Failed to submit score", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleForfeit = async (match: Stage1MatchSlot, forfeitTeamId: string) => {
    const reason = prompt("Enter forfeit reason (e.g. Grace period expired / No Show):", "Grace period expired / No show");
    if (!reason) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stage1/${match.matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "FORFEIT",
          forfeitTeamId,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundFX.playClick();
        setSchedule(data.data);
      }
    } catch (e) {
      console.error("Failed to process forfeit", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetByeTeam = async (byeTeamId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stage1/bye`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ byeTeamId }),
      });
      const data = await res.json();
      if (data.success) {
        soundFX.playClick();
        setSchedule(data.data);
      }
    } catch (e) {
      console.error("Failed to assign BYE team", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!selectedMatch || !swapTargetMatchId) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stage1/swap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchIdA: selectedMatch.matchId,
          slotA: swapSlotA,
          matchIdB: swapTargetMatchId,
          slotB: swapSlotB,
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundFX.playClick();
        setSchedule(data.data);
        setIsSwapModalOpen(false);
      }
    } catch (e) {
      console.error("Failed to swap teams", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: Stage1MatchStatus) => {
    switch (status) {
      case "Scheduled":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-blue-950/60 text-blue-300 border border-blue-500/30">SCHEDULED</span>;
      case "Teams Called":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-500/30 animate-pulse">TEAMS CALLED</span>;
      case "Waiting":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-yellow-950/60 text-yellow-300 border border-yellow-500/30">WAITING</span>;
      case "Ready":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">LOBBY READY</span>;
      case "Live":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-valorant-red text-valorant-ivory border border-valorant-red animate-pulse">● LIVE</span>;
      case "Paused":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-500/50">TECH PAUSE</span>;
      case "Completed":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-valorant-mint/10 text-valorant-mint border border-valorant-mint/40">VERIFIED</span>;
      case "Forfeit":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-600/40">FORFEIT / NO SHOW</span>;
      case "BYE":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-purple-950/60 text-purple-300 border border-purple-500/30">STAGE BYE</span>;
      case "UNUSED":
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-valorant-dark text-valorant-slate border border-valorant-border">UNUSED STATION</span>;
      default:
        return <span className="px-2 py-0.5 font-mono text-[10px] font-bold bg-valorant-dark text-valorant-slate">{status}</span>;
    }
  };

  if (!schedule || schedule.allMatches.length === 0) {
    return (
      <div className="bg-valorant-surface border border-valorant-border p-10 text-center space-y-4 val-chamfer">
        <div className="h-12 w-12 bg-valorant-dark border border-valorant-border flex items-center justify-center mx-auto text-valorant-slate val-chamfer-btn">
          <Calendar className="h-6 w-6 text-valorant-slate" />
        </div>
        <div>
          <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory">Stage 1 Fixtures Not Generated</h3>
          <p className="text-xs font-mono text-valorant-slate mt-1 max-w-md mx-auto">
            Stage 1 preliminary slots allocate physical match stations across AI Lab and Meta lab. Register teams to generate your schedule.
          </p>
        </div>
      </div>
    );
  }

  const teamsInSchedule = Array.from(
    new Map(
      schedule.allMatches
        .flatMap((m) => [m.teamA, m.teamB])
        .filter((t): t is NonNullable<typeof t> => Boolean(t))
        .concat(schedule.byeTeam ? [schedule.byeTeam] : [])
        .map((t) => [t.id, t])
    ).values()
  );

  return (
    <div className="space-y-6">
      {/* Infrastructure & Capacity Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        {/* AI Lab */}
        <div className="bg-valorant-surface border border-valorant-border p-4 flex items-center justify-between val-chamfer-btn">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-valorant-mint"></span>
              <h3 className="text-sm font-heading font-bold text-valorant-ivory uppercase">AI Lab</h3>
            </div>
            <div className="text-xs text-valorant-slate mt-1">
              <span className="font-bold text-valorant-ivory">30 Systems</span> • 3 Matches Capacity
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-valorant-mint bg-valorant-mint/10 px-2.5 py-1 border border-valorant-mint/30">
              3 Stations (M1, M2, M3)
            </span>
          </div>
        </div>

        {/* Meta lab */}
        <div className="bg-valorant-surface border border-valorant-border p-4 flex items-center justify-between val-chamfer-btn">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-valorant-cyan"></span>
              <h3 className="text-sm font-heading font-bold text-valorant-ivory uppercase">Meta lab</h3>
            </div>
            <div className="text-xs text-valorant-slate mt-1">
              <span className="font-bold text-valorant-ivory">10 Systems</span> • 1 Match Capacity
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-valorant-cyan bg-valorant-cyan/10 px-2.5 py-1 border border-valorant-cyan/30">
              1 Station (M1)
            </span>
          </div>
        </div>

        {/* Total Slot Capacity */}
        <div className="bg-valorant-surface border-2 border-valorant-red p-4 flex items-center justify-between val-chamfer-btn">
          <div>
            <div className="text-[10px] uppercase font-bold text-valorant-red tracking-wider">
              Total Capacity Per Slot
            </div>
            <div className="text-xl font-display uppercase tracking-wider text-valorant-ivory mt-0.5">
              4 Simultaneous Matches
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-valorant-ivory">
              40 Systems Total
            </span>
          </div>
        </div>
      </div>

      {/* Organizer Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-valorant-surface border border-valorant-border p-4 val-chamfer-btn">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs font-mono text-valorant-slate flex items-center gap-2">
            <Info className="h-4 w-4 text-valorant-red" />
            <span>
              Stage 1: <strong className="text-valorant-ivory">{schedule.totalTeams} Teams</strong> = {playableMatches.length} Matches {schedule.byeTeam ? "+ 1 BYE" : ""} across {schedule.slots.length} Time Slots.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono">
          {/* Change BYE assignment */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-valorant-slate uppercase">
              Assigned BYE:
            </label>
            <select
              value={schedule.byeTeam?.id || ""}
              onChange={(e) => handleSetByeTeam(e.target.value)}
              className="bg-valorant-dark border border-valorant-border px-3 py-1.5 text-xs text-valorant-ivory font-bold focus:border-valorant-red focus:outline-none"
            >
              {teamsInSchedule.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} (Seed #{t.seed})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Time Slots Display */}
      <div className="space-y-6">
        {schedule.slots.map((slot) => (
          <div
            key={slot.slotNumber}
            className="bg-valorant-surface border border-valorant-border overflow-hidden val-chamfer"
          >
            {/* Slot Header */}
            <div className="bg-valorant-dark px-6 py-4 border-b border-valorant-border flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 bg-valorant-red"></span>
                <h2 className="text-xl font-display uppercase tracking-wider text-valorant-ivory">{slot.name}</h2>
                <span className="text-xs text-valorant-slate font-mono">
                  {slot.activeMatches} Matches Active • {slot.byeCount} BYE • {slot.unusedCount} Unused
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-valorant-slate">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-valorant-slate" />
                  <span>Duration: 45 min match + 15 min buffer</span>
                </div>
              </div>
            </div>

            {/* Match Grid within Slot (Max 4 matches: 3 AI Lab, 1 Meta lab) */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {slot.matches.map((match) => {
                if (match.isUnused) {
                  return (
                    <div
                      key={match.matchId}
                      className="border border-dashed border-valorant-border bg-valorant-dark/40 p-4 flex flex-col justify-between opacity-60 hover:opacity-100 transition-opacity val-chamfer-btn"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-valorant-slate">
                          {match.labName} • {match.stationName}
                        </span>
                        {getStatusBadge("UNUSED")}
                      </div>
                      <div className="my-6 text-center text-xs font-mono text-valorant-slate">
                        Station Unoccupied
                        <div className="text-[10px] text-valorant-slate/80 mt-1">
                          Available for team warm-ups
                        </div>
                      </div>
                      <div className="text-[10px] font-mono text-valorant-slate text-center">
                        Hardware Ready (10 PCs)
                      </div>
                    </div>
                  );
                }

                if (match.isBye) {
                  return (
                    <div
                      key={match.matchId}
                      className="border border-purple-500/50 bg-purple-950/20 p-4 flex flex-col justify-between shadow-md val-chamfer-btn"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-purple-300">
                          {match.labName} • {match.stationName}
                        </span>
                        {getStatusBadge("BYE")}
                      </div>

                      <div className="my-5 text-center space-y-2">
                        <div className="text-base font-display uppercase tracking-wider text-valorant-ivory">
                          {match.teamA?.name}
                        </div>
                        <div className="text-xs text-purple-300 flex items-center justify-center gap-1 font-mono font-bold">
                          <Award className="h-3.5 w-3.5" />
                          Automatic Stage 1 BYE
                        </div>
                        <p className="text-[11px] font-mono text-valorant-slate">
                          Advances directly to the next stage without match play.
                        </p>
                      </div>

                      <div className="text-[10px] font-mono text-valorant-slate border-t border-purple-500/20 pt-2 text-center">
                        Seed #{match.teamA?.seed} • Official Roster Registered
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={match.matchId}
                    className={`border p-4 flex flex-col justify-between transition-all val-chamfer-btn ${
                      match.status === "Live"
                        ? "bg-valorant-surface border-2 border-valorant-red shadow-lg shadow-valorant-red/20"
                        : match.status === "Ready"
                        ? "bg-valorant-surface border-indigo-500/60"
                        : match.status === "Completed"
                        ? "bg-valorant-surface border-valorant-mint/50"
                        : "bg-valorant-surface border-valorant-border"
                    }`}
                  >
                    {/* Station & Status Header */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-valorant-red" />
                          <span className="text-[11px] font-mono font-bold text-valorant-slate">
                            {match.labName} — {match.stationName}
                          </span>
                        </div>
                        {getStatusBadge(match.status)}
                      </div>

                      {/* Teams & Score */}
                      <div className="mt-4 space-y-2 font-mono">
                        <div className="flex items-center justify-between bg-valorant-dark p-2.5 border-l-4 border-valorant-red border-y border-r border-valorant-border">
                          <div className="truncate font-heading font-bold text-valorant-ivory text-xs uppercase">
                            {match.teamA?.name}
                          </div>
                          {match.result && (
                            <span className="text-sm font-black text-valorant-ivory font-mono ml-2">
                              {match.result.teamAScore}
                            </span>
                          )}
                        </div>

                        <div className="text-center text-[10px] font-mono font-bold text-valorant-slate tracking-wider">
                          // VS //
                        </div>

                        <div className="flex items-center justify-between bg-valorant-dark p-2.5 border-l-4 border-valorant-cyan border-y border-r border-valorant-border">
                          <div className="truncate font-heading font-bold text-valorant-ivory text-xs uppercase">
                            {match.teamB?.name}
                          </div>
                          {match.result && (
                            <span className="text-sm font-black text-valorant-ivory font-mono ml-2">
                              {match.result.teamBScore}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Winner callout if finished */}
                      {match.result?.winnerId && (
                        <div className="mt-2 text-[11px] font-mono font-bold text-valorant-mint flex items-center justify-center gap-1 bg-valorant-mint/10 py-1 border border-valorant-mint/30">
                          <CheckCircle2 className="h-3 w-3" />
                          Winner: {match.result.winnerId === match.teamA?.id ? match.teamA?.name : match.teamB?.name}
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="mt-4 pt-3 border-t border-valorant-border space-y-1.5 font-mono">
                      {match.status === "Scheduled" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(match.matchId, "Teams Called")}
                            className="py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors val-chamfer-btn"
                          >
                            <PhoneCall className="h-3 w-3" />
                            Call
                          </button>
                          <button
                            onClick={() => {
                              soundFX.playClick();
                              setSelectedMatch(match);
                              setIsSwapModalOpen(true);
                            }}
                            className="py-1.5 px-2 bg-valorant-dark hover:bg-valorant-elevated text-valorant-ivory font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors border border-valorant-border val-chamfer-btn"
                          >
                            <ArrowRightLeft className="h-3 w-3" />
                            Swap
                          </button>
                        </div>
                      )}

                      {match.status === "Teams Called" && (
                        <div className="space-y-1.5">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(match.matchId, "Ready")}
                            className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors val-chamfer-btn"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Mark Both Ready
                          </button>
                          <div className="grid grid-cols-2 gap-1 text-[10px]">
                            <button
                              onClick={() => handleForfeit(match, match.teamA!.id)}
                              className="text-rose-400 hover:text-rose-300 hover:underline"
                            >
                              Forfeit {match.teamA?.name?.slice(0, 8)}
                            </button>
                            <button
                              onClick={() => handleForfeit(match, match.teamB!.id)}
                              className="text-rose-400 hover:text-rose-300 hover:underline text-right"
                            >
                              Forfeit {match.teamB?.name?.slice(0, 8)}
                            </button>
                          </div>
                        </div>
                      )}

                      {match.status === "Ready" && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(match.matchId, "Live")}
                          className="w-full py-2 bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory font-heading font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-md shadow-valorant-red/30 val-chamfer-btn"
                        >
                          <Play className="h-3.5 w-3.5" />
                          Start Match (Live)
                        </button>
                      )}

                      {match.status === "Live" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(match.matchId, "Paused")}
                            className="py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 val-chamfer-btn"
                          >
                            <Pause className="h-3 w-3" />
                            Pause
                          </button>
                          <button
                            onClick={() => {
                              soundFX.playClick();
                              setSelectedMatch(match);
                              setIsScoreModalOpen(true);
                            }}
                            className="py-1.5 bg-valorant-mint hover:bg-emerald-400 text-black font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 val-chamfer-btn"
                          >
                            Score
                          </button>
                        </div>
                      )}

                      {match.status === "Paused" && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(match.matchId, "Live")}
                          className="w-full py-1.5 bg-valorant-mint hover:bg-emerald-400 text-black font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 val-chamfer-btn"
                        >
                          <Play className="h-3 w-3" />
                          Resume Play
                        </button>
                      )}

                      {match.status === "Completed" && (
                        <button
                          onClick={() => {
                            soundFX.playClick();
                            setSelectedMatch(match);
                            setScoreA(match.result?.teamAScore || 13);
                            setScoreB(match.result?.teamBScore || 9);
                            setIsScoreModalOpen(true);
                          }}
                          className="w-full py-1 bg-valorant-dark hover:bg-valorant-elevated text-valorant-slate text-[10px] font-bold uppercase transition-colors border border-valorant-border val-chamfer-btn"
                        >
                          Edit Score
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Score Submission Modal */}
      {isScoreModalOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="bg-valorant-surface border-2 border-valorant-red max-w-md w-full p-6 space-y-4 val-chamfer shadow-2xl shadow-valorant-red/30">
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                <Award className="h-5 w-5 text-valorant-red" />
                Record Match Result
              </h3>
              <button
                onClick={() => setIsScoreModalOpen(false)}
                className="text-valorant-slate hover:text-valorant-ivory"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-valorant-slate">
              Input final map rounds for {selectedMatch.labName} — {selectedMatch.stationName}.
            </p>

            <div className="space-y-3 py-2 font-mono">
              <div className="flex items-center justify-between bg-valorant-dark p-3 border border-valorant-border">
                <span className="text-sm font-heading font-bold text-valorant-ivory uppercase">{selectedMatch.teamA?.name}</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={scoreA}
                  onChange={(e) => setScoreA(Number(e.target.value))}
                  className="w-16 bg-valorant-surface border border-valorant-border px-3 py-1.5 text-center text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between bg-valorant-dark p-3 border border-valorant-border">
                <span className="text-sm font-heading font-bold text-valorant-ivory uppercase">{selectedMatch.teamB?.name}</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={scoreB}
                  onChange={(e) => setScoreB(Number(e.target.value))}
                  className="w-16 bg-valorant-surface border border-valorant-border px-3 py-1.5 text-center text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-valorant-border">
              <button
                onClick={() => setIsScoreModalOpen(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory"
              >
                Cancel
              </button>
              <ValorantButton
                disabled={isUpdating || scoreA === scoreB}
                onClick={handleSubmitScore}
                variant="primary"
                size="sm"
              >
                Verify & Save Result
              </ValorantButton>
            </div>
          </div>
        </div>
      )}

      {/* Team Swap Override Modal */}
      {isSwapModalOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="bg-valorant-surface border-2 border-valorant-red max-w-md w-full p-6 space-y-4 val-chamfer shadow-2xl shadow-valorant-red/30">
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5 text-valorant-red" />
                Manual Fixture Override / Team Swap
              </h3>
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="text-valorant-slate hover:text-valorant-ivory"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-valorant-slate">
              Swap a team in {selectedMatch.labName} ({selectedMatch.stationName}) with another match.
            </p>

            <div className="space-y-3 py-2 text-xs font-mono">
              <div>
                <label className="block text-valorant-slate font-bold mb-1 uppercase">Source Team to Swap:</label>
                <select
                  value={swapSlotA}
                  onChange={(e) => setSwapSlotA(e.target.value as "TEAM_A" | "TEAM_B")}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-valorant-ivory font-bold focus:border-valorant-red focus:outline-none"
                >
                  <option value="TEAM_A">{selectedMatch.teamA?.name} (Team A)</option>
                  <option value="TEAM_B">{selectedMatch.teamB?.name} (Team B)</option>
                </select>
              </div>

              <div>
                <label className="block text-valorant-slate font-bold mb-1 uppercase">Target Match to Swap With:</label>
                <select
                  value={swapTargetMatchId}
                  onChange={(e) => setSwapTargetMatchId(e.target.value)}
                  className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-valorant-ivory font-bold focus:border-valorant-red focus:outline-none"
                >
                  <option value="">Select Match...</option>
                  {playableMatches
                    .filter((m) => m.matchId !== selectedMatch.matchId)
                    .map((m) => (
                      <option key={m.matchId} value={m.matchId}>
                        {m.timeSlotName} • {m.labName} {m.stationName} ({m.teamA?.name} vs {m.teamB?.name})
                      </option>
                    ))}
                </select>
              </div>

              {swapTargetMatchId && (
                <div>
                  <label className="block text-valorant-slate font-bold mb-1 uppercase">Target Team Slot:</label>
                  <select
                    value={swapSlotB}
                    onChange={(e) => setSwapSlotB(e.target.value as "TEAM_A" | "TEAM_B")}
                    className="w-full bg-valorant-dark border border-valorant-border px-3 py-2 text-valorant-ivory font-bold focus:border-valorant-red focus:outline-none"
                  >
                    <option value="TEAM_A">Team A</option>
                    <option value="TEAM_B">Team B</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-valorant-border">
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory"
              >
                Cancel
              </button>
              <ValorantButton
                disabled={isUpdating || !swapTargetMatchId}
                onClick={handleExecuteSwap}
                variant="primary"
                size="sm"
              >
                Execute Swap
              </ValorantButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
