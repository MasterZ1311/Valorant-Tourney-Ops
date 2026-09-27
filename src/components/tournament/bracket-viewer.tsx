"use client";

import React, { useState } from "react";
import { BracketStructure, BracketMatch } from "@/lib/tournament/types";
import { StatusBadge } from "../ui/status-badge";
import { Trophy, CheckCircle, RefreshCw } from "lucide-react";

interface BracketViewerProps {
  initialBracket: BracketStructure | null;
  tournamentId: string;
}

export function BracketViewer({ initialBracket, tournamentId }: BracketViewerProps) {
  const [bracket, setBracket] = useState<BracketStructure | null>(initialBracket);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [scoreA, setScoreA] = useState("13");
  const [scoreB, setScoreB] = useState("8");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegenerateBracket = async () => {
    if (!confirm("Are you sure you want to regenerate the bracket? This will reset match assignments.")) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "GENERATE" }),
      });
      const data = await res.json();
      if (data.success) {
        setBracket(data.data);
      }
    } catch (e) {
      console.error("Failed to regenerate bracket", e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleAdvanceWinner = async (match: BracketMatch, winnerId: string) => {
    setIsSubmitting(true);
    try {
      const sA = parseInt(scoreA) || 13;
      const sB = parseInt(scoreB) || 0;
      const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADVANCE",
          matchId: match.id,
          winnerId,
          scoreA: sA,
          scoreB: sB,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBracket(data.data);
        setSelectedMatch(null);
      }
    } catch (e) {
      console.error("Failed to advance winner", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!bracket || !bracket.rounds || bracket.rounds.length === 0) {
    return (
      <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-10 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-[#1f2731] border border-[#2b3844] flex items-center justify-center mx-auto text-gray-400">
          <Trophy className="h-6 w-6 text-gray-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Knockout Bracket Tree Not Generated</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            A single-elimination knockout tree requires at least 2 registered teams. Once you register teams in the Teams Desk, you can generate your bracket here.
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={handleRegenerateBracket}
            disabled={isRegenerating}
            className="px-4 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
            Generate Bracket Tree
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17202a] border border-[#2b3844] rounded-lg p-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="h-6 w-6 text-[#ff4655]" />
            Tournament Bracket Tree
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Single Elimination • {bracket.bracketSize} Bracket Slots • {bracket.totalRounds} Rounds • {bracket.totalBYEs} BYEs
          </p>
        </div>

        <button
          onClick={handleRegenerateBracket}
          disabled={isRegenerating}
          className="flex items-center gap-2 px-3.5 py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-bold uppercase tracking-wider transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRegenerating ? "animate-spin" : ""}`} />
          Regenerate Bracket
        </button>
      </div>

      {/* Bracket Tree Columns */}
      <div className="flex overflow-x-auto gap-8 pb-8 pt-2">
        {bracket.rounds.map((round) => (
          <div key={round.roundNumber} className="flex-none w-72 space-y-4">
            <div className="sticky top-0 bg-[#0f1923]/90 backdrop-blur border-b border-[#2b3844] pb-2 text-center">
              <span className="text-xs uppercase tracking-widest font-black text-[#ff4655]">
                {round.name}
              </span>
              <div className="text-[10px] text-gray-400">
                {round.matches.length} {round.matches.length === 1 ? "Match" : "Matches"}
              </div>
            </div>

            <div
              className="flex flex-col justify-around h-full space-y-4"
              style={{ minHeight: `${bracket.bracketSize * 45}px` }}
            >
              {round.matches.map((match) => {
                const isWinnerA = match.winnerId && match.teamA && match.winnerId === match.teamA.id;
                const isWinnerB = match.winnerId && match.teamB && match.winnerId === match.teamB.id;
                const canQuickVerify =
                  match.status !== "VERIFIED" && !match.isBye && match.teamA && match.teamB;

                return (
                  <div
                    key={match.id}
                    className={`bg-[#17202a] border rounded-lg p-3 transition-all relative ${
                      match.isBye
                        ? "border-[#2b3844]/60 opacity-75"
                        : match.status === "LIVE"
                        ? "border-red-500 shadow-lg shadow-red-500/10"
                        : "border-[#2b3844] hover:border-gray-500"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-[#2b3844]/60">
                      <span className="text-[11px] font-mono font-bold text-gray-400">
                        {match.code}
                      </span>
                      <StatusBadge status={match.status} />
                    </div>

                    {/* Team A Slot */}
                    <div
                      className={`flex items-center justify-between p-1.5 rounded text-xs transition-colors mb-1 ${
                        isWinnerA
                          ? "bg-emerald-950/60 font-bold text-emerald-300 border border-emerald-500/40"
                          : "text-gray-300 bg-[#0f1923]/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {match.teamA?.seed && (
                          <span className="text-[10px] font-mono text-gray-500">
                            #{match.teamA.seed}
                          </span>
                        )}
                        <span className="truncate">
                          {match.teamA?.name || (match.sourceMatchAId ? "TBD (Feeder)" : "BYE")}
                        </span>
                      </div>
                      {isWinnerA && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 ml-1" />}
                    </div>

                    {/* Team B Slot */}
                    <div
                      className={`flex items-center justify-between p-1.5 rounded text-xs transition-colors ${
                        isWinnerB
                          ? "bg-emerald-950/60 font-bold text-emerald-300 border border-emerald-500/40"
                          : "text-gray-300 bg-[#0f1923]/50"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {match.teamB?.seed && (
                          <span className="text-[10px] font-mono text-gray-500">
                            #{match.teamB.seed}
                          </span>
                        )}
                        <span className="truncate">
                          {match.teamB?.name || (match.sourceMatchBId ? "TBD (Feeder)" : "BYE")}
                        </span>
                      </div>
                      {isWinnerB && <CheckCircle className="h-3.5 w-3.5 text-emerald-400 ml-1" />}
                    </div>

                    {/* Quick Operator Verification Trigger */}
                    {canQuickVerify && (
                      <button
                        onClick={() => setSelectedMatch(match)}
                        className="w-full mt-2 py-1 text-[11px] font-bold text-white uppercase tracking-wider rounded bg-[#1f2731] hover:bg-[#ff4655] transition-colors border border-[#2b3844]"
                      >
                        Enter / Verify Score
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Score Modal */}
      {selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-black text-white">
              Verify Result: {selectedMatch.code}
            </h3>
            <p className="text-xs text-gray-400">
              Submit round score and advance the official winner to the next round.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between bg-[#0f1923] p-3 rounded border border-[#2b3844]">
                <span className="font-bold text-sm text-white">{selectedMatch.teamA?.name}</span>
                <input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="w-16 bg-[#1f2731] border border-[#2b3844] rounded px-2 py-1 text-center font-mono font-bold text-white"
                  min="0"
                  max="30"
                />
              </div>

              <div className="flex items-center justify-between bg-[#0f1923] p-3 rounded border border-[#2b3844]">
                <span className="font-bold text-sm text-white">{selectedMatch.teamB?.name}</span>
                <input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="w-16 bg-[#1f2731] border border-[#2b3844] rounded px-2 py-1 text-center font-mono font-bold text-white"
                  min="0"
                  max="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                disabled={isSubmitting}
                onClick={() => handleAdvanceWinner(selectedMatch, selectedMatch.teamA!.id)}
                className="py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                Award {selectedMatch.teamA?.name}
              </button>

              <button
                disabled={isSubmitting}
                onClick={() => handleAdvanceWinner(selectedMatch, selectedMatch.teamB!.id)}
                className="py-2.5 px-3 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider"
              >
                Award {selectedMatch.teamB?.name}
              </button>
            </div>

            <button
              onClick={() => setSelectedMatch(null)}
              className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
