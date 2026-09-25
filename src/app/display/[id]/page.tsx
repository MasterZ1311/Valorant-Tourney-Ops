"use client";

import React, { useState, useEffect } from "react";
import { ScheduledFixture } from "@/lib/scheduling/types";
import { BracketStructure } from "@/lib/tournament/types";
import { StatusBadge } from "@/components/ui/status-badge";
import { Trophy, Monitor, Clock, Activity, ShieldCheck } from "lucide-react";
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
      <div className="min-h-screen bg-[#0a0f14] text-white flex items-center justify-center font-mono">
        LOADING LIVE TOURNAMENT FEED...
      </div>
    );
  }

  const liveMatches = data.fixtures.filter((f) => f.status === "LIVE" || f.status === "PAUSED");
  const upcomingMatches = data.fixtures.filter((f) => f.status === "SCHEDULED" || f.status === "READY" || f.status === "CALLED");
  const completedMatches = data.fixtures.filter((f) => f.status === "VERIFIED" && !f.isBye);

  return (
    <div className="min-h-screen bg-[#0a0f14] text-gray-100 p-6 md:p-10 flex flex-col justify-between select-none">
      {/* Top TV Header */}
      <header className="flex flex-wrap items-center justify-between border-b border-[#2b3844] pb-6 gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-xl bg-[#ff4655] flex items-center justify-center font-black text-black text-xl shadow-lg shadow-red-500/30">
            VTO
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
              {data.tournament.name}
            </h1>
            <p className="text-xs font-mono text-gray-400 mt-1 flex items-center gap-3">
              <span>{data.tournament.venueName}</span>
              <span>•</span>
              <span className="text-[#ff4655] font-bold">VALORANT LAN CHAMPIONSHIP</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">
              Live Arena Time
            </div>
            <div className="text-xl font-mono font-bold text-white">
              {lastRefreshed.toLocaleTimeString()}
            </div>
          </div>
          <div className="flex items-center gap-2 bg-[#17202a] px-3.5 py-2 rounded-lg border border-[#2b3844]">
            <span className="h-3 w-3 rounded-full bg-red-500 animate-ping"></span>
            <span className="text-xs uppercase font-mono font-black text-red-400">BROADCAST FEED</span>
          </div>
        </div>
      </header>

      {/* Main Grid: Live Stations + Upcoming Schedule + Bracket Standings */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 flex-1">
        {/* Left Column: Live Matches on Stations */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-red-400 flex items-center gap-2 mb-4">
              <Activity className="h-5 w-5" />
              Live Arena Stations ({liveMatches.length} Active)
            </h2>

            {liveMatches.length === 0 ? (
              <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-8 text-center text-gray-400">
                <Clock className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <div className="text-base font-bold text-white">No Matches Currently In Progress</div>
                <div className="text-xs text-gray-500 mt-1">Upcoming matches are warming up in team stations.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {liveMatches.map((m) => (
                  <div
                    key={m.matchId}
                    className="bg-[#17202a] border-2 border-[#ff4655] rounded-xl p-5 shadow-2xl shadow-red-500/10 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-gray-300">
                        {m.matchCode} • {m.roundName}
                      </span>
                      <StatusBadge status={m.status} />
                    </div>

                    <div className="flex items-center gap-2 text-xs font-semibold text-gray-300 bg-[#0f1923] p-2 rounded border border-[#2b3844]">
                      <Monitor className="h-4 w-4 text-[#ff4655]" />
                      <span>{m.stationName}</span>
                      <span className="text-gray-500">({m.labName})</span>
                    </div>

                    <div className="space-y-2 py-1">
                      <div className="text-base font-black text-white truncate flex items-center justify-between">
                        <span>{m.teamAName}</span>
                        <span className="text-xs font-mono text-emerald-400 font-bold">ATK</span>
                      </div>
                      <div className="text-xs font-black text-gray-500 text-center uppercase tracking-widest">
                        VS
                      </div>
                      <div className="text-base font-black text-white truncate flex items-center justify-between">
                        <span>{m.teamBName}</span>
                        <span className="text-xs font-mono text-blue-400 font-bold">DEF</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Matches */}
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-gray-400 flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4" />
              Upcoming Matches On Deck
            </h2>

            <div className="bg-[#17202a] border border-[#2b3844] rounded-xl overflow-hidden divide-y divide-[#2b3844]">
              {upcomingMatches.slice(0, 4).map((um) => (
                <div key={um.matchId} className="p-3.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-gray-400">{um.matchCode}</span>
                    <span className="font-bold text-white">
                      {um.teamAName} vs {um.teamBName}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 font-mono">{formatTime(um.startTime)}</span>
                    <span className="text-gray-400 font-medium">{um.stationName}</span>
                    <StatusBadge status={um.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Tournament Metrics & Completed Results */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <Trophy className="h-4 w-4 text-[#ff4655]" />
              Tournament Progression
            </h3>

            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-[#0f1923] p-3 rounded-lg border border-[#2b3844]">
                <div className="text-[10px] uppercase font-bold text-gray-400">Total Teams</div>
                <div className="text-xl font-black text-white mt-1">{data.stats.totalTeams}</div>
              </div>

              <div className="bg-[#0f1923] p-3 rounded-lg border border-[#2b3844]">
                <div className="text-[10px] uppercase font-bold text-gray-400">Completed</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {data.stats.completedMatches} / {data.stats.totalMatches}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Results */}
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              Verified Results
            </h3>

            <div className="bg-[#17202a] border border-[#2b3844] rounded-xl overflow-hidden divide-y divide-[#2b3844]">
              {completedMatches.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">
                  No verified results yet.
                </div>
              ) : (
                completedMatches.slice(-5).reverse().map((cm) => (
                  <div key={cm.matchId} className="p-3.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">
                        {cm.matchCode}: {cm.teamAName} vs {cm.teamBName}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{cm.roundName}</div>
                    </div>
                    <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-500/30">
                      Concluded
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#2b3844] pt-4 flex items-center justify-between text-[11px] text-gray-500">
        <span>VALORANT TOURNAMENT OPERATIONS SYSTEM (VTO) • HIGH CADENCE LAN EDITION</span>
        <span className="font-mono">STATUS: SYNCHRONIZED</span>
      </footer>
    </div>
  );
}
