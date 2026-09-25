"use client";

import React, { useState, useEffect } from "react";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { MatchStatus } from "@/lib/tournament/types";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  PhoneCall,
  CheckCircle2,
  Play,
  Pause,
  AlertTriangle,
  Monitor,
  RefreshCw,
  Trophy,
} from "lucide-react";
import Link from "next/link";

export default function VolunteerMobilePage() {
  const [fixtures, setFixtures] = useState<ScheduledFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [scoreA, setScoreA] = useState("13");
  const [scoreB, setScoreB] = useState("8");
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [activeMatch, setActiveMatch] = useState<ScheduledFixture | null>(null);

  const tournamentId = "vto-tourney-1";

  const fetchFixtures = async () => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/fixtures`);
      const data = await res.json();
      if (data.success) {
        setFixtures(data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFixtures();
    const interval = setInterval(fetchFixtures, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateMatchStatus = async (matchId: string, status: MatchStatus) => {
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        fetchFixtures();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishMatch = async () => {
    if (!activeMatch) return;
    try {
      const sA = parseInt(scoreA) || 13;
      const sB = parseInt(scoreB) || 0;
      const winnerId = sA > sB ? activeMatch.teamAId! : activeMatch.teamBId!;

      const res = await fetch(`/api/tournaments/${tournamentId}/bracket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ADVANCE",
          matchId: activeMatch.matchId,
          winnerId,
          scoreA: sA,
          scoreB: sB,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowScoreModal(false);
        setActiveMatch(null);
        fetchFixtures();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Find current match and next matches
  const playableMatches = fixtures.filter((f) => !f.isBye);
  const currentMatch =
    playableMatches.find((m) => m.status === "LIVE" || m.status === "PAUSED") ||
    playableMatches.find((m) => m.status === "CALLED" || m.status === "READY") ||
    playableMatches.find((m) => m.status === "SCHEDULED") ||
    null;

  const nextMatches = playableMatches.filter((m) => m.matchId !== currentMatch?.matchId && m.status === "SCHEDULED");

  return (
    <div className="max-w-md mx-auto min-h-screen bg-[#0f1923] text-gray-100 flex flex-col justify-between pb-8">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-[#17202a] border-b border-[#2b3844] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded bg-[#ff4655] text-black font-black text-xs">
            VTO
          </span>
          <span className="font-black text-sm tracking-wider text-white">MATCH MARSHAL</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchFixtures}
            className="p-2 rounded bg-[#0f1923] text-gray-400 hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/admin"
            className="text-[10px] uppercase font-bold text-gray-400 hover:text-white px-2 py-1 bg-[#0f1923] rounded border border-[#2b3844]"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-5 flex-1">
        {loading ? (
          <div className="py-20 text-center text-gray-400">Loading assignments...</div>
        ) : currentMatch ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#ff4655]">
                Current Active Match
              </span>
              <StatusBadge status={currentMatch.status} />
            </div>

            {/* Current Match Hero Card */}
            <div className="bg-[#17202a] border border-[#ff4655]/50 rounded-2xl p-5 shadow-xl shadow-red-500/10 space-y-4">
              <div className="flex items-center justify-between border-b border-[#2b3844] pb-3">
                <div className="font-mono font-black text-lg text-white">
                  {currentMatch.matchCode}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold bg-[#0f1923] px-2.5 py-1 rounded border border-[#2b3844]">
                  <Monitor className="h-3.5 w-3.5 text-[#ff4655]" />
                  {currentMatch.stationName || "Station 1"}
                </div>
              </div>

              {/* Head-to-Head */}
              <div className="space-y-3 py-1">
                <div className="bg-[#0f1923] p-3 rounded-xl border border-[#2b3844] flex items-center justify-between">
                  <span className="font-black text-white text-base truncate">
                    {currentMatch.teamAName}
                  </span>
                  <span className="text-xs font-mono text-emerald-400 font-bold">TEAM A</span>
                </div>

                <div className="text-center font-black text-gray-500 text-xs uppercase tracking-widest">
                  VS
                </div>

                <div className="bg-[#0f1923] p-3 rounded-xl border border-[#2b3844] flex items-center justify-between">
                  <span className="font-black text-white text-base truncate">
                    {currentMatch.teamBName}
                  </span>
                  <span className="text-xs font-mono text-blue-400 font-bold">TEAM B</span>
                </div>
              </div>

              {/* Large 48px+ Action Buttons */}
              <div className="space-y-2 pt-2">
                {currentMatch.status === "SCHEDULED" && (
                  <button
                    onClick={() => updateMatchStatus(currentMatch.matchId, "CALLED")}
                    className="w-full h-14 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform shadow-lg shadow-blue-600/30"
                  >
                    <PhoneCall className="h-5 w-5" />
                    Call Teams to Station
                  </button>
                )}

                {currentMatch.status === "CALLED" && (
                  <button
                    onClick={() => updateMatchStatus(currentMatch.matchId, "READY")}
                    className="w-full h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform shadow-lg shadow-indigo-600/30"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Confirm Teams Seated
                  </button>
                )}

                {currentMatch.status === "READY" && (
                  <button
                    onClick={() => updateMatchStatus(currentMatch.matchId, "LIVE")}
                    className="w-full h-14 rounded-xl bg-[#ff4655] hover:bg-[#e03d4b] active:scale-95 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform shadow-lg shadow-[#ff4655]/40"
                  >
                    <Play className="h-5 w-5" />
                    Start Match (LIVE)
                  </button>
                )}

                {currentMatch.status === "LIVE" && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateMatchStatus(currentMatch.matchId, "PAUSED")}
                      className="h-14 rounded-xl bg-amber-600 hover:bg-amber-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform"
                    >
                      <Pause className="h-4 w-4" />
                      Tech Pause
                    </button>

                    <button
                      onClick={() => {
                        setActiveMatch(currentMatch);
                        setShowScoreModal(true);
                      }}
                      className="h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Submit Result
                    </button>
                  </div>
                )}

                {currentMatch.status === "PAUSED" && (
                  <button
                    onClick={() => updateMatchStatus(currentMatch.matchId, "LIVE")}
                    className="w-full h-14 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 transition-transform"
                  >
                    <Play className="h-5 w-5" />
                    Resume Match
                  </button>
                )}
              </div>
            </div>

            {/* Upcoming Queue */}
            <div className="pt-4">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-2">
                Next Upcoming Fixtures
              </h4>
              <div className="space-y-2">
                {nextMatches.slice(0, 3).map((nm) => (
                  <div
                    key={nm.matchId}
                    className="bg-[#17202a] border border-[#2b3844] p-3 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-white">
                        {nm.matchCode}: {nm.teamAName} vs {nm.teamBName}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{nm.stationName}</div>
                    </div>
                    <StatusBadge status={nm.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-gray-400">
            <Trophy className="h-12 w-12 text-[#ff4655] mx-auto mb-3" />
            <div className="text-lg font-bold text-white">All Matches Concluded</div>
            <div className="text-xs text-gray-500 mt-1">Tournament completed or awaiting next round.</div>
          </div>
        )}
      </main>

      {/* Score Entry Dialog */}
      {showScoreModal && activeMatch && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-2xl max-w-sm w-full p-5 space-y-4">
            <h3 className="text-base font-black text-white">
              Submit Score: {activeMatch.matchCode}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 truncate">
                  {activeMatch.teamAName} (Rounds Won)
                </label>
                <input
                  type="number"
                  value={scoreA}
                  onChange={(e) => setScoreA(e.target.value)}
                  className="w-full h-12 bg-[#0f1923] border border-[#2b3844] rounded-lg px-3 font-mono font-bold text-lg text-white"
                  min="0"
                  max="30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-300 mb-1 truncate">
                  {activeMatch.teamBName} (Rounds Won)
                </label>
                <input
                  type="number"
                  value={scoreB}
                  onChange={(e) => setScoreB(e.target.value)}
                  className="w-full h-12 bg-[#0f1923] border border-[#2b3844] rounded-lg px-3 font-mono font-bold text-lg text-white"
                  min="0"
                  max="30"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowScoreModal(false)}
                className="h-12 rounded-xl text-xs font-bold text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFinishMatch}
                className="h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider"
              >
                Submit Score
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
