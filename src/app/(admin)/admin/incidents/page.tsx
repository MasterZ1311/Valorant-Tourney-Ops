import React from "react";
import { store } from "@/lib/store/tournament-store";
import { IncidentDesk } from "@/components/operations/incident-desk";

export const dynamic = "force-dynamic";

export default function IncidentsAdminPage() {
  const tournamentId = "vto-tourney-1";
  const incidents = store.getIncidents(tournamentId);

  return (
    <div className="space-y-6">
      <IncidentDesk initialIncidents={incidents} tournamentId={tournamentId} />
    </div>
  );
}
