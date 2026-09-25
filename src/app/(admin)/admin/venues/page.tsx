import React from "react";
import { store } from "@/lib/store/tournament-store";
import { LabPcGrid } from "@/components/venue/lab-pc-grid";

export const dynamic = "force-dynamic";

export default function VenuesAdminPage() {
  const tournamentId = "vto-tourney-1";
  const labs = store.getLabs(tournamentId);
  const metrics = store.getVenueMetrics(tournamentId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Physical Labs & PC Hardware</h1>
        <p className="text-xs text-gray-400 mt-1">
          Configure computing halls, PC allocations, and station operational health.
        </p>
      </div>

      <LabPcGrid
        initialLabs={labs}
        initialMetrics={metrics}
        tournamentId={tournamentId}
      />
    </div>
  );
}
