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
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  const tournamentId = "vto-tourney-1";
  const tournament = store.getTournament(tournamentId);
  const teams = store.getTeams(tournamentId);
  const venueMetrics = store.getVenueMetrics(tournamentId);
  const fixtures = store.getFixtures(tournamentId);
  const incidents = store.getIncidents(tournamentId);
  const bracket = store.getBracket(tournamentId);

  if (!tournament) {
    return <div className="p-8 text-white">Tournament not found</div>;
  }

  const checkedInCount = teams.filter((t) => t.status === "CHECKED_IN").length;
  const playableMatches = fixtures.filter((f) => !f.isBye);
  const completedMatches = playableMatches.filter((f) => f.status === "VERIFIED").length;
  const liveMatches = playableMatches.filter((f) => f.status === "LIVE" || f.status === "PAUSED").length;
  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "DISMISSED");

  const upcomingFixtures = playableMatches
    .filter((f) => f.status === "SCHEDULED" || f.status === "READY" || f.status === "CALLED")
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#17202a] border border-[#2b3844] rounded-xl p-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-white">{tournament.name}</h1>
            <StatusBadge status={tournament.status} />
          </div>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-3">
            <span>{tournament.venueName}</span>
            <span>•</span>
            <span>Date: {tournament.date}</span>
            <span>•</span>
            <span>Format: {tournament.format.replace(/_/g, " ")}</span>
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
        {/* Teams & Attendance */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Teams & Attendance
            </span>
            <Users className="h-4 w-4 text-[#ff4655]" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {checkedInCount} / {teams.length}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {checkedInCount === teams.length ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> 100% Present
                </span>
              ) : (
                <span className="text-amber-400">
                  {teams.length - checkedInCount} Pending Check-in
                </span>
              )}
            </div>
          </div>
          <Link
            href="/admin/teams"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            Manage Attendance <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Live & Completed Matches */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Matches Progress
            </span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {completedMatches} / {playableMatches.length}
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {liveMatches > 0 ? (
                <span className="text-red-400 font-bold flex items-center gap-1 animate-pulse">
                  <Activity className="h-3 w-3" /> {liveMatches} Currently LIVE
                </span>
              ) : (
                <span>0 Live Matches</span>
              )}
            </div>
          </div>
          <Link
            href="/admin/matches"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            Open Live Control Desk <ArrowRight className="h-3 w-3" />
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
              {venueMetrics.operationalStations} Stations
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {venueMetrics.totalWorkingPCs} / {venueMetrics.totalConfiguredPCs} PCs Active (
              {venueMetrics.maxSimultaneousMatches} Matches Max)
            </div>
          </div>
          <Link
            href="/admin/venues"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            View Lab Layouts <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Technical & Conduct Incidents */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
              Active Incidents
            </span>
            <ShieldAlert className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-white">
              {openIncidents.length} Open
            </div>
            <div className="text-xs text-gray-400 mt-0.5">
              {openIncidents.length === 0 ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Zero Open Issues
                </span>
              ) : (
                <span className="text-amber-400">
                  {openIncidents.length} Under Investigation
                </span>
              )}
            </div>
          </div>
          <Link
            href="/admin/incidents"
            className="text-[11px] font-bold text-gray-400 hover:text-white mt-3 flex items-center gap-1"
          >
            Incident Desk <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Main Split: Live Schedule Queue & Quick Action Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Next Matches Queue */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[#ff4655]" />
              Scheduled Fixture Timeline
            </h3>
            <Link
              href="/admin/fixtures"
              className="text-xs font-bold text-[#ff4655] hover:underline"
            >
              View All Fixtures ({playableMatches.length})
            </Link>
          </div>

          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl overflow-hidden divide-y divide-[#2b3844]/60">
            {upcomingFixtures.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-xs">
                No upcoming matches in queue.
              </div>
            ) : (
              upcomingFixtures.map((f) => (
                <div key={f.matchId} className="p-4 flex items-center justify-between hover:bg-[#1f2731]/40 transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-gray-400">
                        {f.matchCode}
                      </span>
                      <span className="text-xs text-gray-500">• {f.roundName}</span>
                    </div>
                    <div className="text-sm font-bold text-white flex items-center gap-2">
                      <span className="text-emerald-400">{f.teamAName}</span>
                      <span className="text-gray-500 text-xs">vs</span>
                      <span className="text-blue-400">{f.teamBName}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right hidden sm:block">
                      <div className="font-mono text-gray-300">{formatTime(f.startTime)}</div>
                      <div className="text-[10px] text-gray-500">{f.stationName}</div>
                    </div>
                    <StatusBadge status={f.status} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Operations Sidebar */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Operations Center
            </h3>

            <div className="space-y-2">
              <Link
                href="/admin/matches"
                className="w-full py-2.5 px-3 rounded-lg bg-[#ff4655] hover:bg-[#e03d4b] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors shadow-md shadow-[#ff4655]/20"
              >
                <span>Live Match Controller</span>
                <Activity className="h-4 w-4" />
              </Link>

              <Link
                href="/volunteer"
                className="w-full py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors"
              >
                <span>Mobile Volunteer View</span>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/display/vto-tourney-1"
                target="_blank"
                className="w-full py-2.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-between transition-colors"
              >
                <span>Projector Scoreboard</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Bracket Snapshot */}
          <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">
                Bracket Snapshot
              </h3>
              <Link href="/admin/bracket" className="text-xs text-[#ff4655] font-bold hover:underline">
                Explore Tree
              </Link>
            </div>

            <div className="text-xs text-gray-300 space-y-1.5">
              <div className="flex justify-between">
                <span>Format:</span>
                <span className="font-bold text-white">Single Elimination</span>
              </div>
              <div className="flex justify-between">
                <span>Bracket Size:</span>
                <span className="font-bold text-white">{bracket?.bracketSize || 16} Slots</span>
              </div>
              <div className="flex justify-between">
                <span>Rounds:</span>
                <span className="font-bold text-white">{bracket?.totalRounds || 4} Total</span>
              </div>
              <div className="flex justify-between">
                <span>Automatic BYEs:</span>
                <span className="font-bold text-white">{bracket?.totalBYEs || 3} Teams</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
