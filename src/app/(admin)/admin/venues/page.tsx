import React from "react";
import { store } from "@/lib/store/tournament-store";
import { LabPcGrid } from "@/components/venue/lab-pc-grid";
import { OrganizerConfigPanel } from "@/components/tournament/organizer-config-panel";

export const dynamic = "force-dynamic";

export default function VenuesAdminPage() {
  const tournamentId = "vto-tourney-1";
  const labs = store.getLabs(tournamentId);
  const metrics = store.getVenueMetrics(tournamentId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Physical Labs & Hardware Configuration</h1>
        <p className="text-xs text-gray-400 mt-1">
          Dynamic systems allocation across AI Lab (30 PCs) and Meta lab (10 PCs) • Real-time capacity recalculation.
        </p>
      </div>

      {/* Dynamic Organizer Lab & Timing Configuration */}
      <OrganizerConfigPanel
        initialLabs={labs}
        tournamentId={tournamentId}
      />

      {/* Individual PC Grid & Technical Status */}
      <div className="space-y-4 pt-4 border-t border-[#2b3844]/60">
        <h2 className="text-base font-black text-white">
          Individual Station & PC Hardware Status
        </h2>
        <LabPcGrid
          initialLabs={labs}
          initialMetrics={metrics}
          tournamentId={tournamentId}
        />
      </div>
    </div>
  );
}
