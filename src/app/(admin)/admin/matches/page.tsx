import React from "react";
import { store } from "@/lib/store/tournament-store";
import { LiveMatchBoard } from "@/components/operations/live-match-board";

export const dynamic = "force-dynamic";

export default function MatchesAdminPage() {
  const tournamentId = "vto-tourney-1";
  const fixtures = store.getFixtures(tournamentId);

  return (
    <div className="space-y-6">
      <LiveMatchBoard initialFixtures={fixtures} tournamentId={tournamentId} />
    </div>
  );
}
