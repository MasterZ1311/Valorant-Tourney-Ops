import { describe, it, expect } from "vitest";
import { runPreFinalizationValidation } from "../../src/lib/tournament/validator";
import { generateSingleEliminationBracket } from "../../src/lib/tournament/bracket";
import { generateFixtures } from "../../src/lib/scheduling/scheduler";
import { evaluateLabCapacity, calculateVenueCapacity } from "../../src/lib/scheduling/capacity";

describe("Pre-Finalization Validation Pipeline", () => {
  it("fails validation when teams have fewer than 5 starting players", () => {
    const report = runPreFinalizationValidation({
      tournament: { id: "t1", name: "Valorant Cup", status: "READY" },
      teams: [
        {
          id: "team-1",
          name: "Team 1",
          players: [{ id: "p1", name: "Player 1", riotId: "P1#123" }], // Only 1 player
        },
        {
          id: "team-2",
          name: "Team 2",
          players: [{ id: "p2", name: "Player 2", riotId: "P2#123" }],
        },
      ],
      venueMetrics: {
        totalLabs: 1,
        totalConfiguredPCs: 30,
        totalWorkingPCs: 30,
        totalOfflinePCs: 0,
        totalStations: 3,
        operationalStations: 3,
        maxSimultaneousMatches: 3,
        details: [],
      },
      volunteersCount: 2,
    });

    expect(report.overallPassed).toBe(false);
    expect(report.canFinalize).toBe(false);
    const playerCheck = report.checks.find((c) => c.category === "PLAYERS");
    expect(playerCheck?.passed).toBe(false);
  });

  it("passes validation when 13 teams with 5 players, valid bracket, and valid fixtures are provided", () => {
    const teams = Array.from({ length: 13 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      players: Array.from({ length: 5 }, (_, p) => ({
        id: `t${i + 1}-p${p + 1}`,
        name: `Player ${p + 1}`,
        riotId: `Player${p + 1}#TAG`,
      })),
      checkedIn: true,
    }));

    const bracket = generateSingleEliminationBracket(
      teams.map((t, idx) => ({ id: t.id, name: t.name, seed: idx + 1 }))
    );

    const lab1 = evaluateLabCapacity({
      id: "lab-1",
      name: "Lab 1",
      totalPcs: 30,
      pcs: Array.from({ length: 30 }, (_, i) => ({
        id: `pc-${i + 1}`,
        pcNumber: `PC-${i + 1}`,
        labId: "lab-1",
        status: "AVAILABLE",
      })),
      stations: [
        { id: "st-1", name: "Station 1", requiredPCs: 10 },
        { id: "st-2", name: "Station 2", requiredPCs: 10 },
        { id: "st-3", name: "Station 3", requiredPCs: 10 },
      ],
    });

    const lab2 = evaluateLabCapacity({
      id: "lab-2",
      name: "Lab 2",
      totalPcs: 10,
      pcs: Array.from({ length: 10 }, (_, i) => ({
        id: `pc-2-${i + 1}`,
        pcNumber: `PC-2-${i + 1}`,
        labId: "lab-2",
        status: "AVAILABLE",
      })),
      stations: [{ id: "st-4", name: "Station 4", requiredPCs: 10 }],
    });

    const venueMetrics = calculateVenueCapacity([lab1, lab2]);
    const scheduling = generateFixtures(
      bracket,
      [...lab1.stations, ...lab2.stations],
      {
        tournamentStartTime: "2026-10-15T09:00:00.000Z",
      }
    );

    const report = runPreFinalizationValidation({
      tournament: { id: "t-val", name: "VALORANT Invitational", status: "READY" },
      teams,
      venueMetrics,
      bracket,
      fixtures: scheduling.fixtures,
      volunteersCount: 4,
      requireFullAttendance: true,
    });

    expect(report.overallPassed).toBe(true);
    expect(report.canFinalize).toBe(true);
    expect(report.summary.criticalErrors).toBe(0);
    expect(report.summary.passedChecks).toBeGreaterThanOrEqual(8);
  });
});
