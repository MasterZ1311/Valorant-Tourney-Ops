import React from "react";
import { store } from "@/lib/store/tournament-store";
import { BracketTabsView } from "@/components/tournament/bracket-tabs-view";

export const dynamic = "force-dynamic";

export default function BracketAdminPage() {
  const tournamentId = "vto-tourney-1";
  const teams = store.getTeams(tournamentId);
  let bracket = store.getBracket(tournamentId);

  if (!bracket && teams.length >= 2) {
    bracket = store.generateBracket(tournamentId);
  }

  let iplPlayoffs = store.getIPLPlayoffs(tournamentId);
  if (!iplPlayoffs && teams.length >= 2) {
    iplPlayoffs = store.initIPLPlayoffs(tournamentId);
  }

  const stage1Schedule = store.getStage1Schedule(tournamentId);

  return (
    <div className="space-y-6">
      <BracketTabsView
        tournamentId={tournamentId}
        initialBracket={bracket}
        initialIPLPlayoffs={iplPlayoffs}
        initialStage1Schedule={stage1Schedule}
      />
    </div>
  );
}
