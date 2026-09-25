import React from "react";
import { store } from "@/lib/store/tournament-store";
import { FixtureTable } from "@/components/tournament/fixture-table";

export const dynamic = "force-dynamic";

export default function FixturesAdminPage() {
  const tournamentId = "vto-tourney-1";
  let fixtures = store.getFixtures(tournamentId);

  if (fixtures.length === 0) {
    fixtures = store.generateTournamentFixtures(tournamentId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Match Fixtures & Timeline</h1>
        <p className="text-xs text-gray-400 mt-1">
          Hardware-constrained match scheduling across labs and stations.
        </p>
      </div>

      <FixtureTable initialFixtures={fixtures} tournamentId={tournamentId} />
    </div>
  );
}
