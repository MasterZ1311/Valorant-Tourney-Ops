import React from "react";
import { store } from "@/lib/store/tournament-store";
import { TeamRosterManager } from "@/components/tournament/team-roster-manager";

export const dynamic = "force-dynamic";

export default function TeamsAdminPage() {
  const tournamentId = "vto-tourney-1";
  const teams = store.getTeams(tournamentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Teams & Roster Desk</h1>
        <p className="text-xs text-gray-400 mt-1">
          Team registration, Riot ID verification, and attendance check-in.
        </p>
      </div>

      <TeamRosterManager initialTeams={teams} tournamentId={tournamentId} />
    </div>
  );
}
