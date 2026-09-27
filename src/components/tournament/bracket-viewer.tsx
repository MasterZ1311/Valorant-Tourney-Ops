"use client";

import React, { useState } from "react";
import { BracketStructure, BracketMatch } from "@/lib/tournament/types";
import { StatusBadge } from "../ui/status-badge";
import { ValorantButton } from "../ui/valorant-button";
import { TacticalCard } from "../ui/tactical-card";
import { Trophy, CheckCircle, RefreshCw, X, ShieldAlert } from "lucide-react";
import { soundFX } from "@/lib/sound/audio";

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
        soundFX.playMatchStart();
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
      <TacticalCard telemetry="BRACKET STATUS: UNINITIALIZED">
        <div className="p-10 text-center space-y-4">
          <div className="h-14 w-14 bg-valorant-surface border border-valorant-border flex items-center justify-center mx-auto text-valorant-slate val-chamfer-btn">
            <Trophy className="h-7 w-7 text-valorant-red" />
          </div>
          <div>
            <h3 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory">
              Knockout Bracket Tree Not Generated
            </h3>
            <p className="text-xs font-mono text-valorant-slate mt-1 max-w-md mx-auto">
              A single-elimination knockout tree requires at least 2 registered teams. Once you register teams in the Teams Desk, you can generate your bracket here.
            </p>
          </div>
          <div className="pt-2">
            <ValorantButton
              onClick={handleRegenerateBracket}
              disabled={isRegenerating}
              variant="primary"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
              Generate Bracket Tree
            </ValorantButton>
          </div>
        </div>
      </TacticalCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-valorant-surface border border-valorant-border p-4 val-chamfer-btn">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-valorant-red" />
            <h2 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory">
              Tournament Knockout Tree
            </h2>
          </div>
          <p className="text-xs font-mono text-valorant-slate mt-1">
            Single Elimination • {bracket.bracketSize} Bracket Slots • {bracket.totalRounds} Rounds • {bracket.totalBYEs} BYEs
          </p>
        </div>

        <ValorantButton
          onClick={handleRegenerateBracket}
          disabled={isRegenerating}
          variant="secondary"
          size="sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-2 ${isRegenerating ? "animate-spin" : ""}`} />
          Regenerate Bracket
        </ValorantButton>
      </div>

      {/* Bracket Tree Columns */}
      <div className="flex overflow-x-auto gap-8 pb-8 pt-2">
        {bracket.rounds.map((round) => (
          <div key={round.roundNumber} className="flex-none w-72 space-y-4">
            <div className="sticky top-0 bg-valorant-dark/95 backdrop-blur border-b-2 border-valorant-red pb-2 text-center">
              <span className="text-sm uppercase tracking-widest font-display text-valorant-red">
                {round.name}
              </span>
              <div className="text-[10px] font-mono text-valorant-slate">
                {round.matches.length} {round.matches.length === 1 ? "COMBAT FIXTURE" : "COMBAT FIXTURES"}
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
                    className={`bg-valorant-surface border p-3.5 transition-all relative val-chamfer-btn ${
                      match.isBye
                        ? "border-valorant-border/60 opacity-70"
                        : match.status === "LIVE"
                        ? "border-2 border-valorant-red shadow-lg shadow-valorant-red/20"
                        : "border-valorant-border hover:border-valorant-slate"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-valorant-border">
                      <span className="text-[11px] font-mono font-bold text-valorant-slate flex items-center gap-1.5">
                        <span className="text-valorant-red">◈</span>
                        {match.code}
                      </span>
                      <StatusBadge status={match.status} />
                    </div>

                    {/* Team A Slot */}
                    <div
                      className={`flex items-center justify-between p-2 text-xs transition-colors mb-1.5 font-mono ${
                        isWinnerA
                          ? "bg-valorant-mint/10 font-bold text-valorant-mint border-l-4 border-valorant-mint"
                          : "text-valorant-ivory bg-valorant-dark/80 border-l-4 border-valorant-border"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {match.teamA?.seed && (
                          <span className="text-[10px] text-valorant-slate">
                            #{match.teamA.seed}
                          </span>
                        )}
                        <span className="truncate font-heading font-bold uppercase">
                          {match.teamA?.name || (match.sourceMatchAId ? "TBD (Feeder)" : "BYE")}
                        </span>
                      </div>
                      {isWinnerA && <CheckCircle className="h-4 w-4 text-valorant-mint ml-1 flex-shrink-0" />}
                    </div>

                    {/* Team B Slot */}
                    <div
                      className={`flex items-center justify-between p-2 text-xs transition-colors font-mono ${
                        isWinnerB
                          ? "bg-valorant-mint/10 font-bold text-valorant-mint border-l-4 border-valorant-mint"
                          : "text-valorant-ivory bg-valorant-dark/80 border-l-4 border-valorant-border"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {match.teamB?.seed && (
                          <span className="text-[10px] text-valorant-slate">
                            #{match.teamB.seed}
                          </span>
                        )}
                        <span className="truncate font-heading font-bold uppercase">
                          {match.teamB?.name || (match.sourceMatchBId ? "TBD (Feeder)" : "BYE")}
                        </span>
                      </div>
                      {isWinnerB && <CheckCircle className="h-4 w-4 text-valorant-mint ml-1 flex-shrink-0" />}
                    </div>

                    {/* Quick Operator Verification Trigger */}
                    {canQuickVerify && (
                      <button
                        onClick={() => {
                          soundFX.playClick();
                          setSelectedMatch(match);
                        }}
                        className="w-full mt-2.5 py-1.5 text-[10px] font-heading font-bold text-valorant-ivory uppercase tracking-wider bg-valorant-elevated hover:bg-valorant-red transition-colors border border-valorant-border val-chamfer-btn"
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
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-valorant-surface border-2 border-valorant-red max-w-md w-full p-6 space-y-4 val-chamfer relative shadow-2xl shadow-valorant-red/30">
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <div>
                <div className="text-[10px] font-mono text-valorant-red uppercase tracking-widest font-bold">
                  MATCH OFFICIAL VERIFICATION // {selectedMatch.code}
                </div>
                <h3 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory mt-0.5">
                  Verify Result: {selectedMatch.code}
                </h3>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-valorant-slate hover:text-valorant-ivory transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-valorant-slate">
              Submit verified round score and advance the official winner to the next round.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between bg-valorant-dark p-3 border border-valorant-border">
                <span className="font-heading font-bold text-sm text-valorant-ivory uppercase">
                  {selectedMatch.teamA?.name}
                </span>
                <input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="w-16 bg-valorant-surface border border-valorant-border px-2 py-1 text-center font-mono font-bold text-valorant-ivory focus:border-valorant-red focus:outline-none"
                  min="0"
                  max="30"
                />
              </div>

              <div className="flex items-center justify-between bg-valorant-dark p-3 border border-valorant-border">
                <span className="font-heading font-bold text-sm text-valorant-ivory uppercase">
                  {selectedMatch.teamB?.name}
                </span>
                <input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="w-16 bg-valorant-surface border border-valorant-border px-2 py-1 text-center font-mono font-bold text-valorant-ivory focus:border-valorant-red focus:outline-none"
                  min="0"
                  max="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <ValorantButton
                disabled={isSubmitting}
                onClick={() => handleAdvanceWinner(selectedMatch, selectedMatch.teamA!.id)}
                variant="mint"
                size="sm"
              >
                Award {selectedMatch.teamA?.name}
              </ValorantButton>

              <ValorantButton
                disabled={isSubmitting}
                onClick={() => handleAdvanceWinner(selectedMatch, selectedMatch.teamB!.id)}
                variant="mint"
                size="sm"
              >
                Award {selectedMatch.teamB?.name}
              </ValorantButton>
            </div>

            <button
              onClick={() => setSelectedMatch(null)}
              className="w-full py-2 text-xs font-mono uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory transition-colors text-center"
            >
              Cancel Operation
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
