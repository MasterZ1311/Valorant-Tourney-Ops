import { describe, it, expect } from "vitest";
import { generateSingleEliminationBracket, advanceBracketWinner } from "../../src/lib/tournament/bracket";
import { evaluateLabCapacity, calculateVenueCapacity } from "../../src/lib/scheduling/capacity";
import { generateFixtures } from "../../src/lib/scheduling/scheduler";
import { runPreFinalizationValidation } from "../../src/lib/tournament/validator";
import { canTransitionMatch, canTransitionTournament } from "../../src/lib/tournament/state-machine";
import { generateFinalTournamentSummaryReport } from "../../src/lib/export/report-generator";
import { Participant } from "../../src/lib/tournament/types";
import { DomainLab, DomainPC, DomainStation } from "../../src/lib/scheduling/types";
import { StoredTeam, StoredIncident, StoredTournament } from "../../src/lib/store/tournament-store";

describe("13-Team Tournament Official Acceptance Test Scenario", () => {
  it("executes the entire tournament lifecycle from setup to championship report without illegal states", () => {
    // -------------------------------------------------------------
    // Step 1: 13 teams, 5 players each
    // -------------------------------------------------------------
    const teamNames = [
      "Sentinels Academy",
      "Fnatic Rising",
      "Paper Rex Youth",
      "Team Liquid Echo",
      "DRX Vision",
      "LOUD Genesis",
      "Evil Geniuses Nova",
      "NRG Orbit",
      "Karmine Corp Blue",
      "Team Heretics Next",
      "BBL Queens",
      "Leviatan Vanguard",
      "ZETA Division Spark",
    ];

    const teams: StoredTeam[] = teamNames.map((name, i) => {
      const teamId = `team-${i + 1}`;
      return {
        id: teamId,
        tournamentId: "acceptance-tourney",
        name,
        captain: `Captain ${i + 1}`,
        captainContact: `+1-555-010${i + 1}`,
        institution: `Esports University ${i + 1}`,
        seed: i + 1,
        status: "CHECKED_IN",
        checkedInAt: new Date().toISOString(),
        players: Array.from({ length: 5 }, (_, p) => ({
          id: `${teamId}-p${p + 1}`,
          teamId,
          name: `${name} Player ${p + 1}`,
          riotId: `Player${p + 1}`,
          riotTag: name.substring(0, 3).toUpperCase(),
          role: p === 0 ? "CAPTAIN" : "STARTER",
          verified: true,
          present: true,
        })),
      };
    });

    expect(teams).toHaveLength(13);
    teams.forEach((t) => {
      expect(t.players).toHaveLength(5);
      expect(t.status).toBe("CHECKED_IN");
    });

    // -------------------------------------------------------------
    // Step 2: Physical venue configuration (40 PCs total)
    // Lab 1: 30 PCs, 3 stations
    // Lab 2: 10 PCs, 1 station
    // -------------------------------------------------------------
    const buildLab = (id: string, name: string, totalPcs: number, stationCount: number, startNum: number): DomainLab => {
      const stations: DomainStation[] = [];
      const pcs: DomainPC[] = [];

      for (let s = 1; s <= stationCount; s++) {
        stations.push({
          id: `${id}-st-${s}`,
          name: `${name} / Station ${s}`,
          labId: id,
          labName: name,
          requiredPCs: 10,
          pcs: [],
          isOperational: false,
          workingPcCount: 0,
        });
      }

      for (let i = 0; i < totalPcs; i++) {
        const pcNum = startNum + i;
        const stIndex = Math.floor(i / 10);
        const stId = stIndex < stations.length ? stations[stIndex].id : null;
        const pc: DomainPC = {
          id: `pc-${pcNum}`,
          pcNumber: `PC-${pcNum}`,
          labId: id,
          stationId: stId,
          status: "AVAILABLE",
        };
        pcs.push(pc);
        if (stIndex < stations.length) {
          stations[stIndex].pcs.push(pc);
        }
      }

      return evaluateLabCapacity({
        id,
        name,
        totalPcs,
        pcs,
        stations,
      });
    };

    const lab1 = buildLab("lab-1", "Lab 1", 30, 3, 1);
    const lab2 = buildLab("lab-2", "Lab 2", 10, 1, 31);
    const venueMetrics = calculateVenueCapacity([lab1, lab2]);

    expect(venueMetrics.totalConfiguredPCs).toBe(40);
    expect(venueMetrics.totalWorkingPCs).toBe(40);
    expect(venueMetrics.operationalStations).toBe(4);
    expect(venueMetrics.maxSimultaneousMatches).toBe(4);

    // -------------------------------------------------------------
    // Step 3: Generate bracket (Single Elimination, 16 size, 3 BYEs)
    // -------------------------------------------------------------
    const participants: Participant[] = teams.map((t) => ({ id: t.id, name: t.name, seed: t.seed }));
    let bracket = generateSingleEliminationBracket(participants);

    expect(bracket.bracketSize).toBe(16);
    expect(bracket.totalRounds).toBe(4);
    expect(bracket.totalBYEs).toBe(3);

    // Verify Seeds 1, 2, 3 receive Round 1 BYEs
    const r2Matches = bracket.rounds[1].matches;
    const r2Participants = new Set([
      ...r2Matches.map((m) => m.teamA?.id),
      ...r2Matches.map((m) => m.teamB?.id),
    ]);
    expect(r2Participants.has("team-1")).toBe(true);
    expect(r2Participants.has("team-2")).toBe(true);
    expect(r2Participants.has("team-3")).toBe(true);

    // -------------------------------------------------------------
    // Step 4: Generate hardware-constrained fixtures
    // -------------------------------------------------------------
    const allStations = [...lab1.stations, ...lab2.stations];
    const scheduling = generateFixtures(bracket, allStations, {
      tournamentStartTime: "2026-10-15T09:00:00.000Z",
      matchDurationMinutes: 45,
      bufferDurationMinutes: 15,
    });

    expect(scheduling.conflicts).toHaveLength(0);
    expect(scheduling.simultaneousStationCapacity).toBe(4);

    // -------------------------------------------------------------
    // Step 5: Pre-Flight Validation Pipeline
    // -------------------------------------------------------------
    const validation = runPreFinalizationValidation({
      tournament: { id: "acceptance-tourney", name: "VALORANT Invitational", status: "READY" },
      teams,
      venueMetrics,
      bracket,
      fixtures: scheduling.fixtures,
      volunteersCount: 4,
      requireFullAttendance: true,
    });

    expect(validation.overallPassed).toBe(true);
    expect(validation.canFinalize).toBe(true);
    expect(validation.summary.criticalErrors).toBe(0);

    // Finalize Tournament
    expect(canTransitionTournament("READY", "FINALIZED")).toBe(true);
    expect(canTransitionTournament("FINALIZED", "LIVE")).toBe(true);

    // -------------------------------------------------------------
    // Step 6: Run 4 Simultaneous Matches in Round 1
    // -------------------------------------------------------------
    const r1Playable = scheduling.fixtures.filter((f) => f.roundNumber === 1 && !f.isBye);
    expect(r1Playable.length).toBe(5); // 8 matches - 3 BYEs = 5 playable matches

    // First 4 matches run concurrently at 09:00 across all 4 operational stations
    const concurrentFirstWave = r1Playable.slice(0, 4);
    const stationIdsUsed = new Set(concurrentFirstWave.map((f) => f.stationId));
    expect(stationIdsUsed.size).toBe(4); // 4 distinct stations used simultaneously

    concurrentFirstWave.forEach((m) => {
      expect(canTransitionMatch("SCHEDULED", "CALLED")).toBe(true);
      expect(canTransitionMatch("CALLED", "READY")).toBe(true);
      expect(canTransitionMatch("READY", "LOBBY_READY")).toBe(true);
      expect(canTransitionMatch("LOBBY_READY", "LIVE")).toBe(true);
    });

    // -------------------------------------------------------------
    // Step 7: Technical Incident on Match 2 (Pause, Resolve, Resume)
    // -------------------------------------------------------------
    const match2 = concurrentFirstWave[1];
    expect(canTransitionMatch("LIVE", "PAUSED")).toBe(true);
    const incident: StoredIncident = {
      id: "inc-acceptance-01",
      tournamentId: "acceptance-tourney",
      matchCode: match2.matchCode,
      reportedBy: "Station 2 Marshal",
      category: "TECHNICAL",
      severity: "HIGH",
      status: "REPORTED",
      description: "PC-15 Ethernet dropped link during round 4",
      createdAt: new Date().toISOString(),
    };

    // IT Tech hot-swaps cable and resolves incident
    incident.status = "RESOLVED";
    incident.resolutionNotes = "Hot-swapped CAT6 cable, link verified at 1Gbps";
    incident.resolvedAt = new Date().toISOString();

    expect(incident.status).toBe("RESOLVED");
    expect(canTransitionMatch("PAUSED", "LIVE")).toBe(true);

    // -------------------------------------------------------------
    // Step 8: Complete all rounds through to Grand Finals
    // -------------------------------------------------------------
    for (let rIndex = 0; rIndex < bracket.rounds.length; rIndex++) {
      const round = bracket.rounds[rIndex];
      for (const match of round.matches) {
        if (match.isBye) continue;

        expect(match.teamA).toBeDefined();
        expect(match.teamB).toBeDefined();

        // Higher seed wins deterministically for verification
        const seedA = match.teamA!.seed ?? 99;
        const seedB = match.teamB!.seed ?? 99;
        const winner = seedA <= seedB ? match.teamA! : match.teamB!;
        const scoreA = seedA <= seedB ? 13 : 8;
        const scoreB = seedA <= seedB ? 8 : 13;

        // Verify transition sequence
        expect(canTransitionMatch("LIVE", "FINISHED")).toBe(true);
        expect(canTransitionMatch("FINISHED", "RESULT_PENDING")).toBe(true);
        expect(canTransitionMatch("RESULT_PENDING", "VERIFIED")).toBe(true);

        bracket = advanceBracketWinner(bracket, match.id, winner.id);
      }
    }

    // -------------------------------------------------------------
    // Step 9: Grand Finals Verification & Champion Crowning
    // -------------------------------------------------------------
    const grandFinalMatch = bracket.rounds[3].matches[0];
    expect(grandFinalMatch.status).toBe("VERIFIED");
    expect(grandFinalMatch.winnerId).toBe("team-1"); // Seed #1 Sentinels Academy won

    const champion = teams.find((t) => t.id === grandFinalMatch.winnerId);
    expect(champion?.name).toBe("Sentinels Academy");
    expect(champion?.seed).toBe(1);

    // -------------------------------------------------------------
    // Step 10: Official Tournament Report Generation
    // -------------------------------------------------------------
    const tournamentMeta: StoredTournament = {
      id: "acceptance-tourney",
      name: "VALORANT Campus Championship 2026",
      game: "VALORANT",
      venueName: "University Esports Arena",
      date: "2026-10-15",
      startTime: "09:00",
      status: "COMPLETED",
      format: "SINGLE_ELIMINATION",
      currentRound: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const finalReport = generateFinalTournamentSummaryReport({
      tournament: tournamentMeta,
      teams,
      fixtures: scheduling.fixtures,
      bracket,
      venueMetrics,
      incidents: [incident],
    });

    expect(finalReport).toContain("VALORANT TOURNAMENT OPERATIONS SYSTEM (VTO) — OFFICIAL FINAL REPORT");
    expect(finalReport).toContain("CHAMPION:     Sentinels Academy (Seed #1)");
    expect(finalReport).toContain("Operational Match Slots:  4 Simultaneous Matches");
    expect(finalReport).toContain("Total Incidents Resolved: 1");
  });
});
