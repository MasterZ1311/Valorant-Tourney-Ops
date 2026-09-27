import React from "react";
import { store } from "@/lib/store/tournament-store";
import { generateFinalTournamentSummaryReport } from "@/lib/export/report-generator";
import { Download, FileText, Table, ShieldCheck, Trophy, Terminal } from "lucide-react";
import { TacticalCard } from "@/components/ui/tactical-card";

export const dynamic = "force-dynamic";

export default function ReportsAdminPage() {
  const tournamentId = "vto-tourney-1";
  const tournament = store.getTournament(tournamentId);
  const teams = store.getTeams(tournamentId);
  const fixtures = store.getFixtures(tournamentId);
  const bracket = store.getBracket(tournamentId);
  const venueMetrics = store.getVenueMetrics(tournamentId);
  const incidents = store.getIncidents(tournamentId);

  if (!tournament) {
    return <div className="p-8 text-valorant-ivory font-mono">Tournament not found</div>;
  }

  const summaryReport = generateFinalTournamentSummaryReport({
    tournament,
    teams,
    fixtures,
    bracket,
    venueMetrics,
    incidents,
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-valorant-border pb-4">
        <div>
          <div className="text-[10px] font-mono text-valorant-red uppercase tracking-widest font-bold">
            SECURE EXPORT ENGINE // POST-EVENT ARCHIVE
          </div>
          <h1 className="text-3xl md:text-4xl font-display uppercase tracking-wider text-valorant-ivory">
            Tournament Reports & Data Export Center
          </h1>
          <p className="text-xs font-mono text-valorant-slate mt-1">
            Export tournament standings, fixture logs, rosters, and audit trails in CSV and formatted text.
          </p>
        </div>
      </div>

      {/* Download Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Final Report */}
        <div className="bg-valorant-surface border-2 border-valorant-red/60 p-4 flex flex-col justify-between space-y-4 val-chamfer-btn">
          <div>
            <Trophy className="h-6 w-6 text-valorant-red mb-2" />
            <h3 className="font-display uppercase tracking-wider text-lg text-valorant-ivory">
              Official Final Report
            </h3>
            <p className="text-xs font-mono text-valorant-slate mt-1">
              Complete tournament summary, champion, runner-up, and match outcomes.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=summary`}
            download
            className="w-full py-2.5 bg-valorant-red hover:bg-valorant-redDark text-valorant-ivory font-heading font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-colors val-chamfer-btn shadow-lg shadow-valorant-red/20"
          >
            <Download className="h-4 w-4" />
            Export Report (.txt)
          </a>
        </div>

        {/* Fixtures & Results CSV */}
        <div className="bg-valorant-surface border border-valorant-border p-4 flex flex-col justify-between space-y-4 val-chamfer-btn">
          <div>
            <Table className="h-6 w-6 text-valorant-mint mb-2" />
            <h3 className="font-display uppercase tracking-wider text-lg text-valorant-ivory">
              Fixtures & Results CSV
            </h3>
            <p className="text-xs font-mono text-valorant-slate mt-1">
              All round fixtures, station mappings, times, and verified final scores.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=fixtures`}
            download
            className="w-full py-2.5 bg-valorant-mint/20 hover:bg-valorant-mint/30 text-valorant-mint border border-valorant-mint/40 font-heading font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-colors val-chamfer-btn"
          >
            <Download className="h-4 w-4" />
            Export Fixtures (.csv)
          </a>
        </div>

        {/* Teams & Players CSV */}
        <div className="bg-valorant-surface border border-valorant-border p-4 flex flex-col justify-between space-y-4 val-chamfer-btn">
          <div>
            <FileText className="h-6 w-6 text-valorant-cyan mb-2" />
            <h3 className="font-display uppercase tracking-wider text-lg text-valorant-ivory">
              Teams & Rosters CSV
            </h3>
            <p className="text-xs font-mono text-valorant-slate mt-1">
              Captains, institutions, Riot IDs, starter statuses, and attendance check-in.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=teams`}
            download
            className="w-full py-2.5 bg-valorant-cyan/20 hover:bg-valorant-cyan/30 text-valorant-cyan border border-valorant-cyan/40 font-heading font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-colors val-chamfer-btn"
          >
            <Download className="h-4 w-4" />
            Export Teams (.csv)
          </a>
        </div>

        {/* Audit Log CSV */}
        <div className="bg-valorant-surface border border-valorant-border p-4 flex flex-col justify-between space-y-4 val-chamfer-btn">
          <div>
            <ShieldCheck className="h-6 w-6 text-purple-400 mb-2" />
            <h3 className="font-display uppercase tracking-wider text-lg text-valorant-ivory">
              Audit Trail CSV
            </h3>
            <p className="text-xs font-mono text-valorant-slate mt-1">
              Immutable chronological record of all state transitions and verifications.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=audit`}
            download
            className="w-full py-2.5 bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-500/40 font-heading font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-2 transition-colors val-chamfer-btn"
          >
            <Download className="h-4 w-4" />
            Export Audit (.csv)
          </a>
        </div>
      </div>

      {/* Live Report Preview */}
      <TacticalCard
        title="Live Tournament Dossier // Terminal Stream"
        telemetry="SYSTEM EXPORT RECORD"
        variant="mint"
      >
        <div className="relative">
          <div className="flex items-center gap-2 bg-valorant-elevated px-3 py-1.5 border border-valorant-border text-[11px] font-mono text-valorant-slate">
            <Terminal className="h-3.5 w-3.5 text-valorant-mint" />
            <span>ENCRYPTED TOURNAMENT RECORD OUTPUT</span>
          </div>
          <pre className="bg-valorant-dark border-x border-b border-valorant-border p-4 font-mono text-xs text-valorant-ivory overflow-x-auto leading-relaxed max-h-[480px]">
            {summaryReport}
          </pre>
        </div>
      </TacticalCard>
    </div>
  );
}
