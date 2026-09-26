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
  AlertTriangle,
  ArrowRightLeft,
  Award,
  Clock,
  ShieldAlert,
  Info,
  Layers,
} from "lucide-react";

interface Stage1SlotFixtureBoardProps {
  initialSchedule: Stage1ScheduleResult;
  tournamentId: string;
}

export function Stage1SlotFixtureBoard({
  initialSchedule,
  tournamentId,
}: Stage1SlotFixtureBoardProps) {
  const [schedule, setSchedule] = useState<Stage1ScheduleResult>(initialSchedule);
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

  const playableMatches = schedule.allMatches.filter((m) => !m.isUnused && !m.isBye);

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
          forfeitingTeamId: forfeitTeamId,
          reason,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSchedule(data.data);
      }
    } catch (e) {
      console.error("Failed to record forfeit", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetByeTeam = async (teamId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stage1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "SET_BYE", teamId }),
      });
      const data = await res.json();
      if (data.success) {
        setSchedule(data.data);
      }
    } catch (e) {
      console.error("Failed to set bye team", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExecuteSwap = async () => {
    if (!selectedMatch || !swapTargetMatchId) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/stage1`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "SWAP",
          matchIdA: selectedMatch.matchId,
          slotA: swapSlotA,
          matchIdB: swapTargetMatchId,
          slotB: swapSlotB,
        }),
      });
      const data = await res.json();
      if (data.success) {
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
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-900/60 text-blue-300 border border-blue-500/30">Scheduled</span>;
      case "Teams Called":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-900/60 text-amber-300 border border-amber-500/30 animate-pulse">Teams Called</span>;
      case "Waiting":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-900/60 text-yellow-300 border border-yellow-500/30">Waiting</span>;
      case "Ready":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-900/60 text-indigo-300 border border-indigo-500/30">Ready</span>;
      case "Live":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-900/80 text-red-200 border border-red-500 animate-pulse">● LIVE</span>;
      case "Paused":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-900/60 text-orange-300 border border-orange-500/30">Paused</span>;
      case "Completed":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-500/30">Completed</span>;
      case "Forfeit":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-600/40">Forfeit / No Show</span>;
      case "BYE":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-900/60 text-purple-300 border border-purple-500/30">Stage BYE</span>;
      case "UNUSED":
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-400 border border-gray-700">Unused Station</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-800 text-gray-300">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Infrastructure & Capacity Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* AI Lab */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="text-sm font-black text-white">AI Lab</h3>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <span className="font-bold text-white">30 Systems</span> • 3 Matches Capacity
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/30">
              3 Stations (M1, M2, M3)
            </span>
          </div>
        </div>

        {/* Meta lab */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-400"></span>
              <h3 className="text-sm font-black text-white">Meta lab</h3>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              <span className="font-bold text-white">10 Systems</span> • 1 Match Capacity
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-blue-400 bg-blue-950/60 px-2.5 py-1 rounded border border-blue-500/30">
              1 Station (M1)
            </span>
          </div>
        </div>

        {/* Total Slot Capacity */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Total Capacity Per Slot
            </div>
            <div className="text-xl font-black text-white mt-0.5">
              4 Simultaneous Matches
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-gray-300">
              40 Systems Total
            </span>
          </div>
        </div>
      </div>

      {/* Organizer Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17202a] border border-[#2b3844] rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="text-xs text-gray-400 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#ff4655]" />
            <span>
              Stage 1: <strong className="text-white">13 Teams</strong> = 6 Matches + 1 BYE across 2 Time Slots.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Change BYE assignment */}
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-bold text-gray-400 uppercase">
              Assigned BYE:
            </label>
            <select
              value={schedule.byeTeam?.id || ""}
              onChange={(e) => handleSetByeTeam(e.target.value)}
              className="bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-xs text-white font-bold"
            >
              {official13TeamsDropdown.map((t) => (
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
            className="bg-[#17202a] border border-[#2b3844] rounded-xl overflow-hidden shadow-lg"
          >
            {/* Slot Header */}
            <div className="bg-[#0f1923] px-6 py-4 border-b border-[#2b3844] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-[#ff4655]"></span>
                <h2 className="text-lg font-black text-white">{slot.name}</h2>
                <span className="text-xs text-gray-400 font-mono">
                  {slot.activeMatches} Matches Active • {slot.byeCount} BYE • {slot.unusedCount} Unused
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-gray-300 font-mono">
                  <Clock className="h-3.5 w-3.5 text-gray-500" />
                  <span>Duration: 45 min match + 15 min buffer</span>
                </div>
              </div>
            </div>

            {/* Match Grid within Slot (Max 4 matches: 3 AI Lab, 1 Meta lab) */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {slot.matches.map((match) => {
                const isAILab = match.labName === "AI Lab";

                if (match.isUnused) {
                  return (
                    <div
                      key={match.matchId}
                      className="border border-dashed border-[#2b3844] bg-[#0f1923]/40 rounded-xl p-4 flex flex-col justify-between opacity-60 hover:opacity-100 transition-opacity"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-gray-500">
                          {match.labName} • {match.stationName}
                        </span>
                        {getStatusBadge("UNUSED")}
                      </div>
                      <div className="my-6 text-center text-xs text-gray-500">
                        Station Unoccupied
                        <div className="text-[10px] text-gray-600 mt-1">
                          Available for team warm-ups
                        </div>
                      </div>
                      <div className="text-[10px] text-gray-600 text-center">
                        Hardware Ready (10 PCs)
                      </div>
                    </div>
                  );
                }

                if (match.isBye) {
                  return (
                    <div
                      key={match.matchId}
                      className="border border-purple-500/50 bg-[#1e172a] rounded-xl p-4 flex flex-col justify-between shadow-md"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-purple-300">
                          {match.labName} • {match.stationName}
                        </span>
                        {getStatusBadge("BYE")}
                      </div>

                      <div className="my-5 text-center space-y-2">
                        <div className="text-base font-black text-white">
                          {match.teamA?.name}
                        </div>
                        <div className="text-xs text-purple-300 flex items-center justify-center gap-1 font-bold">
                          <Award className="h-3.5 w-3.5" />
                          Automatic Stage 1 BYE
                        </div>
                        <p className="text-[11px] text-gray-400">
                          Advances directly to the next stage without match play.
                        </p>
                      </div>

                      <div className="text-[10px] text-gray-400 border-t border-purple-500/20 pt-2 text-center">
                        Seed #{match.teamA?.seed} • Official Roster Registered
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={match.matchId}
                    className={`border rounded-xl p-4 flex flex-col justify-between transition-all ${
                      match.status === "Live"
                        ? "bg-[#17202a] border-red-500 shadow-lg shadow-red-500/10"
                        : match.status === "Ready"
                        ? "bg-[#17202a] border-indigo-500/60"
                        : match.status === "Completed"
                        ? "bg-[#17202a] border-emerald-500/40"
                        : "bg-[#17202a] border-[#2b3844]"
                    }`}
                  >
                    {/* Station & Status Header */}
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Monitor className="h-3.5 w-3.5 text-[#ff4655]" />
                          <span className="text-[11px] font-mono font-bold text-gray-300">
                            {match.labName} — {match.stationName}
                          </span>
                        </div>
                        {getStatusBadge(match.status)}
                      </div>

                      {/* Teams & Score */}
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between bg-[#0f1923] p-2.5 rounded-lg border border-[#2b3844]/60">
                          <div className="truncate font-bold text-white text-xs">
                            {match.teamA?.name}
                          </div>
                          {match.result && (
                            <span className="text-sm font-black text-white font-mono ml-2">
                              {match.result.teamAScore}
                            </span>
                          )}
                        </div>

                        <div className="text-center text-[10px] uppercase font-bold text-gray-500 tracking-wider">
                          VS
                        </div>

                        <div className="flex items-center justify-between bg-[#0f1923] p-2.5 rounded-lg border border-[#2b3844]/60">
                          <div className="truncate font-bold text-white text-xs">
                            {match.teamB?.name}
                          </div>
                          {match.result && (
                            <span className="text-sm font-black text-white font-mono ml-2">
                              {match.result.teamBScore}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Winner callout if finished */}
                      {match.result?.winnerId && (
                        <div className="mt-2 text-[11px] font-bold text-emerald-400 flex items-center justify-center gap-1 bg-emerald-950/40 py-1 rounded border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          Winner: {match.result.winnerId === match.teamA?.id ? match.teamA?.name : match.teamB?.name}
                        </div>
                      )}
                    </div>

                    {/* Action Controls */}
                    <div className="mt-4 pt-3 border-t border-[#2b3844]/60 space-y-1.5">
                      {match.status === "Scheduled" && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            disabled={isUpdating}
                            onClick={() => handleUpdateStatus(match.matchId, "Teams Called")}
                            className="py-1.5 px-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
                          >
                            <PhoneCall className="h-3 w-3" />
                            Call
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setIsSwapModalOpen(true);
                            }}
                            className="py-1.5 px-2 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
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
                            className="w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1 transition-colors"
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
                          className="w-full py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1 transition-colors shadow-md shadow-[#ff4655]/20"
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
                            className="py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1"
                          >
                            <Pause className="h-3 w-3" />
                            Pause
                          </button>
                          <button
                            onClick={() => {
                              setSelectedMatch(match);
                              setIsScoreModalOpen(true);
                            }}
                            className="py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1"
                          >
                            Score
                          </button>
                        </div>
                      )}

                      {match.status === "Paused" && (
                        <button
                          disabled={isUpdating}
                          onClick={() => handleUpdateStatus(match.matchId, "Live")}
                          className="w-full py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1"
                        >
                          <Play className="h-3 w-3" />
                          Resume Play
                        </button>
                      )}

                      {match.status === "Completed" && (
                        <button
                          onClick={() => {
                            setSelectedMatch(match);
                            setScoreA(match.result?.teamAScore || 13);
                            setScoreB(match.result?.teamBScore || 9);
                            setIsScoreModalOpen(true);
                          }}
                          className="w-full py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] font-bold uppercase transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-[#ff4655]" />
              Record Match Result
            </h3>
            <p className="text-xs text-gray-400">
              Input final map rounds for {selectedMatch.labName} — {selectedMatch.stationName}.
            </p>

            <div className="space-y-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{selectedMatch.teamA?.name}</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={scoreA}
                  onChange={(e) => setScoreA(Number(e.target.value))}
                  className="w-16 bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-center text-white font-mono font-bold"
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-white">{selectedMatch.teamB?.name}</span>
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={scoreB}
                  onChange={(e) => setScoreB(Number(e.target.value))}
                  className="w-16 bg-[#0f1923] border border-[#2b3844] rounded px-3 py-1.5 text-center text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b3844]">
              <button
                onClick={() => setIsScoreModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                disabled={isUpdating || scoreA === scoreB}
                onClick={handleSubmitScore}
                className="px-4 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-xs font-bold text-white disabled:opacity-50"
              >
                Verify & Save Result
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Swap Override Modal */}
      {isSwapModalOpen && selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-[#ff4655]" />
              Manual Fixture Override / Team Swap
            </h3>
            <p className="text-xs text-gray-400">
              Swap a team in {selectedMatch.labName} ({selectedMatch.stationName}) with another match.
            </p>

            <div className="space-y-3 py-2 text-xs">
              <div>
                <label className="block text-gray-400 font-bold mb-1">Source Team to Swap:</label>
                <select
                  value={swapSlotA}
                  onChange={(e) => setSwapSlotA(e.target.value as "TEAM_A" | "TEAM_B")}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-white font-bold"
                >
                  <option value="TEAM_A">{selectedMatch.teamA?.name} (Team A)</option>
                  <option value="TEAM_B">{selectedMatch.teamB?.name} (Team B)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-400 font-bold mb-1">Target Match to Swap With:</label>
                <select
                  value={swapTargetMatchId}
                  onChange={(e) => setSwapTargetMatchId(e.target.value)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-white font-bold"
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
                  <label className="block text-gray-400 font-bold mb-1">Target Team Slot:</label>
                  <select
                    value={swapSlotB}
                    onChange={(e) => setSwapSlotB(e.target.value as "TEAM_A" | "TEAM_B")}
                    className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-white font-bold"
                  >
                    <option value="TEAM_A">Team A</option>
                    <option value="TEAM_B">Team B</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b3844]">
              <button
                onClick={() => setIsSwapModalOpen(false)}
                className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                disabled={isUpdating || !swapTargetMatchId}
                onClick={handleExecuteSwap}
                className="px-4 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-xs font-bold text-white disabled:opacity-50"
              >
                Execute Swap
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const official13TeamsDropdown = [
  { id: "team-1", name: "XARAN", seed: 1 },
  { id: "team-2", name: "Muthusipi Orchestra", seed: 2 },
  { id: "team-3", name: "Eclipse", seed: 3 },
  { id: "team-4", name: "Tenzor", seed: 4 },
  { id: "team-5", name: "ESP (espada)", seed: 5 },
  { id: "team-6", name: "Error4O4", seed: 6 },
  { id: "team-7", name: "TEAM VORTEX", seed: 7 },
  { id: "team-8", name: "VALORANT NOOBS", seed: 8 },
  { id: "team-9", name: "Skull Krushers", seed: 9 },
  { id: "team-10", name: "x", seed: 10 },
  { id: "team-11", name: "Goodie Gang", seed: 11 },
  { id: "team-12", name: "TEAM EREN", seed: 12 },
  { id: "team-13", name: "Kawai", seed: 13 },
];
