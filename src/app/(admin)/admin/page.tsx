import React from "react";
import Image from "next/image";
import Link from "next/link";
import { store } from "@/lib/store/tournament-store";
import { StatusBadge } from "@/components/ui/status-badge";
import { ValidationModal } from "@/components/tournament/validation-modal";
import { TacticalCard } from "@/components/ui/tactical-card";
import { ValorantButton } from "@/components/ui/valorant-button";
import {
  Trophy,
  Users,
  Monitor,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
  ShieldAlert,
  Award,
  Medal,
  Radio,
} from "lucide-react";

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
    return <div className="p-8 text-valorant-ivory font-mono">// TOURNAMENT_NOT_FOUND</div>;
  }

  const checkedInCount = teams.filter((t) => t.status === "CHECKED_IN").length;
  const playedCount = teams.filter((t) => t.hasPlayed).length;
  const awaitingCount = teams.length - playedCount;
  const activeMatches = stage1Schedule
    ? stage1Schedule.allMatches.filter((m) => m.status === "Live" || m.status === "Paused").length
    : 0;
  const openIncidents = incidents.filter(
    (i) => i.status !== "RESOLVED" && i.status !== "DISMISSED"
  );

  const slot1 = stage1Schedule?.slots?.[0];
  const slot2 = stage1Schedule?.slots?.[1];

  return (
    <div className="space-y-8">
      {/* Top Tactical Command Banner */}
      <TacticalCard
        telemetryTag="DIRECTOR_CONSOLE // LAN_OPERATIONS"
        cornerColor="red"
        className="flex flex-wrap items-center justify-between gap-4 p-6 shadow-2xl"
      >
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-display font-black text-valorant-ivory uppercase tracking-wider">
              {tournament.name}
            </h1>
            <StatusBadge status={tournament.status} />
          </div>
          <p className="text-xs font-mono text-valorant-slate flex flex-wrap items-center gap-3">
            <span className="text-valorant-ivory font-bold flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5 text-valorant-red" />
              AI Lab (30 PCs) & Meta lab (10 PCs)
            </span>
            <span>//</span>
            <span>
              Stage 1: {teams.length} Teams{" "}
              {stage1Schedule
                ? `(${stage1Schedule.allMatches.filter((m) => !m.isUnused && !m.isBye).length} Matches)`
                : "(Awaiting Roster)"}
            </span>
            <span>//</span>
            <span className="text-valorant-gold font-bold">IPL Playoffs for 3 Prize Ranks</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <ValidationModal
            tournamentId={tournamentId}
            currentStatus={tournament.status}
          />
        </div>
      </TacticalCard>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Teams & Stage 1 Status */}
        <TacticalCard
          telemetryTag="TEAMS_ROSTER // STAGE_1"
          cornerColor="red"
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-valorant-slate tracking-widest">
              Stage 1 Teams
            </span>
            <div className="w-5 h-5 flex items-center justify-center bg-valorant-red/10 p-0.5">
              <Image
                src="/images/duelist.svg"
                alt="Teams"
                width={14}
                height={14}
                className="opacity-80"
              />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-display font-black text-valorant-ivory tracking-wide">
              {teams.length} TEAMS
            </div>
            <div className="text-xs font-mono text-valorant-slate mt-0.5">
              <span className="text-valorant-gold font-bold">{awaitingCount} Awaiting 1st Match</span>
            </div>
          </div>
          <Link
            href="/admin/teams"
            className="text-[11px] font-heading font-bold uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory mt-4 pt-2 border-t border-valorant-border/60 flex items-center justify-between transition-colors"
          >
            <span>Rosters ({checkedInCount}/{teams.length})</span>
            <ArrowRight className="h-3 w-3 text-valorant-red" />
          </Link>
        </TacticalCard>

        {/* KPI 2: Hardware Capacity */}
        <TacticalCard
          telemetryTag="PC_HARDWARE // VENUE_SLOTS"
          cornerColor="slate"
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-valorant-slate tracking-widest">
              Hardware Capacity
            </span>
            <div className="w-5 h-5 flex items-center justify-center bg-cyan-950/40 p-0.5">
              <Image
                src="/images/sentinel.svg"
                alt="Capacity"
                width={14}
                height={14}
                className="opacity-80"
              />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-display font-black text-valorant-ivory tracking-wide">
              4 MATCHES / SLOT
            </div>
            <div className="text-xs font-mono text-valorant-slate mt-0.5">
              AI Lab (3) + Meta lab (1) = 40 PCs
            </div>
          </div>
          <Link
            href="/admin/venues"
            className="text-[11px] font-heading font-bold uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory mt-4 pt-2 border-t border-valorant-border/60 flex items-center justify-between transition-colors"
          >
            <span>Configure Labs</span>
            <ArrowRight className="h-3 w-3 text-valorant-red" />
          </Link>
        </TacticalCard>

        {/* KPI 3: Live Control Desk */}
        <TacticalCard
          telemetryTag="REALTIME // CONTROL_DESK"
          cornerColor={activeMatches > 0 ? "red" : "slate"}
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-valorant-slate tracking-widest">
              Live Control Desk
            </span>
            <div className="w-5 h-5 flex items-center justify-center bg-emerald-950/40 p-0.5">
              <Image
                src="/images/controller.svg"
                alt="Live"
                width={14}
                height={14}
                className="opacity-80"
              />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-display font-black text-valorant-ivory tracking-wide">
              {activeMatches > 0 ? (
                <span className="text-valorant-red animate-pulse">{activeMatches} MATCHES LIVE</span>
              ) : (
                <span className="text-emerald-400">READY TO CALL</span>
              )}
            </div>
            <div className="text-xs font-mono text-valorant-slate mt-0.5">
              {playedCount} Matches Concluded
            </div>
          </div>
          <Link
            href="/admin/matches"
            className="text-[11px] font-heading font-bold uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory mt-4 pt-2 border-t border-valorant-border/60 flex items-center justify-between transition-colors"
          >
            <span>Open Match Deck</span>
            <ArrowRight className="h-3 w-3 text-valorant-red" />
          </Link>
        </TacticalCard>

        {/* KPI 4: IPL 3-Place Prize Decider */}
        <TacticalCard
          telemetryTag="PRIZE_TIER // IPL_PODIUM"
          cornerColor="gold"
          className="flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase font-bold text-valorant-slate tracking-widest">
              Prize Podium (IPL)
            </span>
            <div className="w-5 h-5 flex items-center justify-center bg-amber-500/10 p-0.5">
              <Image
                src="/images/initiator.svg"
                alt="Prize"
                width={14}
                height={14}
                className="opacity-80"
              />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-display font-black text-valorant-gold tracking-wide">
              3 PRIZE RANKS
            </div>
            <div className="text-xs font-mono text-valorant-slate mt-0.5">
              Q1 • Eliminator • Q2 • Final
            </div>
          </div>
          <Link
            href="/admin/bracket"
            className="text-[11px] font-heading font-bold uppercase tracking-wider text-valorant-slate hover:text-valorant-ivory mt-4 pt-2 border-t border-valorant-border/60 flex items-center justify-between transition-colors"
          >
            <span>View IPL Bracket</span>
            <ArrowRight className="h-3 w-3 text-valorant-gold" />
          </Link>
        </TacticalCard>
      </div>

      {/* Prize Podium Showcase Card */}
      <TacticalCard
        telemetryTag="CHAMPIONSHIP_PODIUM // IPL_PLAYOFF_FORMAT"
        cornerColor="gold"
        className="space-y-4"
      >
        <div className="flex items-center justify-between border-b border-valorant-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <Trophy className="h-5 w-5 text-valorant-gold" />
            <h2 className="text-lg font-display font-black text-valorant-ivory uppercase tracking-wider">
              Championship Prize Rankings (IPL Playoff Format)
            </h2>
          </div>
          <Link
            href="/admin/bracket"
            className="text-xs font-heading font-bold uppercase tracking-wider text-valorant-gold hover:underline flex items-center gap-1"
          >
            Interactive Playoff Desk <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-valorant-dark p-3.5 border border-valorant-gold/40 text-center val-chamfer-btn">
            <div className="text-[10px] font-mono uppercase font-bold text-valorant-gold flex items-center justify-center gap-1">
              <Trophy className="h-3.5 w-3.5" /> 1st Place (Gold Prize)
            </div>
            <div className="text-base font-heading font-black text-valorant-ivory mt-1 truncate uppercase tracking-wider">
              {iplPlayoffs?.rankings?.firstPlace?.name || "TBD (Final Winner)"}
            </div>
          </div>

          <div className="bg-valorant-dark p-3.5 border border-slate-500/40 text-center val-chamfer-btn">
            <div className="text-[10px] font-mono uppercase font-bold text-slate-300 flex items-center justify-center gap-1">
              <Medal className="h-3.5 w-3.5" /> 2nd Place (Silver Prize)
            </div>
            <div className="text-base font-heading font-black text-valorant-ivory mt-1 truncate uppercase tracking-wider">
              {iplPlayoffs?.rankings?.secondPlace?.name || "TBD (Final Runner-Up)"}
            </div>
          </div>

          <div className="bg-valorant-dark p-3.5 border border-amber-700/40 text-center val-chamfer-btn">
            <div className="text-[10px] font-mono uppercase font-bold text-amber-600 flex items-center justify-center gap-1">
              <Award className="h-3.5 w-3.5" /> 3rd Place (Bronze Prize)
            </div>
            <div className="text-base font-heading font-black text-valorant-ivory mt-1 truncate uppercase tracking-wider">
              {iplPlayoffs?.rankings?.thirdPlace?.name || "TBD (Loser Qualifier 2)"}
            </div>
          </div>

          <div className="bg-valorant-dark p-3.5 border border-valorant-border text-center val-chamfer-btn opacity-70">
            <div className="text-[10px] font-mono uppercase font-bold text-valorant-slate">
              4th Place (Eliminator)
            </div>
            <div className="text-base font-heading font-black text-valorant-ivory mt-1 truncate uppercase tracking-wider">
              {iplPlayoffs?.rankings?.fourthPlace?.name || "TBD (Loser Eliminator)"}
            </div>
          </div>
        </div>
      </TacticalCard>

      {/* Stage 1 Schedule Snapshot: Time Slot 1 & Time Slot 2 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-black text-valorant-ivory uppercase tracking-wider flex items-center gap-2">
            <Calendar className="h-5 w-5 text-valorant-red" />
            Stage 1 Time Slot Fixtures {teams.length > 0 ? `(${teams.length} Teams)` : ""}
          </h2>
          <Link
            href="/admin/fixtures"
            className="text-xs font-heading font-bold uppercase tracking-wider text-valorant-red hover:underline"
          >
            Full Stage 1 Console & Team Swapper →
          </Link>
        </div>

        {!slot1 && !slot2 ? (
          <TacticalCard cornerColor="slate" className="p-8 text-center space-y-4">
            <div className="h-12 w-12 bg-valorant-elevated border border-valorant-border flex items-center justify-center mx-auto text-valorant-slate">
              <Calendar className="h-6 w-6 text-valorant-slate" />
            </div>
            <div>
              <h3 className="text-base font-heading font-bold uppercase tracking-wider text-valorant-ivory">
                Clean Tournament Workspace
              </h3>
              <p className="text-xs font-mono text-valorant-slate mt-1 max-w-md mx-auto">
                No fixtures generated yet. Start by registering teams in the Teams & Roster Desk, verifying venue PCs, and generating match schedules.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/admin/teams">
                <ValorantButton variant="primary">
                  <Users className="h-4 w-4 mr-1.5" /> Add Teams
                </ValorantButton>
              </Link>
              <Link href="/admin/venues">
                <ValorantButton variant="secondary">
                  <Monitor className="h-4 w-4 mr-1.5" /> Configure Labs & PCs
                </ValorantButton>
              </Link>
            </div>
          </TacticalCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time Slot 1 */}
            {slot1 && (
              <TacticalCard
                telemetryTag="TIME_SLOT_01 // 4_MATCHES_MAX"
                cornerColor="red"
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-valorant-border/60 pb-2">
                  <span className="text-sm font-heading font-bold uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-valorant-red" />
                    Time Slot 1 (4 Matches Max)
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 border border-emerald-500/30">
                    100% UTILIZATION
                  </span>
                </div>

                <div className="space-y-2">
                  {slot1.matches.map((m) => (
                    <div
                      key={m.matchId}
                      className="p-3 bg-valorant-dark border border-valorant-border flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="text-[10px] font-mono text-valorant-slate uppercase">
                          {m.labName} — {m.stationName}
                        </div>
                        <div className="font-heading font-bold text-valorant-ivory mt-0.5 uppercase tracking-wider">
                          <span className="text-emerald-400">{m.teamA?.name}</span>
                          <span className="text-valorant-slate mx-1.5 text-[10px]">vs</span>
                          <span className="text-cyan-400">{m.teamB?.name}</span>
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>
              </TacticalCard>
            )}

            {/* Time Slot 2 */}
            {slot2 && (
              <TacticalCard
                telemetryTag="TIME_SLOT_02 // 2_ACTIVE_1_BYE"
                cornerColor="slate"
                className="space-y-3"
              >
                <div className="flex items-center justify-between border-b border-valorant-border/60 pb-2">
                  <span className="text-sm font-heading font-bold uppercase tracking-wider text-valorant-ivory flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-400" />
                    Time Slot 2 (2 Matches + 1 BYE + 1 Unused)
                  </span>
                  <span className="text-[10px] font-mono text-valorant-slate font-bold bg-valorant-dark px-2 py-0.5 border border-valorant-border">
                    2 MATCHES ACTIVE
                  </span>
                </div>

                <div className="space-y-2">
                  {slot2.matches.map((m) => {
                    if (m.isBye) {
                      return (
                        <div
                          key={m.matchId}
                          className="p-3 bg-purple-950/20 border border-purple-500/40 flex items-center justify-between text-xs"
                        >
                          <div>
                            <div className="text-[10px] font-mono text-purple-400 uppercase">
                              {m.labName} — {m.stationName}
                            </div>
                            <div className="font-heading font-bold text-valorant-ivory mt-0.5 uppercase tracking-wider">
                              {m.teamA?.name}
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 font-bold bg-purple-900/60 text-purple-300 border border-purple-500/40 uppercase tracking-widest">
                            Stage 1 BYE
                          </span>
                        </div>
                      );
                    }

                    if (m.isUnused) {
                      return (
                        <div
                          key={m.matchId}
                          className="p-3 bg-valorant-dark/40 border border-dashed border-valorant-border flex items-center justify-between text-xs opacity-60"
                        >
                          <div>
                            <div className="text-[10px] font-mono text-valorant-slate uppercase">
                              {m.labName} — {m.stationName}
                            </div>
                            <div className="text-valorant-slate mt-0.5 italic text-xs font-mono">
                              Unoccupied / Warm-up Station
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 font-bold bg-valorant-surface text-valorant-slate uppercase">
                            UNUSED
                          </span>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={m.matchId}
                        className="p-3 bg-valorant-dark border border-valorant-border flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="text-[10px] font-mono text-valorant-slate uppercase">
                            {m.labName} — {m.stationName}
                          </div>
                          <div className="font-heading font-bold text-valorant-ivory mt-0.5 uppercase tracking-wider">
                            <span className="text-emerald-400">{m.teamA?.name}</span>
                            <span className="text-valorant-slate mx-1.5 text-[10px]">vs</span>
                            <span className="text-cyan-400">{m.teamB?.name}</span>
                          </div>
                        </div>
                        <StatusBadge status={m.status} />
                      </div>
                    );
                  })}
                </div>
              </TacticalCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
