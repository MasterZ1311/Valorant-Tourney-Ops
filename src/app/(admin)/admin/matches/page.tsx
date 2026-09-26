import React from "react";
import { store } from "@/lib/store/tournament-store";
import { Stage1SlotFixtureBoard } from "@/components/tournament/stage1-slot-fixture-board";
import { LiveMatchBoard } from "@/components/operations/live-match-board";

export const dynamic = "force-dynamic";

export default function MatchesAdminPage() {
  const tournamentId = "vto-tourney-1";
  const stage1Schedule = store.getStage1Schedule(tournamentId);
  const fixtures = store.getFixtures(tournamentId);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-white">Live Match Operations & Attendance Desk</h1>
        <p className="text-xs text-gray-400 mt-1">
          Complete 6-step attendance flow: Call Teams → Waiting/Seating → Ready → Live → Finished → Verified (with Grace Period Forfeit)
        </p>
      </div>

      {/* Stage 1 Live Control */}
      <Stage1SlotFixtureBoard
        initialSchedule={stage1Schedule}
        tournamentId={tournamentId}
      />

      {/* Overall Live Station Monitor */}
      <div className="pt-6 border-t border-[#2b3844]/60">
        <LiveMatchBoard initialFixtures={fixtures} tournamentId={tournamentId} />
      </div>
    </div>
  );
}
