import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";
import {
  generateTeamsCSV,
  generatePlayersCSV,
  generateFixturesCSV,
  generateIncidentsCSV,
  generateAuditCSV,
  generateFinalTournamentSummaryReport,
} from "@/lib/export/report-generator";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "summary";

  const tournament = store.getTournament(params.id);
  if (!tournament) {
    return NextResponse.json({ success: false, error: "Tournament not found" }, { status: 404 });
  }

  const teams = store.getTeams(params.id);
  const fixtures = store.getFixtures(params.id);
  const bracket = store.getBracket(params.id);
  const venueMetrics = store.getVenueMetrics(params.id);
  const incidents = store.getIncidents(params.id);
  const auditLogs = store.getAuditLogs(params.id);

  if (type === "teams") {
    const csv = generateTeamsCSV(teams);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tournament.name.replace(/\s+/g, "_")}_teams.csv"`,
      },
    });
  }

  if (type === "players") {
    const csv = generatePlayersCSV(teams);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tournament.name.replace(/\s+/g, "_")}_players.csv"`,
      },
    });
  }

  if (type === "fixtures") {
    const csv = generateFixturesCSV(fixtures);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tournament.name.replace(/\s+/g, "_")}_fixtures.csv"`,
      },
    });
  }

  if (type === "incidents") {
    const csv = generateIncidentsCSV(incidents);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tournament.name.replace(/\s+/g, "_")}_incidents.csv"`,
      },
    });
  }

  if (type === "audit") {
    const csv = generateAuditCSV(auditLogs);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${tournament.name.replace(/\s+/g, "_")}_audit.csv"`,
      },
    });
  }

  // Default: Final Tournament Summary Report
  const report = generateFinalTournamentSummaryReport({
    tournament,
    teams,
    fixtures,
    bracket,
    venueMetrics,
    incidents,
  });

  return new NextResponse(report, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${tournament.name.replace(/\s+/g, "_")}_final_report.txt"`,
    },
  });
}
