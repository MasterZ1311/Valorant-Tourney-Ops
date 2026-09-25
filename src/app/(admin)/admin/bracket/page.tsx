import React from "react";
import { store } from "@/lib/store/tournament-store";
import { BracketViewer } from "@/components/tournament/bracket-viewer";

export const dynamic = "force-dynamic";

export default function BracketAdminPage() {
  const tournamentId = "vto-tourney-1";
  let bracket = store.getBracket(tournamentId);

  if (!bracket) {
    bracket = store.generateBracket(tournamentId);
  }

  return (
    <div className="space-y-6">
      <BracketViewer initialBracket={bracket} tournamentId={tournamentId} />
    </div>
  );
}
