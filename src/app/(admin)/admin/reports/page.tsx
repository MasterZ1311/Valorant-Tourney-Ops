import React from "react";
import { store } from "@/lib/store/tournament-store";
import { generateFinalTournamentSummaryReport } from "@/lib/export/report-generator";
import { Download, FileText, Table, ShieldCheck, Trophy, Layers } from "lucide-react";

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
    return <div className="p-8 text-white">Tournament not found</div>;
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
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Download className="h-6 w-6 text-[#ff4655]" />
          Tournament Reports & Data Export Center
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Export tournament standings, fixture logs, rosters, and audit trails in CSV and text formats.
        </p>
      </div>

      {/* Download Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Final Report */}
        <div className="bg-[#17202a] border border-[#ff4655]/40 rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <Trophy className="h-5 w-5 text-[#ff4655] mb-2" />
            <h3 className="font-bold text-white text-sm">Official Final Report</h3>
            <p className="text-xs text-gray-400 mt-1">
              Complete tournament summary, champion, runner-up, and match outcomes.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=summary`}
            download
            className="w-full py-2 rounded bg-[#ff4655] hover:bg-[#e03d4b] text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download Report (.txt)
          </a>
        </div>

        {/* Fixtures & Results CSV */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <Table className="h-5 w-5 text-emerald-400 mb-2" />
            <h3 className="font-bold text-white text-sm">Fixtures & Results CSV</h3>
            <p className="text-xs text-gray-400 mt-1">
              All round fixtures, station mappings, times, and verified final scores.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=fixtures`}
            download
            className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download Fixtures (.csv)
          </a>
        </div>

        {/* Teams & Players CSV */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <FileText className="h-5 w-5 text-blue-400 mb-2" />
            <h3 className="font-bold text-white text-sm">Teams & Rosters CSV</h3>
            <p className="text-xs text-gray-400 mt-1">
              Captains, institutions, Riot IDs, starter statuses, and attendance check-in.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=teams`}
            download
            className="w-full py-2 rounded bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download Teams (.csv)
          </a>
        </div>

        {/* Audit Log CSV */}
        <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-4 flex flex-col justify-between space-y-4">
          <div>
            <ShieldCheck className="h-5 w-5 text-purple-400 mb-2" />
            <h3 className="font-bold text-white text-sm">Audit Trail CSV</h3>
            <p className="text-xs text-gray-400 mt-1">
              Immutable chronological record of all state transitions and verifications.
            </p>
          </div>
          <a
            href={`/api/tournaments/${tournamentId}/export?type=audit`}
            download
            className="w-full py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Download Audit (.csv)
          </a>
        </div>
      </div>

      {/* Live Report Preview */}
      <div className="bg-[#17202a] border border-[#2b3844] rounded-xl p-5 space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-white">
          Live Official Tournament Report Preview
        </h3>
        <pre className="bg-[#0f1923] border border-[#2b3844] p-4 rounded-lg font-mono text-xs text-gray-300 overflow-x-auto leading-relaxed">
          {summaryReport}
        </pre>
      </div>
    </div>
  );
}
