"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  IPLPlayoffStructure,
  IPLPlayoffMatch,
} from "@/lib/tournament/ipl-playoffs";
import {
  Trophy,
  Award,
  Medal,
  RotateCcw,
  Sparkles,
  AlertCircle,
  X,
} from "lucide-react";
import { TacticalCard } from "../ui/tactical-card";
import { ValorantButton } from "../ui/valorant-button";
import { soundFX } from "@/lib/sound/audio";

interface IPLPlayoffBracketProps {
  initialPlayoffs: IPLPlayoffStructure | null;
  tournamentId: string;
}

export function IPLPlayoffBracket({
  initialPlayoffs,
  tournamentId,
}: IPLPlayoffBracketProps) {
  const [playoffs, setPlayoffs] = useState<IPLPlayoffStructure | null>(initialPlayoffs);
  const [mounted, setMounted] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<IPLPlayoffMatch | null>(null);
  const [scoreA, setScoreA] = useState(13);
  const [scoreB, setScoreB] = useState(9);
  const [winnerId, setWinnerId] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleRecordResult = async (matchCode: "Q1" | "EL" | "Q2" | "GF") => {
    if (!winnerId) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/ipl`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchCode,
          winnerId,
          scoreA: Number(scoreA),
          scoreB: Number(scoreB),
        }),
      });
      const data = await res.json();
      if (data.success) {
        soundFX.playMatchStart();
        setPlayoffs(data.data);
        setSelectedMatch(null);
      }
    } catch (e) {
      console.error("Failed to record IPL playoff result", e);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetPlayoffs = async () => {
    if (!confirm("Reset IPL Playoff matches to initial state?")) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/ipl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setPlayoffs(data.data);
      }
    } catch (e) {
      console.error("Failed to reset IPL playoffs", e);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!playoffs || !playoffs.matches) {
    return (
      <TacticalCard telemetry="PLAYOFF SEED STATUS: UNINITIALIZED">
        <div className="p-10 text-center space-y-4">
          <div className="h-14 w-14 bg-valorant-surface border border-valorant-gold/40 flex items-center justify-center mx-auto text-valorant-gold val-chamfer-btn">
            <Trophy className="h-7 w-7 text-valorant-gold" />
          </div>
          <div>
            <h3 className="text-2xl font-display uppercase tracking-wider text-valorant-ivory">
              IPL Playoffs Not Seeded Yet
            </h3>
            <p className="text-xs font-mono text-valorant-slate mt-1 max-w-md mx-auto">
              The IPL Playoff structure requires at least 2 qualified teams. Complete preliminary matches or register teams to seed the championship podium.
            </p>
          </div>
        </div>
      </TacticalCard>
    );
  }

  const { q1, eliminator, q2, grandFinal } = playoffs.matches;
  const { rankings } = playoffs;

  return (
    <div className="space-y-8">
      {/* IPL Format Header & Prize Podium */}
      <TacticalCard
        title="Championship & 3-Place Prize Decider"
        telemetry="PAGE PLAYOFF SYSTEM // VCT STANDARD"
        variant="gold"
      >
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-valorant-gold/10 text-valorant-gold border border-valorant-gold/30">
                  IPL / Page Playoff System
                </span>
                <span className="text-xs font-mono text-valorant-slate">
                  Top 4 qualification guaranteeing verified 1st, 2nd, and 3rd rank places
                </span>
              </div>
            </div>

            <ValorantButton
              onClick={handleResetPlayoffs}
              disabled={isUpdating}
              variant="secondary"
              size="sm"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              Reset Playoff Tree
            </ValorantButton>
          </div>

          {/* Prize Podium Showcase */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-valorant-border">
            {/* 1st Place */}
            <div className="bg-gradient-to-b from-valorant-gold/20 to-valorant-dark border-2 border-valorant-gold/60 p-4 text-center relative overflow-hidden val-chamfer-btn">
              <div className="text-[10px] uppercase font-mono tracking-widest font-black text-valorant-gold flex items-center justify-center gap-1.5">
                <Trophy className="h-4 w-4" /> 1ST PLACE (GOLD)
              </div>
              <div className="text-xl font-display uppercase tracking-wider text-valorant-ivory mt-2 truncate">
                {rankings.firstPlace?.name || "TBD (Grand Final Winner)"}
              </div>
              <div className="text-[10px] font-mono text-valorant-gold/90 mt-1 uppercase">
                Tournament Champion
              </div>
            </div>

            {/* 2nd Place */}
            <div className="bg-gradient-to-b from-slate-600/20 to-valorant-dark border-2 border-slate-400/60 p-4 text-center relative overflow-hidden val-chamfer-btn">
              <div className="text-[10px] uppercase font-mono tracking-widest font-black text-slate-300 flex items-center justify-center gap-1.5">
                <Medal className="h-4 w-4" /> 2ND PLACE (SILVER)
              </div>
              <div className="text-xl font-display uppercase tracking-wider text-valorant-ivory mt-2 truncate">
                {rankings.secondPlace?.name || "TBD (Grand Final Runner-Up)"}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-1 uppercase">
                Official Runner-Up
              </div>
            </div>

            {/* 3rd Place */}
            <div className="bg-gradient-to-b from-amber-800/20 to-valorant-dark border-2 border-amber-700/60 p-4 text-center relative overflow-hidden val-chamfer-btn">
              <div className="text-[10px] uppercase font-mono tracking-widest font-black text-amber-500 flex items-center justify-center gap-1.5">
                <Award className="h-4 w-4" /> 3RD PLACE (BRONZE)
              </div>
              <div className="text-xl font-display uppercase tracking-wider text-valorant-ivory mt-2 truncate">
                {rankings.thirdPlace?.name || "TBD (Loser Qualifier 2)"}
              </div>
              <div className="text-[10px] font-mono text-amber-500 mt-1 uppercase">
                Bronze Decided in Q2
              </div>
            </div>

            {/* 4th Place */}
            <div className="bg-valorant-dark border border-valorant-border p-4 text-center val-chamfer-btn">
              <div className="text-[10px] uppercase font-mono tracking-widest font-black text-valorant-slate flex items-center justify-center gap-1">
                4TH PLACE
              </div>
              <div className="text-xl font-display uppercase tracking-wider text-valorant-ivory mt-2 truncate">
                {rankings.fourthPlace?.name || "TBD (Loser Eliminator)"}
              </div>
              <div className="text-[10px] font-mono text-valorant-slate mt-1 uppercase">
                Eliminated in Match 2
              </div>
            </div>
          </div>
        </div>
      </TacticalCard>

      {/* Visual IPL Bracket Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Column 1: Qualifier 1 & Eliminator */}
        <div className="space-y-6">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-valorant-slate flex items-center gap-2">
            <span className="text-valorant-red">◈</span> PLAYOFF ROUND 1
          </div>

          {/* Qualifier 1 Card */}
          <div
            className={`bg-valorant-surface border p-4 space-y-3 transition-all val-chamfer-btn ${
              q1.status === "VERIFIED"
                ? "border-2 border-valorant-mint/60"
                : "border-valorant-border hover:border-valorant-gold/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-valorant-gold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" /> Qualifier 1 (Q1)
              </span>
              <span className="text-[10px] px-2 py-0.5 font-mono font-bold bg-valorant-dark text-valorant-slate border border-valorant-border">
                {q1.status}
              </span>
            </div>
            <p className="text-[11px] font-mono text-valorant-slate">
              Winner goes to <strong className="text-valorant-mint">Grand Final</strong>, Loser to <strong className="text-valorant-gold">Qualifier 2</strong>.
            </p>

            <div className="space-y-1.5 pt-1 font-mono text-xs">
              <div
                className={`p-2 flex items-center justify-between ${
                  q1.winnerId === q1.teamA?.id ? "bg-valorant-mint/10 text-valorant-mint border-l-4 border-valorant-mint font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <span className="truncate font-heading uppercase">{q1.teamA?.name} (Rank 1)</span>
                <span className="font-mono ml-2 font-bold">{q1.scoreA ?? "—"}</span>
              </div>
              <div
                className={`p-2 flex items-center justify-between ${
                  q1.winnerId === q1.teamB?.id ? "bg-valorant-mint/10 text-valorant-mint border-l-4 border-valorant-mint font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <span className="truncate font-heading uppercase">{q1.teamB?.name} (Rank 2)</span>
                <span className="font-mono ml-2 font-bold">{q1.scoreB ?? "—"}</span>
              </div>
            </div>

            <ValorantButton
              onClick={() => {
                soundFX.playClick();
                setSelectedMatch(q1);
                setScoreA(q1.scoreA || 13);
                setScoreB(q1.scoreB || 9);
                setWinnerId(q1.teamA?.id || "");
              }}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {q1.status === "VERIFIED" ? "Edit Q1 Score" : "Record Q1 Result"}
            </ValorantButton>
          </div>

          {/* Eliminator Card */}
          <div
            className={`bg-valorant-surface border p-4 space-y-3 transition-all val-chamfer-btn ${
              eliminator.status === "VERIFIED"
                ? "border-2 border-valorant-mint/60"
                : "border-valorant-border hover:border-valorant-red/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-heading font-bold text-valorant-red uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5" /> Eliminator (EL)
              </span>
              <span className="text-[10px] px-2 py-0.5 font-mono font-bold bg-valorant-dark text-valorant-slate border border-valorant-border">
                {eliminator.status}
              </span>
            </div>
            <p className="text-[11px] font-mono text-valorant-slate">
              Winner goes to <strong className="text-valorant-gold">Qualifier 2</strong>, Loser finishes <strong className="text-valorant-red">4th Place</strong>.
            </p>

            <div className="space-y-1.5 pt-1 font-mono text-xs">
              <div
                className={`p-2 flex items-center justify-between ${
                  eliminator.winnerId === eliminator.teamA?.id ? "bg-valorant-mint/10 text-valorant-mint border-l-4 border-valorant-mint font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <span className="truncate font-heading uppercase">{eliminator.teamA?.name} (Rank 3)</span>
                <span className="font-mono ml-2 font-bold">{eliminator.scoreA ?? "—"}</span>
              </div>
              <div
                className={`p-2 flex items-center justify-between ${
                  eliminator.winnerId === eliminator.teamB?.id ? "bg-valorant-mint/10 text-valorant-mint border-l-4 border-valorant-mint font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <span className="truncate font-heading uppercase">{eliminator.teamB?.name} (Rank 4)</span>
                <span className="font-mono ml-2 font-bold">{eliminator.scoreB ?? "—"}</span>
              </div>
            </div>

            <ValorantButton
              onClick={() => {
                soundFX.playClick();
                setSelectedMatch(eliminator);
                setScoreA(eliminator.scoreA || 13);
                setScoreB(eliminator.scoreB || 10);
                setWinnerId(eliminator.teamA?.id || "");
              }}
              variant="secondary"
              size="sm"
              className="w-full"
            >
              {eliminator.status === "VERIFIED" ? "Edit Eliminator Score" : "Record Eliminator Result"}
            </ValorantButton>
          </div>
        </div>

        {/* Column 2: Qualifier 2 */}
        <div className="space-y-6">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-valorant-slate flex items-center gap-2">
            <span className="text-valorant-red">◈</span> PLAYOFF ROUND 2 (SEMIFINAL)
          </div>

          <div
            className={`bg-valorant-surface border p-5 space-y-4 transition-all val-chamfer-btn ${
              q2.status === "VERIFIED"
                ? "border-2 border-valorant-mint/60"
                : "border-valorant-border hover:border-valorant-gold/60"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-heading font-bold text-valorant-gold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Qualifier 2 (Q2)
              </span>
              <span className="text-[10px] px-2 py-0.5 font-mono font-bold bg-valorant-dark text-valorant-slate border border-valorant-border">
                {q2.status}
              </span>
            </div>
            <p className="text-xs font-mono text-valorant-slate">
              Winner goes to <strong className="text-valorant-mint">Grand Final</strong>, Loser takes <strong className="text-amber-500">3rd Place Bronze Prize</strong>.
            </p>

            <div className="space-y-2 pt-2 font-mono text-xs">
              <div
                className={`p-3 flex items-center justify-between ${
                  q2.winnerId === q2.teamA?.id ? "bg-valorant-mint/10 text-valorant-mint border-l-4 border-valorant-mint font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <div>
                  <div className="font-heading uppercase font-bold text-sm">{q2.teamA?.name || "Loser of Qualifier 1"}</div>
                  <div className="text-[10px] text-valorant-slate font-normal">Q1 RUNNER-UP</div>
                </div>
                <span className="font-mono text-base font-bold ml-2">{q2.scoreA ?? "—"}</span>
              </div>

              <div
                className={`p-3 flex items-center justify-between ${
                  q2.winnerId === q2.teamB?.id ? "bg-valorant-mint/10 text-valorant-mint border-l-4 border-valorant-mint font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <div>
                  <div className="font-heading uppercase font-bold text-sm">{q2.teamB?.name || "Winner of Eliminator"}</div>
                  <div className="text-[10px] text-valorant-slate font-normal">ELIMINATOR WINNER</div>
                </div>
                <span className="font-mono text-base font-bold ml-2">{q2.scoreB ?? "—"}</span>
              </div>
            </div>

            <ValorantButton
              disabled={!q2.teamA || !q2.teamB}
              onClick={() => {
                soundFX.playClick();
                setSelectedMatch(q2);
                setScoreA(q2.scoreA || 13);
                setScoreB(q2.scoreB || 11);
                setWinnerId(q2.teamA?.id || "");
              }}
              variant="amber"
              size="sm"
              className="w-full"
            >
              {q2.status === "VERIFIED" ? "Edit Q2 Score" : "Record Q2 Result & Decide 3rd"}
            </ValorantButton>
          </div>
        </div>

        {/* Column 3: Grand Final */}
        <div className="space-y-6">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-valorant-slate flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-valorant-gold" /> PLAYOFF ROUND 3 (GRAND FINAL)
          </div>

          <div
            className={`bg-valorant-surface border-2 p-6 space-y-5 shadow-2xl val-chamfer relative overflow-hidden ${
              grandFinal.status === "VERIFIED"
                ? "border-valorant-gold shadow-valorant-gold/20"
                : "border-valorant-gold/60"
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 pointer-events-none opacity-5">
              <Image
                src="/images/vct_crest.svg"
                alt="VCT"
                width={128}
                height={128}
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xl font-display text-valorant-gold uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-6 w-6 text-valorant-gold" /> Grand Final
              </span>
              <span className="text-[10px] px-2.5 py-1 font-mono font-black bg-valorant-gold/10 text-valorant-gold border border-valorant-gold/40">
                1ST VS 2ND
              </span>
            </div>
            <p className="text-xs font-mono text-valorant-slate">
              Decides the <strong className="text-valorant-gold">Tournament Champion (1st Place)</strong> and <strong className="text-slate-300">Runner-Up (2nd Place)</strong>.
            </p>

            <div className="space-y-2 pt-2 font-mono">
              <div
                className={`p-3.5 flex items-center justify-between ${
                  grandFinal.winnerId === grandFinal.teamA?.id ? "bg-valorant-gold/10 text-valorant-gold border-l-4 border-valorant-gold font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <div>
                  <div className="font-heading uppercase font-bold text-base">{grandFinal.teamA?.name || "Winner of Qualifier 1"}</div>
                  <div className="text-[10px] text-valorant-slate font-normal">DIRECT FINALIST (Q1 WINNER)</div>
                </div>
                <span className="font-mono text-xl font-black ml-2">{grandFinal.scoreA ?? "—"}</span>
              </div>

              <div
                className={`p-3.5 flex items-center justify-between ${
                  grandFinal.winnerId === grandFinal.teamB?.id ? "bg-valorant-gold/10 text-valorant-gold border-l-4 border-valorant-gold font-bold" : "bg-valorant-dark text-valorant-ivory border-l-4 border-valorant-border"
                }`}
              >
                <div>
                  <div className="font-heading uppercase font-bold text-base">{grandFinal.teamB?.name || "Winner of Qualifier 2"}</div>
                  <div className="text-[10px] text-valorant-slate font-normal">Q2 ADVANCER</div>
                </div>
                <span className="font-mono text-xl font-black ml-2">{grandFinal.scoreB ?? "—"}</span>
              </div>
            </div>

            <ValorantButton
              disabled={!grandFinal.teamA || !grandFinal.teamB}
              onClick={() => {
                soundFX.playClick();
                setSelectedMatch(grandFinal);
                setScoreA(grandFinal.scoreA || 13);
                setScoreB(grandFinal.scoreB || 8);
                setWinnerId(grandFinal.teamA?.id || "");
              }}
              variant="primary"
              size="lg"
              className="w-full"
            >
              {grandFinal.status === "VERIFIED" ? "Edit Final Score" : "Record Grand Final & Crown Winner"}
            </ValorantButton>
          </div>
        </div>
      </div>

      {/* Result Verification Modal */}
      {selectedMatch && selectedMatch.teamA && selectedMatch.teamB && mounted && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center p-4">
            <div className="bg-valorant-surface border-2 border-valorant-red max-w-md w-full p-6 space-y-4 val-chamfer shadow-2xl shadow-valorant-red/30 my-auto">
            <div className="flex items-center justify-between border-b border-valorant-border pb-3">
              <h3 className="text-xl font-display uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                <Trophy className="h-5 w-5 text-valorant-gold" />
                {selectedMatch.name} Official Score Entry
              </h3>
              <button
                onClick={() => setSelectedMatch(null)}
                className="text-valorant-slate hover:text-valorant-ivory transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-mono text-valorant-slate">
              Submit round score and designate winner to advance playoff tree.
            </p>

            <div className="space-y-4 py-2 font-mono">
              <div className="bg-valorant-dark p-3.5 border border-valorant-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-valorant-ivory uppercase">{selectedMatch.teamA.name}</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={scoreA}
                    onChange={(e) => setScoreA(Number(e.target.value))}
                    className="w-16 bg-valorant-surface border border-valorant-border px-3 py-1 text-center text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-heading font-bold text-valorant-ivory uppercase">{selectedMatch.teamB.name}</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={scoreB}
                    onChange={(e) => setScoreB(Number(e.target.value))}
                    className="w-16 bg-valorant-surface border border-valorant-border px-3 py-1 text-center text-valorant-ivory font-mono font-bold focus:border-valorant-red focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-valorant-slate mb-1 uppercase">
                  Designate Advancing Winner:
                </label>
                <select
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="w-full bg-valorant-dark border border-valorant-border p-2 text-valorant-ivory font-heading font-bold text-xs uppercase focus:border-valorant-red focus:outline-none"
                >
                  <option value={selectedMatch.teamA.id}>
                    {selectedMatch.teamA.name} (WINNER)
                  </option>
                  <option value={selectedMatch.teamB.id}>
                    {selectedMatch.teamB.name} (WINNER)
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-valorant-border">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 text-xs font-mono uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory transition-colors"
              >
                Cancel
              </button>
              <ValorantButton
                disabled={isUpdating || !winnerId}
                onClick={() => handleRecordResult(selectedMatch.code)}
                variant="gold"
                size="sm"
              >
                Verify & Advance
              </ValorantButton>
            </div>
          </div>
        </div>
      </div>,
      document.body
    )}
    </div>
  );
}
