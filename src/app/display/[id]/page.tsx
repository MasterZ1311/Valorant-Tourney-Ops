"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { BracketStructure } from "@/lib/tournament/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { TacticalCard } from "@/components/ui/tactical-card";
import { Trophy, Monitor, Clock, Activity, ShieldCheck, Award, Medal, Radio } from "lucide-react";
import { formatTime } from "@/lib/utils";

export default function DisplayProjectorPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<{
    tournament: any;
    bracket: BracketStructure | null;
    fixtures: ScheduledFixture[];
    stage1Schedule?: any;
    iplPlayoffs?: any;
    stats: any;
  } | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/tournaments/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setLastRefreshed(new Date());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000); // 8s auto refresh
    return () => clearInterval(interval);
  }, [params.id]);

  if (!data) {
    return (
      <div className="min-h-screen bg-valorant-dark text-valorant-ivory flex flex-col items-center justify-center font-mono">
        <div className="relative w-16 h-16 mb-4 animate-pulse">
          <Image
            src="/images/valorant_v_logo.svg"
            alt="VALORANT"
            fill
            className="object-contain"
          />
        </div>
        <div className="text-sm font-bold tracking-widest text-valorant-red uppercase">
          ESTABLISHING SECURE ARENA LINK...
        </div>
        <div className="text-xs text-valorant-slate mt-1 font-mono">
          INITIALIZING PROJECTOR BROADCAST HUD
        </div>
      </div>
    );
  }

  const liveMatches = data.fixtures.filter((f) => f.status === "LIVE" || f.status === "PAUSED");
  const upcomingMatches = data.fixtures.filter((f) => f.status === "SCHEDULED" || f.status === "READY" || f.status === "CALLED");
  const completedMatches = data.fixtures.filter((f) => f.status === "VERIFIED" && !f.isBye);
  const iplRankings = data.iplPlayoffs?.rankings;

  return (
    <div className="min-h-screen bg-valorant-dark text-valorant-ivory p-4 md:p-8 flex flex-col justify-between select-none val-grid-bg">
      {/* Top TV VCT Broadcast Header */}
      <header className="flex flex-wrap items-center justify-between border-b border-valorant-border pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="relative w-14 h-14 bg-valorant-surface border-2 border-valorant-red p-2.5 shadow-lg shadow-valorant-red/20 val-chamfer-btn">
            <Image
              src="/images/valorant_v_logo.svg"
              alt="VALORANT"
              fill
              className="object-contain p-2"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold tracking-widest text-valorant-red uppercase">
                VCT OPERATIONAL TELEMETRY // BROADCAST
              </span>
              <span className="text-[10px] font-mono text-valorant-slate">|</span>
              <span className="text-[10px] font-mono text-valorant-mint uppercase">LAN FEED ACTIVE</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display uppercase tracking-wider text-valorant-ivory mt-0.5 leading-none">
              {data.tournament.name}
            </h1>
            <p className="text-xs font-mono text-valorant-slate mt-1 flex items-center gap-3">
              <span className="text-valorant-ivory font-bold">PHYSICAL ARENA: 40 PCs (4 SIMULTANEOUS STATIONS)</span>
              <span>•</span>
              <span className="text-valorant-red font-bold">STAGE 1: {data.stats?.totalTeams || 0} TEAMS • IPL PLAYOFF PODIUM</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono font-bold text-valorant-slate tracking-widest">
              ARENA CLOCK [LOCAL]
            </div>
            <div className="text-2xl font-mono font-bold text-valorant-ivory">
              {lastRefreshed.toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-2.5 bg-valorant-surface px-4 py-2.5 border border-valorant-red/60 shadow-lg shadow-valorant-red/20 val-chamfer-btn">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-valorant-red opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-valorant-red"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase font-mono font-black text-valorant-red tracking-wider">
                LIVE PROJECTOR HUD
              </span>
              <span className="text-[9px] font-mono text-valorant-slate tracking-widest">
                AUTO-SYNC 8S
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Prize Podium Banner */}
      {iplRankings && (
        <div className="my-6">
          <TacticalCard
            title="Championship Prize Rankings // IPL Playoff Decider"
            telemetry="VCT PRIZE PODIUM"
            variant="gold"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-valorant-dark/80 p-3 border-2 border-valorant-gold/60 text-center val-chamfer-btn relative">
                <div className="text-[10px] font-mono font-bold uppercase text-valorant-gold flex items-center justify-center gap-1.5 tracking-wider">
                  <Trophy className="h-3.5 w-3.5" /> 1ST (GOLD PRIZE)
                </div>
                <div className="text-base font-display uppercase tracking-wider text-valorant-ivory mt-1 truncate">
                  {iplRankings.firstPlace?.name || "TBD (Grand Final Winner)"}
                </div>
                <div className="text-[10px] font-mono text-valorant-gold/80 mt-0.5">
                  CHAMPION
                </div>
              </div>

              <div className="bg-valorant-dark/80 p-3 border-2 border-slate-400/60 text-center val-chamfer-btn relative">
                <div className="text-[10px] font-mono font-bold uppercase text-slate-300 flex items-center justify-center gap-1.5 tracking-wider">
                  <Medal className="h-3.5 w-3.5" /> 2ND (SILVER PRIZE)
                </div>
                <div className="text-base font-display uppercase tracking-wider text-valorant-ivory mt-1 truncate">
                  {iplRankings.secondPlace?.name || "TBD (Runner-Up)"}
                </div>
                <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                  RUNNER-UP
                </div>
              </div>

              <div className="bg-valorant-dark/80 p-3 border-2 border-amber-700/60 text-center val-chamfer-btn relative">
                <div className="text-[10px] font-mono font-bold uppercase text-amber-500 flex items-center justify-center gap-1.5 tracking-wider">
                  <Award className="h-3.5 w-3.5" /> 3RD (BRONZE PRIZE)
                </div>
                <div className="text-base font-display uppercase tracking-wider text-valorant-ivory mt-1 truncate">
                  {iplRankings.thirdPlace?.name || "TBD (Qualifier 2)"}
                </div>
                <div className="text-[10px] font-mono text-amber-500/80 mt-0.5">
                  BRONZE MEDAL
                </div>
              </div>

              <div className="bg-valorant-dark/80 p-3 border border-valorant-border text-center val-chamfer-btn relative">
                <div className="text-[10px] font-mono font-bold uppercase text-valorant-slate tracking-wider">
                  4TH PLACE
                </div>
                <div className="text-base font-display uppercase tracking-wider text-valorant-ivory mt-1 truncate">
                  {iplRankings.fourthPlace?.name || "TBD (Eliminator)"}
                </div>
                <div className="text-[10px] font-mono text-valorant-slate mt-0.5">
                  ELIMINATED
                </div>
              </div>
            </div>
          </TacticalCard>
        </div>
      )}

      {/* Main Grid: Live Stations + Upcoming Schedule + Bracket Standings */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-4 flex-1">
        {/* Left Column: Live Matches on Stations */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-display uppercase tracking-wider text-valorant-red flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Live Arena Stations ({liveMatches.length} In Match Play)
              </h2>
              <span className="text-[10px] font-mono text-valorant-slate uppercase">
                40 PHYSICAL RIGS IN ROTATION
              </span>
            </div>

            {liveMatches.length === 0 ? (
              <TacticalCard telemetry="ARENA ROTATION">
                <div className="p-8 text-center text-valorant-slate space-y-3">
                  <Clock className="h-10 w-10 text-valorant-red mx-auto opacity-75 animate-pulse" />
                  <div className="text-lg font-display uppercase tracking-wider text-valorant-ivory">
                    Stations In Technical Preparation / Seating
                  </div>
                  <div className="text-xs font-mono text-valorant-slate max-w-md mx-auto">
                    Athletes are conducting hardware checks and tactical warm-up across Arena Stations.
                  </div>
                </div>
              </TacticalCard>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map((m) => (
                  <div
                    key={m.matchId}
                    className="bg-valorant-surface border-2 border-valorant-red p-5 shadow-2xl shadow-valorant-red/10 space-y-4 val-chamfer relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none opacity-5">
                      <Image
                        src="/images/duelist.svg"
                        alt="Role"
                        width={96}
                        height={96}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-valorant-ivory flex items-center gap-2">
                        <span className="text-valorant-red">◈</span>
                        {m.matchCode} • {m.roundName}
                      </span>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono font-semibold text-valorant-ivory bg-valorant-dark/80 p-2.5 border border-valorant-border">
                      <Monitor className="h-4 w-4 text-valorant-red" />
                      <span className="font-bold">{m.stationName}</span>
                      <span className="text-valorant-slate">({m.labName})</span>
                    </div>

                    <div className="space-y-2 py-1">
                      <div className="bg-valorant-dark/60 p-2 border-l-4 border-valorant-red flex items-center justify-between">
                        <span className="text-base font-display uppercase tracking-wider text-valorant-ivory truncate">
                          {m.teamAName}
                        </span>
                        <span className="text-[10px] font-mono text-valorant-red font-bold px-1.5 py-0.5 bg-valorant-red/10 border border-valorant-red/30">
                          ATTACK
                        </span>
                      </div>
                      <div className="text-[10px] font-mono font-black text-valorant-slate text-center uppercase tracking-widest">
                        // VS //
                      </div>
                      <div className="bg-valorant-dark/60 p-2 border-l-4 border-valorant-cyan flex items-center justify-between">
                        <span className="text-base font-display uppercase tracking-wider text-valorant-ivory truncate">
                          {m.teamBName}
                        </span>
                        <span className="text-[10px] font-mono text-valorant-cyan font-bold px-1.5 py-0.5 bg-valorant-cyan/10 border border-valorant-cyan/30">
                          DEFENSE
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Matches */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-valorant-slate flex items-center gap-2">
                <Clock className="h-4 w-4 text-valorant-red" />
                On-Deck Combat Radar
              </h2>
              <span className="text-[10px] font-mono text-valorant-slate">NEXT IN ROTATION</span>
            </div>

            <TacticalCard telemetry="DEPLOYMENT RADAR">
              <div className="divide-y divide-valorant-border font-mono text-xs">
                {upcomingMatches.slice(0, 4).map((um) => (
                  <div key={um.matchId} className="p-3.5 flex items-center justify-between hover:bg-valorant-elevated/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-valorant-red">{um.matchCode}</span>
                      <span className="font-heading font-bold text-valorant-ivory">
                        {um.teamAName} <span className="text-valorant-slate font-normal">vs</span> {um.teamBName}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-valorant-slate">{formatTime(um.startTime)}</span>
                      <span className="text-valorant-ivory font-medium bg-valorant-dark px-2 py-0.5 border border-valorant-border text-[11px]">
                        {um.stationName}
                      </span>
                      <StatusBadge status={um.status} />
                    </div>
                  </div>
                ))}
              </div>
            </TacticalCard>
          </div>
        </div>

        {/* Right Column: Tournament Metrics & Completed Results */}
        <div className="lg:col-span-5 space-y-6">
          <TacticalCard title="Arena Progression" telemetry="SYSTEM METRICS" variant="mint">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-valorant-dark/80 p-3.5 border border-valorant-border val-chamfer-btn">
                <div className="text-[10px] font-mono uppercase font-bold text-valorant-slate">Total Combat Teams</div>
                <div className="text-3xl font-display uppercase tracking-wider text-valorant-ivory mt-1">
                  {data.stats.totalTeams}
                </div>
              </div>

              <div className="bg-valorant-dark/80 p-3.5 border border-valorant-border val-chamfer-btn">
                <div className="text-[10px] font-mono uppercase font-bold text-valorant-slate">Verified Matches</div>
                <div className="text-3xl font-display uppercase tracking-wider text-valorant-mint mt-1">
                  {data.stats.completedMatches} / {data.stats.totalMatches}
                </div>
              </div>
            </div>
          </TacticalCard>

          {/* Recent Results */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-valorant-slate flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-valorant-mint" />
                Verified Tactical Archive
              </h3>
              <span className="text-[10px] font-mono text-valorant-mint">100% CRYPTOGRAPHIC AUDIT</span>
            </div>

            <TacticalCard telemetry="ARCHIVED FIXTURES">
              <div className="divide-y divide-valorant-border font-mono text-xs">
                {completedMatches.length === 0 ? (
                  <div className="p-6 text-center text-xs text-valorant-slate">
                    AWAITING CONCLUDED FIXTURES...
                  </div>
                ) : (
                  completedMatches.slice(-5).reverse().map((cm) => (
                    <div key={cm.matchId} className="p-3.5 flex items-center justify-between hover:bg-valorant-elevated/40 transition-colors">
                      <div>
                        <div className="font-heading font-bold text-valorant-ivory text-sm">
                          <span className="text-valorant-red font-mono mr-2">{cm.matchCode}</span>
                          {cm.teamAName} <span className="text-valorant-slate font-normal">vs</span> {cm.teamBName}
                        </div>
                        <div className="text-[10px] text-valorant-slate mt-0.5">{cm.roundName}</div>
                      </div>
                      <span className="font-mono font-bold text-valorant-mint uppercase text-[10px] tracking-wider px-2 py-0.5 bg-valorant-mint/10 border border-valorant-mint/40">
                        CONCLUDED
                      </span>
                    </div>
                  ))
                )}
              </div>
            </TacticalCard>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-valorant-border pt-4 flex flex-wrap items-center justify-between text-[11px] font-mono text-valorant-slate gap-2">
        <div className="flex items-center gap-2">
          <div className="relative w-4 h-4">
            <Image
              src="/images/vct_crest.svg"
              alt="VCT"
              fill
              className="object-contain"
            />
          </div>
          <span>VALORANT TOURNAMENT OPERATIONS SYSTEM (VTO) • HIGH CADENCE LAN EDITION</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-valorant-mint flex items-center gap-1.5">
            <Radio className="h-3 w-3 animate-pulse" /> BROADCAST ENGINE LIVE
          </span>
          <span>// PROTOCOL 51°</span>
        </div>
      </footer>
    </div>
  );
}
