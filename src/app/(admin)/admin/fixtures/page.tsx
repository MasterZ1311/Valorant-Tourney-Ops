import React from "react";
import { store } from "@/lib/store/tournament-store";
import { Stage1SlotFixtureBoard } from "@/components/tournament/stage1-slot-fixture-board";
import { FixtureTable } from "@/components/tournament/fixture-table";

export const dynamic = "force-dynamic";

export default function FixturesAdminPage() {
  const tournamentId = "vto-tourney-1";
  const teams = store.getTeams(tournamentId);
  const stage1Schedule = store.getStage1Schedule(tournamentId);
  let fixtures = store.getFixtures(tournamentId);

  if (fixtures.length === 0 && teams.length >= 2) {
    fixtures = store.generateTournamentFixtures(tournamentId);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Match Fixtures & Lab Allocations</h1>
        <p className="text-xs text-gray-400 mt-1">
          Dynamic match station scheduling across physical labs • Station allocations & attendance tracking.
        </p>
      </div>

      {/* Stage 1 Slot Fixture Board */}
      <Stage1SlotFixtureBoard
        initialSchedule={stage1Schedule}
        tournamentId={tournamentId}
      />

      {/* Full Chronological Table Reference */}
      <div className="pt-6 border-t border-[#2b3844]/60 space-y-4">
        <h2 className="text-base font-black text-white">
          Complete Schedule Table Reference
        </h2>
        <FixtureTable initialFixtures={fixtures} tournamentId={tournamentId} />
      </div>
    </div>
  );
}
