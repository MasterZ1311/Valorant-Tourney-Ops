"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { MatchStatus } from "@/lib/tournament/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { ValorantButton } from "@/components/ui/valorant-button";
import { TacticalCard } from "@/components/ui/tactical-card";
import {
  Play,
  Pause,
  CheckCircle2,
  PhoneCall,
  Monitor,
  Trophy,
  RefreshCw,
} from "lucide-react";
import { playMatchStart, playTechPause, playButtonClick } from "@/lib/sound/audio";

export default function VolunteerOperationsPage() {
  const tournamentId = "vto-tourney-1";
  const [fixtures, setFixtures] = useState<ScheduledFixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [activeMatch, setActiveMatch] = useState<ScheduledFixture | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Score dialog state
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [scoreA, setScoreA] = useState("13");
  const [scoreB, setScoreB] = useState("0");

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
    const interval = setInterval(fetchFixtures, 8000);
    return () => clearInterval(interval);
  }, []);

  const updateMatchStatus = async (matchId: string, status: MatchStatus) => {
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
        fetchFixtures();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleFinishMatch = async () => {
    if (!activeMatch) return;
    playButtonClick();
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
    playableMatches.find((m) => m.status === "CALLED" || m.status === "READY" || m.status === "LOBBY_READY") ||
    playableMatches.find((m) => m.status === "SCHEDULED") ||
    null;

  const nextMatches = playableMatches.filter((m) => m.matchId !== currentMatch?.matchId && m.status === "SCHEDULED");

  return (
    <div className="max-w-md mx-auto min-h-screen bg-valorant-dark val-grid-bg text-valorant-ivory flex flex-col justify-between pb-8">
      {/* Mobile Top Header */}
      <header className="sticky top-0 z-40 bg-valorant-dark/95 backdrop-blur border-b border-valorant-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 flex items-center justify-center bg-valorant-red p-1">
            <Image
              src="/images/valorant_v_logo.svg"
              alt="VALORANT"
              width={18}
              height={18}
              className="brightness-0 invert object-contain"
            />
          </div>
          <div>
            <div className="font-display font-black tracking-widest text-sm text-valorant-ivory leading-none">
              FIELD MARSHAL
            </div>
            <div className="text-[9px] font-mono tracking-widest text-valorant-slate">
              STATION_OPS // LAN
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              playButtonClick();
              fetchFixtures();
            }}
            className="p-2 border border-valorant-border bg-valorant-surface text-valorant-slate hover:text-white"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <Link
            href="/admin"
            className="val-chamfer-btn text-[10px] font-heading uppercase font-bold text-valorant-slate hover:text-white px-2.5 py-1.5 bg-valorant-surface border border-valorant-border"
          >
            Admin
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 space-y-5 flex-1">
        {loading ? (
          <div className="py-20 text-center font-mono text-xs text-valorant-slate tracking-widest uppercase">
            // Loading Station Assignments...
          </div>
        ) : currentMatch ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-valorant-red">
                // ACTIVE OPERATIONAL MATCH
              </span>
              <StatusBadge status={currentMatch.status} />
            </div>

            {/* Current Match Hero Tactical Card */}
            <TacticalCard
              telemetryTag={`MISSION_${currentMatch.matchCode} // ASSIGNED`}
              cornerColor={currentMatch.status === "LIVE" ? "red" : "slate"}
              className="space-y-4 shadow-xl shadow-red-500/5"
            >
              <div className="flex items-center justify-between border-b border-valorant-border pb-3">
                <div className="font-display font-black text-2xl text-valorant-ivory tracking-wider">
                  {currentMatch.matchCode}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-valorant-ivory font-heading font-bold uppercase bg-valorant-dark px-3 py-1 border border-valorant-border">
                  <Monitor className="h-3.5 w-3.5 text-valorant-red" />
                  {currentMatch.stationName || "Station 1"}
                </div>
              </div>

              {/* Head-to-Head */}
              <div className="space-y-2 py-1">
                <div className="bg-valorant-dark p-3.5 border border-valorant-border flex items-center justify-between">
                  <span className="font-heading font-bold text-valorant-ivory text-base uppercase tracking-wider truncate">
                    {currentMatch.teamAName}
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">TEAM A</span>
                </div>

                <div className="text-center font-mono font-bold text-valorant-slate text-[10px] tracking-widest uppercase">
                  // VS //
                </div>

                <div className="bg-valorant-dark p-3.5 border border-valorant-border flex items-center justify-between">
                  <span className="font-heading font-bold text-valorant-ivory text-base uppercase tracking-wider truncate">
                    {currentMatch.teamBName}
                  </span>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">TEAM B</span>
                </div>
              </div>

              {/* Large 52px+ Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {currentMatch.status === "SCHEDULED" && (
                  <ValorantButton
                    size="touch"
                    variant="secondary"
                    onClick={() => updateMatchStatus(currentMatch.matchId, "CALLED")}
                    className="w-full text-sm"
                  >
                    <PhoneCall className="h-5 w-5 mr-2" />
                    Call Teams To Station
                  </ValorantButton>
                )}

                {currentMatch.status === "CALLED" && (
                  <ValorantButton
                    size="touch"
                    variant="primary"
                    onClick={() => updateMatchStatus(currentMatch.matchId, "READY")}
                    className="w-full text-sm"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirm Teams Seated
                  </ValorantButton>
                )}

                {currentMatch.status === "READY" && (
                  <ValorantButton
                    size="touch"
                    variant="secondary"
                    onClick={() => updateMatchStatus(currentMatch.matchId, "LOBBY_READY")}
                    className="w-full text-sm border-purple-500/70 hover:bg-purple-950/40 text-purple-300"
                  >
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Confirm Lobby Setup (LOBBY READY)
                  </ValorantButton>
                )}

                {currentMatch.status === "LOBBY_READY" && (
                  <ValorantButton
                    size="touch"
                    variant="primary"
                    onClick={() => updateMatchStatus(currentMatch.matchId, "LIVE")}
                    className="w-full text-base font-black shadow-lg shadow-valorant-red/30"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Start Match (LIVE)
                  </ValorantButton>
                )}

                {currentMatch.status === "LIVE" && (
                  <div className="grid grid-cols-2 gap-2">
                    <ValorantButton
                      size="touch"
                      variant="amber"
                      onClick={() => updateMatchStatus(currentMatch.matchId, "PAUSED")}
                      className="w-full text-xs"
                    >
                      <Pause className="h-4 w-4 mr-1.5" />
                      Tech Pause
                    </ValorantButton>

                    <ValorantButton
                      size="touch"
                      variant="mint"
                      onClick={() => {
                        setActiveMatch(currentMatch);
                        setShowScoreModal(true);
                      }}
                      className="w-full text-xs"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      Submit Result
                    </ValorantButton>
                  </div>
                )}

                {currentMatch.status === "PAUSED" && (
                  <ValorantButton
                    size="touch"
                    variant="mint"
                    onClick={() => updateMatchStatus(currentMatch.matchId, "LIVE")}
                    className="w-full text-sm"
                  >
                    <Play className="h-5 w-5 mr-2" />
                    Resume Match Play
                  </ValorantButton>
                )}
              </div>
            </TacticalCard>

            {/* Upcoming Queue */}
            <div className="pt-2">
              <h4 className="text-[11px] font-mono font-bold uppercase tracking-widest text-valorant-slate mb-2">
                // Next Scheduled Matches
              </h4>
              <div className="space-y-2">
                {nextMatches.slice(0, 3).map((nm) => (
                  <div
                    key={nm.matchId}
                    className="bg-valorant-surface border border-valorant-border p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-heading font-bold text-valorant-ivory uppercase tracking-wider">
                        {nm.matchCode}: {nm.teamAName} vs {nm.teamBName}
                      </div>
                      <div className="text-[10px] font-mono text-valorant-slate mt-0.5">{nm.stationName}</div>
                    </div>
                    <StatusBadge status={nm.status} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <TacticalCard cornerColor="slate" className="py-16 text-center text-valorant-slate">
            <Trophy className="h-12 w-12 text-valorant-red mx-auto mb-3 opacity-70" />
            <div className="text-lg font-display font-black text-valorant-ivory uppercase tracking-wider">
              {fixtures.length === 0 ? "Awaiting Match Schedule" : "All Matches Concluded"}
            </div>
            <div className="text-xs font-mono text-valorant-slate mt-1">
              {fixtures.length === 0
                ? "No active matches scheduled. Station assignments will appear once generated by tournament admins."
                : "Tournament completed or awaiting next round."}
            </div>
          </TacticalCard>
        )}
      </main>

      {/* Score Entry Dialog */}
      {showScoreModal && activeMatch && mounted && createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="min-h-full flex items-center justify-center p-4">
            <TacticalCard
              telemetryTag="RESULT_ENTRY // MARSHAL_SUBMIT"
              cornerColor="mint"
              className="max-w-sm w-full p-6 space-y-5 my-auto"
            >
              <h3 className="text-lg font-display font-black text-valorant-ivory uppercase tracking-wider border-b border-valorant-border pb-2">
                Submit Score: {activeMatch.matchCode}
              </h3>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-valorant-ivory mb-1 truncate">
                    {activeMatch.teamAName} (Rounds Won)
                  </label>
                  <input
                    type="number"
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    className="w-full h-12 bg-valorant-dark border border-valorant-border rounded-none px-3 font-mono font-bold text-xl text-valorant-ivory focus:border-valorant-red focus:outline-none"
                    min="0"
                    max="30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-heading font-bold uppercase tracking-wider text-valorant-ivory mb-1 truncate">
                    {activeMatch.teamBName} (Rounds Won)
                  </label>
                  <input
                    type="number"
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    className="w-full h-12 bg-valorant-dark border border-valorant-border rounded-none px-3 font-mono font-bold text-xl text-valorant-ivory focus:border-valorant-red focus:outline-none"
                    min="0"
                    max="30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <ValorantButton
                  variant="ghost"
                  onClick={() => setShowScoreModal(false)}
                  className="w-full border border-valorant-border"
                >
                  Cancel
                </ValorantButton>
                <ValorantButton
                  variant="mint"
                  onClick={handleFinishMatch}
                  className="w-full"
                >
                  Submit Score
                </ValorantButton>
              </div>
            </TacticalCard>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
