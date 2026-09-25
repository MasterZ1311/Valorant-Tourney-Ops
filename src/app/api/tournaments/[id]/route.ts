import { NextRequest, NextResponse } from "next/server";
import { store } from "@/lib/store/tournament-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const tournament = store.getTournament(params.id);
  if (!tournament) {
    return NextResponse.json(
      { success: false, error: "Tournament not found" },
      { status: 404 }
    );
  }

  const teams = store.getTeams(params.id);
  const venueMetrics = store.getVenueMetrics(params.id);
  const bracket = store.getBracket(params.id);
  const fixtures = store.getFixtures(params.id);
  const incidents = store.getIncidents(params.id);

  // Summary counts
  const checkedInCount = teams.filter((t) => t.status === "CHECKED_IN").length;
  const completedMatches = fixtures.filter((f) => f.status === "VERIFIED" && !f.isBye).length;
  const liveMatches = fixtures.filter((f) => f.status === "LIVE").length;
  const openIncidents = incidents.filter((i) => i.status !== "RESOLVED" && i.status !== "DISMISSED").length;

  return NextResponse.json({
    success: true,
    data: {
      tournament,
      stats: {
        totalTeams: teams.length,
        checkedInTeams: checkedInCount,
        totalPCs: venueMetrics.totalConfiguredPCs,
        workingPCs: venueMetrics.totalWorkingPCs,
        operationalStations: venueMetrics.operationalStations,
        maxSimultaneousMatches: venueMetrics.maxSimultaneousMatches,
        totalMatches: fixtures.filter((f) => !f.isBye).length,
        completedMatches,
        liveMatches,
        openIncidents,
      },
      bracket,
      fixtures,
      venueMetrics,
    },
  });
}
