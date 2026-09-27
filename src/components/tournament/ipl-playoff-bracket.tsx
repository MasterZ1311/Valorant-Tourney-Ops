"use client";

import React, { useState } from "react";
import {
  IPLPlayoffStructure,
  IPLPlayoffMatch,
} from "@/lib/tournament/ipl-playoffs";
import {
  Trophy,
  Award,
  Medal,
  Play,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RotateCcw,
  Sparkles,
} from "lucide-react";

interface IPLPlayoffBracketProps {
  initialPlayoffs: IPLPlayoffStructure | null;
  tournamentId: string;
}

export function IPLPlayoffBracket({
  initialPlayoffs,
  tournamentId,
}: IPLPlayoffBracketProps) {
  const [playoffs, setPlayoffs] = useState<IPLPlayoffStructure | null>(initialPlayoffs);
  const [selectedMatch, setSelectedMatch] = useState<IPLPlayoffMatch | null>(null);
  const [scoreA, setScoreA] = useState(13);
  const [scoreB, setScoreB] = useState(9);
  const [winnerId, setWinnerId] = useState<string>("");
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
      <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-10 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-[#1f2731] border border-[#2b3844] flex items-center justify-center mx-auto text-amber-400">
          <Trophy className="h-6 w-6 text-amber-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">IPL Playoffs Not Seeded Yet</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            The IPL Playoff structure requires at least 2 qualified teams. Complete preliminary matches or register teams to seed the championship podium.
          </p>
        </div>
      </div>
    );
  }

  const { q1, eliminator, q2, grandFinal } = playoffs.matches;
  const { rankings } = playoffs;

  return (
    <div className="space-y-8">
      {/* IPL Format Header & Prize Podium */}
      <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                IPL / Page Playoff System
              </span>
              <h2 className="text-xl font-black text-white">Championship & 3-Place Prize Decider</h2>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Top 4 qualification guaranteeing verified 1st, 2nd, and 3rd rank places for tournament prizes.
            </p>
          </div>

          <button
            onClick={handleResetPlayoffs}
            disabled={isUpdating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold transition-colors disabled:opacity-50"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Playoff Tree
          </button>
        </div>

        {/* Prize Podium Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2 border-t border-[#2b3844]/60">
          {/* 1st Place */}
          <div className="bg-gradient-to-b from-amber-950/40 to-[#0f1923] border border-amber-500/40 rounded-xl p-4 text-center relative overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest font-black text-amber-400 flex items-center justify-center gap-1">
              <Trophy className="h-4 w-4" /> 1st Place (Gold Prize)
            </div>
            <div className="text-base font-black text-white mt-2 truncate">
              {rankings.firstPlace?.name || "TBD (Grand Final Winner)"}
            </div>
            <div className="text-[11px] text-amber-300/80 mt-1 font-mono">
              Tournament Champion
            </div>
          </div>

          {/* 2nd Place */}
          <div className="bg-gradient-to-b from-slate-900/60 to-[#0f1923] border border-slate-400/40 rounded-xl p-4 text-center relative overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest font-black text-slate-300 flex items-center justify-center gap-1">
              <Medal className="h-4 w-4" /> 2nd Place (Silver Prize)
            </div>
            <div className="text-base font-black text-white mt-2 truncate">
              {rankings.secondPlace?.name || "TBD (Grand Final Runner-Up)"}
            </div>
            <div className="text-[11px] text-slate-400 mt-1 font-mono">
              Runner-Up
            </div>
          </div>

          {/* 3rd Place */}
          <div className="bg-gradient-to-b from-amber-950/20 to-[#0f1923] border border-amber-700/40 rounded-xl p-4 text-center relative overflow-hidden">
            <div className="text-[10px] uppercase tracking-widest font-black text-amber-600 flex items-center justify-center gap-1">
              <Award className="h-4 w-4" /> 3rd Place (Bronze Prize)
            </div>
            <div className="text-base font-black text-white mt-2 truncate">
              {rankings.thirdPlace?.name || "TBD (Loser Qualifier 2)"}
            </div>
            <div className="text-[11px] text-amber-600 mt-1 font-mono">
              Bronze Decided in Q2
            </div>
          </div>

          {/* 4th Place */}
          <div className="bg-[#0f1923] border border-[#2b3844] rounded-xl p-4 text-center">
            <div className="text-[10px] uppercase tracking-widest font-black text-gray-500 flex items-center justify-center gap-1">
              4th Place
            </div>
            <div className="text-base font-black text-white mt-2 truncate">
              {rankings.fourthPlace?.name || "TBD (Loser Eliminator)"}
            </div>
            <div className="text-[11px] text-gray-500 mt-1 font-mono">
              Eliminated in Match 2
            </div>
          </div>
        </div>
      </div>

      {/* Visual IPL Bracket Tree */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
        {/* Column 1: Qualifier 1 & Eliminator */}
        <div className="space-y-6">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span>Playoff Round 1</span>
          </div>

          {/* Qualifier 1 Card */}
          <div
            className={`bg-[#17202a] border rounded-xl p-4 space-y-3 transition-all ${
              q1.status === "VERIFIED"
                ? "border-emerald-500/50"
                : "border-[#2b3844] hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Qualifier 1 (Q1)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#0f1923] text-gray-400">
                {q1.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Winner goes to <strong className="text-emerald-400">Grand Final</strong>, Loser to <strong className="text-amber-400">Qualifier 2</strong>.
            </p>

            <div className="space-y-1.5 pt-1">
              <div
                className={`p-2 rounded flex items-center justify-between text-xs font-bold ${
                  q1.winnerId === q1.teamA?.id ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30" : "bg-[#0f1923] text-white"
                }`}
              >
                <span>{q1.teamA?.name} (Rank 1)</span>
                <span className="font-mono">{q1.scoreA ?? "—"}</span>
              </div>
              <div
                className={`p-2 rounded flex items-center justify-between text-xs font-bold ${
                  q1.winnerId === q1.teamB?.id ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30" : "bg-[#0f1923] text-white"
                }`}
              >
                <span>{q1.teamB?.name} (Rank 2)</span>
                <span className="font-mono">{q1.scoreB ?? "—"}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedMatch(q1);
                setScoreA(q1.scoreA || 13);
                setScoreB(q1.scoreB || 9);
                setWinnerId(q1.teamA?.id || "");
              }}
              className="w-full py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 uppercase transition-colors"
            >
              {q1.status === "VERIFIED" ? "Edit Q1 Score" : "Record Q1 Result"}
            </button>
          </div>

          {/* Eliminator Card */}
          <div
            className={`bg-[#17202a] border rounded-xl p-4 space-y-3 transition-all ${
              eliminator.status === "VERIFIED"
                ? "border-emerald-500/50"
                : "border-[#2b3844] hover:border-red-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> Eliminator (EL)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#0f1923] text-gray-400">
                {eliminator.status}
              </span>
            </div>
            <p className="text-[11px] text-gray-400">
              Winner goes to <strong className="text-amber-400">Qualifier 2</strong>, Loser finishes <strong className="text-rose-400">4th Place</strong>.
            </p>

            <div className="space-y-1.5 pt-1">
              <div
                className={`p-2 rounded flex items-center justify-between text-xs font-bold ${
                  eliminator.winnerId === eliminator.teamA?.id ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30" : "bg-[#0f1923] text-white"
                }`}
              >
                <span>{eliminator.teamA?.name} (Rank 3)</span>
                <span className="font-mono">{eliminator.scoreA ?? "—"}</span>
              </div>
              <div
                className={`p-2 rounded flex items-center justify-between text-xs font-bold ${
                  eliminator.winnerId === eliminator.teamB?.id ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30" : "bg-[#0f1923] text-white"
                }`}
              >
                <span>{eliminator.teamB?.name} (Rank 4)</span>
                <span className="font-mono">{eliminator.scoreB ?? "—"}</span>
              </div>
            </div>

            <button
              onClick={() => {
                setSelectedMatch(eliminator);
                setScoreA(eliminator.scoreA || 13);
                setScoreB(eliminator.scoreB || 10);
                setWinnerId(eliminator.teamA?.id || "");
              }}
              className="w-full py-1.5 rounded bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 uppercase transition-colors"
            >
              {eliminator.status === "VERIFIED" ? "Edit Eliminator Score" : "Record Eliminator Result"}
            </button>
          </div>
        </div>

        {/* Column 2: Qualifier 2 */}
        <div className="space-y-6">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span>Playoff Round 2 (Semifinal)</span>
          </div>

          <div
            className={`bg-[#17202a] border rounded-xl p-5 space-y-4 transition-all ${
              q2.status === "VERIFIED"
                ? "border-emerald-500/50"
                : "border-[#2b3844] hover:border-amber-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Qualifier 2 (Q2)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#0f1923] text-gray-400">
                {q2.status}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Winner goes to <strong className="text-emerald-400">Grand Final</strong>, Loser takes <strong className="text-amber-500">3rd Place Bronze Prize</strong>.
            </p>

            <div className="space-y-2 pt-2">
              <div
                className={`p-3 rounded-lg flex items-center justify-between text-xs font-bold ${
                  q2.winnerId === q2.teamA?.id ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30" : "bg-[#0f1923] text-white"
                }`}
              >
                <div>
                  <div>{q2.teamA?.name || "Loser of Qualifier 1"}</div>
                  <div className="text-[10px] text-gray-500 font-normal">Q1 Runner-Up</div>
                </div>
                <span className="font-mono text-sm">{q2.scoreA ?? "—"}</span>
              </div>

              <div
                className={`p-3 rounded-lg flex items-center justify-between text-xs font-bold ${
                  q2.winnerId === q2.teamB?.id ? "bg-emerald-950/40 text-emerald-300 border border-emerald-500/30" : "bg-[#0f1923] text-white"
                }`}
              >
                <div>
                  <div>{q2.teamB?.name || "Winner of Eliminator"}</div>
                  <div className="text-[10px] text-gray-500 font-normal">Eliminator Winner</div>
                </div>
                <span className="font-mono text-sm">{q2.scoreB ?? "—"}</span>
              </div>
            </div>

            <button
              disabled={!q2.teamA || !q2.teamB}
              onClick={() => {
                setSelectedMatch(q2);
                setScoreA(q2.scoreA || 13);
                setScoreB(q2.scoreB || 11);
                setWinnerId(q2.teamA?.id || "");
              }}
              className="w-full py-2 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase transition-colors disabled:opacity-40"
            >
              {q2.status === "VERIFIED" ? "Edit Q2 Score" : "Record Q2 Result & Decide 3rd"}
            </button>
          </div>
        </div>

        {/* Column 3: Grand Final */}
        <div className="space-y-6">
          <div className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <span>Playoff Round 3 (Grand Final)</span>
          </div>

          <div
            className={`bg-gradient-to-b from-[#1e293b] to-[#17202a] border-2 rounded-xl p-6 space-y-5 shadow-2xl transition-all ${
              grandFinal.status === "VERIFIED"
                ? "border-amber-400 shadow-amber-400/10"
                : "border-amber-500/40"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-base font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                <Trophy className="h-5 w-5" /> Grand Final
              </span>
              <span className="text-[10px] px-2.5 py-1 rounded font-black bg-amber-950/60 text-amber-300 border border-amber-500/30">
                1st vs 2nd
              </span>
            </div>
            <p className="text-xs text-gray-300">
              Decides the <strong className="text-amber-400">Tournament Champion (1st Place)</strong> and <strong className="text-slate-300">Runner-Up (2nd Place)</strong>.
            </p>

            <div className="space-y-2 pt-2">
              <div
                className={`p-3.5 rounded-lg flex items-center justify-between text-sm font-bold ${
                  grandFinal.winnerId === grandFinal.teamA?.id ? "bg-amber-950/60 text-amber-300 border border-amber-500/40" : "bg-[#0f1923] text-white"
                }`}
              >
                <div>
                  <div>{grandFinal.teamA?.name || "Winner of Qualifier 1"}</div>
                  <div className="text-[10px] text-gray-400 font-normal">Direct Finalist</div>
                </div>
                <span className="font-mono text-base font-black">{grandFinal.scoreA ?? "—"}</span>
              </div>

              <div
                className={`p-3.5 rounded-lg flex items-center justify-between text-sm font-bold ${
                  grandFinal.winnerId === grandFinal.teamB?.id ? "bg-amber-950/60 text-amber-300 border border-amber-500/40" : "bg-[#0f1923] text-white"
                }`}
              >
                <div>
                  <div>{grandFinal.teamB?.name || "Winner of Qualifier 2"}</div>
                  <div className="text-[10px] text-gray-400 font-normal">Q2 Advancer</div>
                </div>
                <span className="font-mono text-base font-black">{grandFinal.scoreB ?? "—"}</span>
              </div>
            </div>

            <button
              disabled={!grandFinal.teamA || !grandFinal.teamB}
              onClick={() => {
                setSelectedMatch(grandFinal);
                setScoreA(grandFinal.scoreA || 13);
                setScoreB(grandFinal.scoreB || 8);
                setWinnerId(grandFinal.teamA?.id || "");
              }}
              className="w-full py-2.5 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white text-xs font-black uppercase tracking-wider transition-colors shadow-lg shadow-[#ff4655]/20 disabled:opacity-40"
            >
              {grandFinal.status === "VERIFIED" ? "Edit Final Score" : "Record Grand Final & Crown Winner"}
            </button>
          </div>
        </div>
      </div>

      {/* Result Verification Modal */}
      {selectedMatch && selectedMatch.teamA && selectedMatch.teamB && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-400" />
              {selectedMatch.name} Official Score Entry
            </h3>
            <p className="text-xs text-gray-400">
              Submit round score and designate winner to advance playoff tree.
            </p>

            <div className="space-y-4 py-2">
              <div className="bg-[#0f1923] p-3 rounded-lg border border-[#2b3844] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{selectedMatch.teamA.name}</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={scoreA}
                    onChange={(e) => setScoreA(Number(e.target.value))}
                    className="w-16 bg-[#17202a] border border-[#2b3844] rounded px-3 py-1 text-center text-white font-mono font-bold"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">{selectedMatch.teamB.name}</span>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={scoreB}
                    onChange={(e) => setScoreB(Number(e.target.value))}
                    className="w-16 bg-[#17202a] border border-[#2b3844] rounded px-3 py-1 text-center text-white font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1">
                  Designate Advancing Winner:
                </label>
                <select
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="w-full bg-[#0f1923] border border-[#2b3844] rounded px-3 py-2 text-white font-bold text-xs"
                >
                  <option value={selectedMatch.teamA.id}>
                    {selectedMatch.teamA.name} (Winner)
                  </option>
                  <option value={selectedMatch.teamB.id}>
                    {selectedMatch.teamB.name} (Winner)
                  </option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2b3844]">
              <button
                onClick={() => setSelectedMatch(null)}
                className="px-4 py-2 rounded bg-gray-800 hover:bg-gray-700 text-xs font-bold text-white"
              >
                Cancel
              </button>
              <button
                disabled={isUpdating || !winnerId}
                onClick={() => handleRecordResult(selectedMatch.code)}
                className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white disabled:opacity-50"
              >
                Verify & Advance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
