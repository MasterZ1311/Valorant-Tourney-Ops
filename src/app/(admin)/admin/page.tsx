import React from "react";
import { store } from "@/lib/store/tournament-store";
import { StatusBadge } from "@/components/ui/status-badge";
import { ValidationModal } from "@/components/tournament/validation-modal";
import {
  Trophy,
  Users,
  Monitor,
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Award,
  Medal,
} from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const tournamentId = "vto-tourney-1";
  const tournament = store.getTournament(tournamentId);
  const teams = store.getTeams(tournamentId);
  const venueMetrics = store.getVenueMetrics(tournamentId);
  const stage1Schedule = store.getStage1Schedule(tournamentId);
  const iplPlayoffs = store.getIPLPlayoffs(tournamentId) || store.initIPLPlayoffs(tournamentId);
  const incidents = store.getIncidents(tournamentId);

  if (!tournament) {
    return <div className="p-8 text-white">Tournament not found</div>;
  }

  const checkedInCount = teams.filter((t) => t.status === "CHECKED_IN").length;
  const playedCount = teams.filter((t) => t.hasPlayed).length;
  const awaitingCount = teams.length - playedCount;
  const activeMatches = stage1Schedule.allMatches.filter((m) => m.status === "Live" || m.status === "Paused").length;
  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "DISMISSED");

  const slot1 = stage1Schedule.slots[0];
  const slot2 = stage1Schedule.slots[1];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17202a] border border-[#2b3844] rounded-xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
          <p className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-3">
            <span className="text-white font-bold">AI Lab (30 PCs) & Meta lab (10 PCs)</span>
            <span>•</span>
            <span>Stage 1: 13 Teams (6 Matches + 1 BYE)</span>
            <span>•</span>
            <span className="text-amber-400 font-bold">IPL Playoffs for 3 Prize Ranks</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ValidationModal
            tournamentId={tournamentId}
            currentStatus={tournament.status}
          />
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Teams & Stage 1 Status */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Stage 1 Teams
            </span>
            <Users className="h-4 w-4 text-[#ff4655]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {teams.length} Teams
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              <span className="text-amber-400 font-bold">{awaitingCount} Awaiting 1st Match</span>
            </div>
          </div>
          <Link
            href="/admin/teams"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            Manage Attendance ({checkedInCount}/{teams.length}) <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Physical Labs & PC Capacity */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Hardware Capacity
            </span>
            <Monitor className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              4 Matches / Slot
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              AI Lab (3) + Meta lab (1) = 40 PCs
            </div>
          </div>
          <Link
            href="/admin/venues"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            Configure Labs <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Live Matches */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Live Control Desk
            </span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {activeMatches > 0 ? (
                <span className="text-red-400 animate-pulse">{activeMatches} Live</span>
              ) : (
                <span>Ready to Call</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {playedCount} Matches Concluded
            </div>
          </div>
          <Link
            href="/admin/matches"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            Open Match Controller <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* IPL 3-Place Prize Decider */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Prize Podium (IPL)
            </span>
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-amber-400">
              3 Ranks
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              Q1 • Eliminator • Q2 • Final
            </div>
          </div>
          <Link
            href="/admin/bracket"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            View IPL Bracket <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Prize Podium Showcase Card */}
      <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#2b3844]/60 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-black text-white">
              Championship Prize Rankings (IPL Playoff Format)
            </h2>
          </div>
          <Link
            href="/admin/bracket"
            className="text-xs font-bold text-amber-400 hover:underline flex items-center gap-1"
          >
            Interactive Playoff Desk <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-[#0f1923] p-3 rounded-lg border border-amber-500/30 text-center">
            <div className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> 1st Place (Gold Prize)
            </div>
            <div className="text-sm font-black text-white mt-1 truncate">
              {iplPlayoffs.rankings.firstPlace?.name || "TBD (Final Winner)"}
            </div>
          </div>

          <div className="bg-[#0f1923] p-3 rounded-lg border border-slate-500/30 text-center">
            <div className="text-[10px] uppercase font-bold text-slate-300 flex items-center justify-center gap-1">
              <Medal className="h-3.5 w-3.5" /> 2nd Place (Silver Prize)
            </div>
            <div className="text-sm font-black text-white mt-1 truncate">
              {iplPlayoffs.rankings.secondPlace?.name || "TBD (Final Runner-Up)"}
            </div>
          </div>

          <div className="bg-[#0f1923] p-3 rounded-lg border border-amber-700/30 text-center">
            <div className="text-[10px] uppercase font-bold text-amber-600 flex items-center justify-center gap-1">
              <Award className="h-3.5 w-3.5" /> 3rd Place (Bronze Prize)
            </div>
            <div className="text-sm font-black text-white mt-1 truncate">
              {iplPlayoffs.rankings.thirdPlace?.name || "TBD (Loser Qualifier 2)"}
            </div>
          </div>

          <div className="bg-[#0f1923] p-3 rounded-lg border border-[#2b3844] text-center">
            <div className="text-[10px] uppercase font-bold text-gray-500">
              4th Place (Eliminator)
            </div>
            <div className="text-sm font-black text-white mt-1 truncate">
              {iplPlayoffs.rankings.fourthPlace?.name || "TBD (Loser Eliminator)"}
            </div>
          </div>
        </div>
      </div>

      {/* Stage 1 Schedule Snapshot: Time Slot 1 & Time Slot 2 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#ff4655]" />
            Stage 1 Time Slot Fixtures (13 Teams)
          </h2>
          <Link
            href="/admin/fixtures"
            className="text-xs font-bold text-[#ff4655] hover:underline"
          >
            Full Stage 1 Console & Team Swapper →
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Time Slot 1 */}
          {slot1 && (
            <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b3844]/60 pb-2">
                <span className="text-sm font-black text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#ff4655]"></span>
                  Time Slot 1 (4 Matches Max)
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded">
                  100% Station Utilization
                </span>
              </div>

              <div className="space-y-2">
                {slot1.matches.map((m) => (
                  <div
                    key={m.matchId}
                    className="p-2.5 rounded-lg bg-[#0f1923] border border-[#2b3844] flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="text-[10px] font-mono text-gray-500">
                        {m.labName} — {m.stationName}
                      </div>
                      <div className="font-bold text-white mt-0.5">
                        <span className="text-emerald-400">{m.teamA?.name}</span>
                        <span className="text-gray-500 mx-1.5 text-[10px]">vs</span>
                        <span className="text-blue-400">{m.teamB?.name}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#17202a] text-gray-300">
                      {m.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Time Slot 2 */}
          {slot2 && (
            <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2b3844]/60 pb-2">
                <span className="text-sm font-black text-white flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400"></span>
                  Time Slot 2 (2 Matches + 1 BYE + 1 Unused)
                </span>
                <span className="text-[11px] font-mono text-gray-400 font-bold bg-[#0f1923] px-2 py-0.5 rounded">
                  2 Matches Active
                </span>
              </div>

              <div className="space-y-2">
                {slot2.matches.map((m) => {
                  if (m.isBye) {
                    return (
                      <div
                        key={m.matchId}
                        className="p-2.5 rounded-lg bg-[#1e172a] border border-purple-500/40 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="text-[10px] font-mono text-purple-400">
                            {m.labName} — {m.stationName}
                          </div>
                          <div className="font-bold text-white mt-0.5">
                            {m.teamA?.name}
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-purple-900/60 text-purple-300 border border-purple-500/40">
                          Stage 1 BYE
                        </span>
                      </div>
                    );
                  }

                  if (m.isUnused) {
                    return (
                      <div
                        key={m.matchId}
                        className="p-2.5 rounded-lg bg-[#0f1923]/40 border border-dashed border-[#2b3844] flex items-center justify-between text-xs opacity-60"
                      >
                        <div>
                          <div className="text-[10px] font-mono text-gray-500">
                            {m.labName} — {m.stationName}
                          </div>
                          <div className="text-gray-400 mt-0.5 italic">
                            Unoccupied / Warm-up Station
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-gray-800 text-gray-500">
                          UNUSED
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={m.matchId}
                      className="p-2.5 rounded-lg bg-[#0f1923] border border-[#2b3844] flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="text-[10px] font-mono text-gray-500">
                          {m.labName} — {m.stationName}
                        </div>
                        <div className="font-bold text-white mt-0.5">
                          <span className="text-emerald-400">{m.teamA?.name}</span>
                          <span className="text-gray-500 mx-1.5 text-[10px]">vs</span>
                          <span className="text-blue-400">{m.teamB?.name}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#17202a] text-gray-300">
                        {m.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
