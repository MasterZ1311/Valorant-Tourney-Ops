import { describe, it, expect, beforeEach } from "vitest";
import {
  generateSingleEliminationBracket,
  generateSeedOrder,
  getRoundName,
  advanceBracketWinner,
} from "../../src/lib/tournament/bracket";
import {
  canTransitionMatch,
  canTransitionTournament,
  validateMatchTransition,
  validateTournamentTransition,
  VALID_MATCH_TRANSITIONS,
  VALID_TOURNAMENT_TRANSITIONS,
} from "../../src/lib/tournament/state-machine";
import {
  runPreFinalizationValidation,
  FinalizationData,
} from "../../src/lib/tournament/validator";
import {
  isPCWorking,
  evaluateLabCapacity,
  calculateVenueCapacity,
} from "../../src/lib/scheduling/capacity";
import { generateFixtures } from "../../src/lib/scheduling/scheduler";
import {
  BracketStructure,
  Participant,
  MatchStatus,
  TournamentStatus,
} from "../../src/lib/tournament/types";
import {
  DomainLab,
  DomainPC,
  DomainStation,
  PCStatus,
} from "../../src/lib/scheduling/types";
import { store } from "../../src/lib/store/tournament-store";

// ============================================================================
// Helper Utilities for Test Fixture Generation
// ============================================================================

function createMockParticipants(
  count: number,
  prefix: string = "Team"
): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `${prefix} ${i + 1}`,
    seed: i + 1,
    institution: `University ${i + 1}`,
  }));
}

function createMockLab(
  labId: string,
  labName: string,
  stationCount: number,
  pcsPerStation: number = 10,
  startPcIndex: number = 1,
  brokenPcsPerStation: number = 0
): DomainLab {
  const stations: DomainStation[] = [];
  const allPcs: DomainPC[] = [];
  let currentPc = startPcIndex;

  for (let s = 1; s <= stationCount; s++) {
    const stationId = `${labId}-st-${s}`;
    const stationPcs: DomainPC[] = [];

    for (let p = 0; p < pcsPerStation; p++) {
      const isBroken = p < brokenPcsPerStation;
      const pc: DomainPC = {
        id: `pc-${currentPc}`,
        pcNumber: `PC-${String(currentPc).padStart(2, "0")}`,
        labId,
        stationId,
        status: isBroken ? "OFFLINE" : "AVAILABLE",
      };
      stationPcs.push(pc);
      allPcs.push(pc);
      currentPc++;
    }

    stations.push({
      id: stationId,
      name: `${labName} / Station ${s}`,
      labId,
      labName,
      requiredPCs: 10,
      pcs: stationPcs,
      isOperational: false,
      workingPcCount: 0,
    });
  }

  return evaluateLabCapacity({
    id: labId,
    name: labName,
    totalPcs: allPcs.length,
    pcs: allPcs,
    stations,
  });
}

function reevaluateMockLab(lab: DomainLab): DomainLab {
  return evaluateLabCapacity({
    id: lab.id,
    name: lab.name,
    totalPcs: lab.totalPcs,
    pcs: lab.stations.flatMap((s) => s.pcs),
    stations: lab.stations,
  });
}

function createRosterTeams(count: number, playersPerTeam: number = 5) {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    checkedIn: true,
    players: Array.from({ length: playersPerTeam }, (_, p) => ({
      id: `t${i + 1}-p${p + 1}`,
      name: `Player ${p + 1}`,
      riotId: `P${p + 1}#T${i + 1}`,
      verified: true,
    })),
  }));
}

// ============================================================================
// TIER 1: FEATURE COVERAGE (>=5 Test Cases Per Feature)
// ============================================================================

describe("Tier 1: Feature Coverage", () => {
  // --------------------------------------------------------------------------
  // Feature 1: Single Elimination Bracket Engine & Seeding Generation
  // --------------------------------------------------------------------------
  describe("Feature 1: Bracket Engine & Seeding Generation", () => {
    it("1.1 generates exact power-of-two bracket with zero BYEs for 8 teams", () => {
      const teams = createMockParticipants(8);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalRounds).toBe(3);
      expect(bracket.totalBYEs).toBe(0);
      expect(bracket.rounds).toHaveLength(3);
      expect(bracket.rounds[0].matches).toHaveLength(4);
      expect(bracket.rounds[1].matches).toHaveLength(2);
      expect(bracket.rounds[2].matches).toHaveLength(1);
    });

    it("1.2 places Seed 1 and Seed 2 in opposite bracket halves preventing early clash", () => {
      const teams = createMockParticipants(16);
      const bracket = generateSingleEliminationBracket(teams);
      const round1 = bracket.rounds[0];

      // Top half first match has Seed 1
      const seed1Match = round1.matches.find(
        (m) => m.teamA?.seed === 1 || m.teamB?.seed === 1
      );
      // Bottom half match has Seed 2
      const seed2Match = round1.matches.find(
        (m) => m.teamA?.seed === 2 || m.teamB?.seed === 2
      );

      expect(seed1Match).toBeDefined();
      expect(seed2Match).toBeDefined();
      expect(seed1Match?.matchNumber).toBe(1);
      expect(seed2Match?.matchNumber).toBe(5); // Opposite half
    });

    it("1.3 assigns standard esports round names based on distance to finals", () => {
      expect(getRoundName(1, 4)).toBe("Round of 16");
      expect(getRoundName(2, 4)).toBe("Quarterfinals");
      expect(getRoundName(3, 4)).toBe("Semifinals");
      expect(getRoundName(4, 4)).toBe("Grand Finals");
      expect(getRoundName(1, 5)).toBe("Round of 32");
      expect(getRoundName(1, 6)).toBe("Round of 64");
    });

    it("1.4 correctly builds DAG predecessor linkages between consecutive rounds", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const r1 = bracket.rounds[0];
      const r2 = bracket.rounds[1]; // Finals

      expect(r1.matches[0].nextMatchId).toBe(r2.matches[0].id);
      expect(r1.matches[0].nextMatchSlot).toBe("TEAM_A");
      expect(r1.matches[1].nextMatchId).toBe(r2.matches[0].id);
      expect(r1.matches[1].nextMatchSlot).toBe("TEAM_B");

      expect(r2.matches[0].sourceMatchAId).toBe(r1.matches[0].id);
      expect(r2.matches[0].sourceMatchBId).toBe(r1.matches[1].id);
    });

    it("1.5 allocates BYEs to top seeds and automatically advances them to Round 2", () => {
      const teams = createMockParticipants(5); // 5 teams in size 8 bracket = 3 BYEs
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.totalBYEs).toBe(3);
      const byeMatches = bracket.rounds[0].matches.filter((m) => m.isBye);
      expect(byeMatches).toHaveLength(3);

      // Top seeds 1, 2, 3 receive the BYEs
      byeMatches.forEach((m) => {
        expect(m.status).toBe("VERIFIED");
        expect(m.winnerId).toBeDefined();
      });

      // Round 2 should already contain the advanced BYE winners
      const r2 = bracket.rounds[1];
      const advancedSeeds = r2.matches
        .flatMap((m) => [m.teamA?.seed, m.teamB?.seed])
        .filter(Boolean);
      expect(advancedSeeds).toContain(1);
      expect(advancedSeeds).toContain(2);
      expect(advancedSeeds).toContain(3);
    });

    it("1.6 advances verified match winner into designated next round slot immutably", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const r1Match1 = bracket.rounds[0].matches[0];
      const winnerId = r1Match1.teamA!.id;

      const updatedBracket = advanceBracketWinner(bracket, r1Match1.id, winnerId);

      // Input bracket was not mutated
      expect(bracket.rounds[0].matches[0].status).toBe("SCHEDULED");
      // Updated bracket has verified status and advanced winner
      expect(updatedBracket.rounds[0].matches[0].status).toBe("VERIFIED");
      expect(updatedBracket.rounds[0].matches[0].winnerId).toBe(winnerId);
      expect(updatedBracket.rounds[1].matches[0].teamA?.id).toBe(winnerId);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 2: State Machine Invariants & Lifecycle Enforcement
  // --------------------------------------------------------------------------
  describe("Feature 2: State Machine Invariants", () => {
    it("2.1 permits legal tournament lifecycle progression: DRAFT -> READY -> FINALIZED -> LIVE -> COMPLETED -> ARCHIVED", () => {
      const steps: [TournamentStatus, TournamentStatus][] = [
        ["DRAFT", "READY"],
        ["READY", "FINALIZED"],
        ["FINALIZED", "LIVE"],
        ["LIVE", "COMPLETED"],
        ["COMPLETED", "ARCHIVED"],
      ];

      steps.forEach(([current, target]) => {
        expect(canTransitionTournament(current, target)).toBe(true);
        expect(() => validateTournamentTransition(current, target)).not.toThrow();
      });
    });

    it("2.2 rejects illegal tournament status skips (e.g. DRAFT -> LIVE, READY -> COMPLETED)", () => {
      const illegalJumps: [TournamentStatus, TournamentStatus][] = [
        ["DRAFT", "LIVE"],
        ["DRAFT", "COMPLETED"],
        ["READY", "LIVE"],
        ["READY", "COMPLETED"],
        ["COMPLETED", "LIVE"],
        ["ARCHIVED", "DRAFT"],
      ];

      illegalJumps.forEach(([current, target]) => {
        expect(canTransitionTournament(current, target)).toBe(false);
        expect(() => validateTournamentTransition(current, target)).toThrowError(
          /Illegal tournament status transition/
        );
      });
    });

    it("2.3 enforces complete match status lifecycle through RESULT_PENDING to VERIFIED", () => {
      const legalMatchFlow: [MatchStatus, MatchStatus][] = [
        ["SCHEDULED", "CALLED"],
        ["CALLED", "READY"],
        ["READY", "LOBBY_READY"],
        ["LOBBY_READY", "LIVE"],
        ["LIVE", "FINISHED"],
        ["FINISHED", "RESULT_PENDING"],
        ["RESULT_PENDING", "VERIFIED"],
      ];

      legalMatchFlow.forEach(([curr, next]) => {
        expect(canTransitionMatch(curr, next)).toBe(true);
        expect(() => validateMatchTransition(curr, next)).not.toThrow();
      });
    });

    it("2.4 rejects direct winner advancement or unverified score shortcuts (SCHEDULED -> VERIFIED)", () => {
      const illegalMatchShortcuts: [MatchStatus, MatchStatus][] = [
        ["SCHEDULED", "VERIFIED"],
        ["SCHEDULED", "LIVE"],
        ["READY", "FINISHED"],
        ["LIVE", "VERIFIED"],
        ["CALLED", "LIVE"],
      ];

      illegalMatchShortcuts.forEach(([curr, next]) => {
        expect(canTransitionMatch(curr, next)).toBe(false);
        expect(() => validateMatchTransition(curr, next)).toThrowError(
          /Illegal match status transition/
        );
      });
    });

    it("2.5 handles technical pause and resume lifecycle (LIVE -> PAUSED -> LIVE)", () => {
      expect(canTransitionMatch("LIVE", "PAUSED")).toBe(true);
      expect(canTransitionMatch("PAUSED", "LIVE")).toBe(true);
      // But PAUSED cannot jump directly to VERIFIED or FINISHED
      expect(canTransitionMatch("PAUSED", "VERIFIED")).toBe(false);
      expect(canTransitionMatch("PAUSED", "FINISHED")).toBe(false);
    });

    it("2.6 allows match cancellation and forfeit from pre-live and active states", () => {
      expect(canTransitionMatch("SCHEDULED", "CANCELLED")).toBe(true);
      expect(canTransitionMatch("SCHEDULED", "FORFEIT")).toBe(true);
      expect(canTransitionMatch("CALLED", "FORFEIT")).toBe(true);
      expect(canTransitionMatch("READY", "FORFEIT")).toBe(true);
      expect(canTransitionMatch("PAUSED", "FORFEIT")).toBe(true);
      // Terminal states cannot transition further
      expect(VALID_MATCH_TRANSITIONS["CANCELLED"]).toHaveLength(0);
      expect(VALID_MATCH_TRANSITIONS["FORFEIT"]).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 3: Physical Capacity & Hardware Resource Evaluation
  // --------------------------------------------------------------------------
  describe("Feature 3: Physical Capacity & Hardware Evaluation", () => {
    it("3.1 calculates exact lab capacity for 30 PCs configured into 3 stations (10 PCs each)", () => {
      const lab = createMockLab("lab-1", "North Hall", 3, 10, 1, 0);

      expect(lab.totalPcs).toBe(30);
      expect(lab.workingPcCount).toBe(30);
      expect(lab.stations).toHaveLength(3);
      expect(lab.operationalStationsCount).toBe(3);
      lab.stations.forEach((st) => {
        expect(st.isOperational).toBe(true);
        expect(st.workingPcCount).toBe(10);
      });
    });

    it("3.2 calculates multi-lab venue metrics: Lab 1 (30 PCs/3 st) + Lab 2 (10 PCs/1 st) = 4 matches", () => {
      const lab1 = createMockLab("lab-1", "North Hall", 3, 10, 1, 0);
      const lab2 = createMockLab("lab-2", "South Suite", 1, 10, 31, 0);
      const venue = calculateVenueCapacity([lab1, lab2]);

      expect(venue.totalLabs).toBe(2);
      expect(venue.totalConfiguredPCs).toBe(40);
      expect(venue.totalWorkingPCs).toBe(40);
      expect(venue.totalOfflinePCs).toBe(0);
      expect(venue.totalStations).toBe(4);
      expect(venue.operationalStations).toBe(4);
      expect(venue.maxSimultaneousMatches).toBe(4);
    });

    it("3.3 marks station non-operational when working PCs drop below 10", () => {
      // Station with 9 working PCs and 1 broken PC
      const lab = createMockLab("lab-1", "North Hall", 1, 10, 1, 1);

      expect(lab.totalPcs).toBe(10);
      expect(lab.workingPcCount).toBe(9);
      expect(lab.operationalStationsCount).toBe(0);
      expect(lab.stations[0].isOperational).toBe(false);
      expect(lab.stations[0].workingPcCount).toBe(9);
    });

    it("3.4 distinguishes working statuses (AVAILABLE, ASSIGNED, IN_USE) from non-working statuses", () => {
      const working: PCStatus[] = ["AVAILABLE", "ASSIGNED", "IN_USE"];
      const nonWorking: PCStatus[] = [
        "OFFLINE",
        "MAINTENANCE",
        "TECHNICAL_ISSUE",
        "RESERVED",
      ];

      working.forEach((status) => expect(isPCWorking(status)).toBe(true));
      nonWorking.forEach((status) => expect(isPCWorking(status)).toBe(false));
    });

    it("3.5 correctly evaluates pool-level capacity without explicit station PC mapping", () => {
      const pcs: DomainPC[] = Array.from({ length: 28 }, (_, i) => ({
        id: `pc-${i + 1}`,
        pcNumber: `PC-${i + 1}`,
        labId: "lab-pool",
        status: i < 25 ? "AVAILABLE" : "OFFLINE", // 25 working PCs
      }));

      const lab = evaluateLabCapacity({
        id: "lab-pool",
        name: "Pool Lab",
        totalPcs: 28,
        pcs,
        stations: [
          { id: "st-1", name: "Station 1" },
          { id: "st-2", name: "Station 2" },
          { id: "st-3", name: "Station 3" },
        ],
      });

      // 25 working PCs / 10 = floor(2.5) = 2 operational stations
      expect(lab.workingPcCount).toBe(25);
      expect(lab.operationalStationsCount).toBe(2);
      expect(lab.stations[0].isOperational).toBe(true);
      expect(lab.stations[1].isOperational).toBe(true);
      expect(lab.stations[2].isOperational).toBe(false);
    });

    it("3.6 reflects 0 max simultaneous matches when all stations are broken", () => {
      const lab = createMockLab("lab-broken", "Down Hall", 2, 10, 1, 5); // 5 broken PCs per station (5 < 10)
      const venue = calculateVenueCapacity([lab]);

      expect(venue.totalWorkingPCs).toBe(10);
      expect(venue.totalOfflinePCs).toBe(10);
      expect(venue.operationalStations).toBe(0);
      expect(venue.maxSimultaneousMatches).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 4: Fixture Scheduling Engine & Conflict Prevention
  // --------------------------------------------------------------------------
  describe("Feature 4: Fixture Scheduling & Conflict Prevention", () => {
    it("4.1 generates conflict-free schedule honoring match duration and buffer duration", () => {
      const teams = createMockParticipants(8);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 2, 10, 1, 0); // 2 stations
      const result = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T09:00:00.000Z",
        matchDurationMinutes: 45,
        bufferDurationMinutes: 15,
      });

      expect(result.conflicts).toHaveLength(0);
      expect(result.totalMatchesScheduled).toBe(7); // 8 teams = 7 playable matches
      expect(result.simultaneousStationCapacity).toBe(2);

      // Verify each fixture duration
      result.fixtures.forEach((fix) => {
        const start = new Date(fix.startTime).getTime();
        const end = new Date(fix.estimatedEndTime).getTime();
        expect(end - start).toBe(45 * 60 * 1000);
      });
    });

    it("4.2 guarantees station exclusivity (no overlapping matches on same station)", () => {
      const teams = createMockParticipants(8);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 2, 10, 1, 0);
      const result = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T09:00:00.000Z",
        matchDurationMinutes: 45,
        bufferDurationMinutes: 15,
      });

      // Group fixtures by station
      const byStation = new Map<string, typeof result.fixtures>();
      result.fixtures.forEach((f) => {
        if (!f.stationId) return;
        const list = byStation.get(f.stationId) || [];
        list.push(f);
        byStation.set(f.stationId, list);
      });

      byStation.forEach((fixtures, stationId) => {
        // Sort chronologically
        fixtures.sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        for (let i = 0; i < fixtures.length - 1; i++) {
          const currentEndWithBuffer =
            new Date(fixtures[i].estimatedEndTime).getTime() + 15 * 60 * 1000;
          const nextStart = new Date(fixtures[i + 1].startTime).getTime();
          expect(nextStart).toBeGreaterThanOrEqual(currentEndWithBuffer);
        }
      });
    });

    it("4.3 guarantees team non-overlap (no team scheduled simultaneously)", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 2, 10, 1, 0);
      const result = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T09:00:00.000Z",
        matchDurationMinutes: 45,
        bufferDurationMinutes: 15,
      });

      // Team availability tracker across fixtures
      teams.forEach((team) => {
        const teamMatches = result.fixtures.filter(
          (f) => f.teamAId === team.id || f.teamBId === team.id
        );
        for (let i = 0; i < teamMatches.length - 1; i++) {
          const matchAEnd = new Date(teamMatches[i].estimatedEndTime).getTime();
          const matchBStart = new Date(teamMatches[i + 1].startTime).getTime();
          expect(matchBStart).toBeGreaterThanOrEqual(matchAEnd);
        }
      });
    });

    it("4.4 enforces predecessor dependency (Round R+1 match starts after feeder matches complete)", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 2, 10, 1, 0);
      const result = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T09:00:00.000Z",
        matchDurationMinutes: 45,
        bufferDurationMinutes: 15,
      });

      const r1Matches = result.fixtures.filter((f) => f.roundNumber === 1);
      const r2Match = result.fixtures.find((f) => f.roundNumber === 2)!;

      const r1MaxEndTime = Math.max(
        ...r1Matches.map((m) => new Date(m.estimatedEndTime).getTime())
      );
      const r2StartTime = new Date(r2Match.startTime).getTime();

      // R2 match can only start after all R1 feeder matches complete + buffer
      expect(r2StartTime).toBeGreaterThanOrEqual(r1MaxEndTime + 15 * 60 * 1000);
    });

    it("4.5 treats BYE fixtures as zero duration and does not consume physical station time", () => {
      const teams = createMockParticipants(5); // 3 BYEs
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 2, 10, 1, 0);
      const result = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T09:00:00.000Z",
        matchDurationMinutes: 45,
        bufferDurationMinutes: 15,
      });

      const byeFixtures = result.fixtures.filter((f) => f.isBye);
      expect(byeFixtures).toHaveLength(3);
      byeFixtures.forEach((f) => {
        expect(f.stationId).toBeUndefined();
        expect(f.startTime).toBe(f.estimatedEndTime);
        expect(f.status).toBe("VERIFIED");
      });
    });

    it("4.6 throws clear descriptive error when zero operational stations are provided", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-broken", "Down Hall", 1, 10, 1, 5); // non-operational

      expect(() =>
        generateFixtures(bracket, lab.stations, {
          tournamentStartTime: "2026-10-15T09:00:00.000Z",
        })
      ).toThrowError(/0 operational stations/);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 5: Pre-Finalization Validation Pipeline
  // --------------------------------------------------------------------------
  describe("Feature 5: Pre-Finalization Validation Pipeline", () => {
    let baseData: FinalizationData;

    beforeEach(() => {
      const teams = createRosterTeams(4, 5);
      const lab = createMockLab("lab-1", "North Hall", 2, 10, 1, 0);
      const venueMetrics = calculateVenueCapacity([lab]);
      const bracket = generateSingleEliminationBracket(
        teams.map((t) => ({ id: t.id, name: t.name, seed: 1 }))
      );
      const fixturesResult = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T09:00:00.000Z",
      });

      baseData = {
        tournament: { id: "t1", name: "Test Tourney", status: "READY" },
        teams,
        venueMetrics,
        bracket,
        fixtures: fixturesResult.fixtures,
        volunteersCount: 2,
        requireFullAttendance: true,
      };
    });

    it("5.1 passes pre-flight checks when all 10 tournament criteria are fully satisfied", () => {
      const report = runPreFinalizationValidation(baseData);
      expect(report.overallPassed).toBe(true);
      expect(report.canFinalize).toBe(true);
      expect(report.summary.criticalErrors).toBe(0);
    });

    it("5.2 rejects tournament finalization with CRITICAL severity when team count < 2", () => {
      baseData.teams = baseData.teams.slice(0, 1);
      const report = runPreFinalizationValidation(baseData);

      expect(report.overallPassed).toBe(false);
      expect(report.canFinalize).toBe(false);
      const teamCheck = report.checks.find((c) => c.name === "Minimum Team Count");
      expect(teamCheck?.passed).toBe(false);
      expect(teamCheck?.severity).toBe("CRITICAL");
    });

    it("5.3 rejects tournament finalization when any team has fewer than 5 starting players", () => {
      // Team 2 has only 4 players
      baseData.teams[1].players.pop();
      const report = runPreFinalizationValidation(baseData);

      expect(report.canFinalize).toBe(false);
      const rosterCheck = report.checks.find(
        (c) => c.name === "Player Roster Completeness"
      );
      expect(rosterCheck?.passed).toBe(false);
      expect(rosterCheck?.severity).toBe("CRITICAL");
    });

    it("5.4 issues attendance WARNING when requireFullAttendance is active and teams have not checked in", () => {
      baseData.teams[0].checkedIn = false;
      const report = runPreFinalizationValidation(baseData);

      // Warning does not block finalization unless critical, but records warning
      const attendanceCheck = report.checks.find(
        (c) => c.name === "Team Attendance Check-In"
      );
      expect(attendanceCheck?.passed).toBe(false);
      expect(attendanceCheck?.severity).toBe("WARNING");
      expect(report.summary.warnings).toBeGreaterThanOrEqual(1);
    });

    it("5.5 rejects tournament finalization when 0 operational stations are available", () => {
      baseData.venueMetrics.operationalStations = 0;
      const report = runPreFinalizationValidation(baseData);

      expect(report.canFinalize).toBe(false);
      const stationCheck = report.checks.find(
        (c) => c.name === "Station Operational Readiness"
      );
      expect(stationCheck?.passed).toBe(false);
      expect(stationCheck?.severity).toBe("CRITICAL");
    });

    it("5.6 rejects tournament finalization if bracket or fixtures are missing", () => {
      baseData.bracket = null;
      baseData.fixtures = null;
      const report = runPreFinalizationValidation(baseData);

      expect(report.canFinalize).toBe(false);
      const bracketCheck = report.checks.find(
        (c) => c.name === "Tournament Bracket Structure"
      );
      const fixtureCheck = report.checks.find(
        (c) => c.name === "Fixture Generation"
      );
      expect(bracketCheck?.passed).toBe(false);
      expect(fixtureCheck?.passed).toBe(false);
    });
  });

  // --------------------------------------------------------------------------
  // Feature 6: Tournament Store Lifecycle & Mutation Operations
  // --------------------------------------------------------------------------
  describe("Feature 6: Tournament Operations Store Lifecycle", () => {
    it("6.1 creates new tournament with DRAFT status and initial audit logging", () => {
      const tourney = store.createTournament({
        name: "Campus Showdown 2026",
        venueName: "Student Union Hall",
      });

      expect(tourney.id).toBeDefined();
      expect(tourney.status).toBe("DRAFT");
      expect(tourney.name).toBe("Campus Showdown 2026");

      const logs = store.getAuditLogs(tourney.id);
      expect(logs.some((l) => l.action === "CREATE_TOURNAMENT")).toBe(true);
    });

    it("6.2 adds teams and toggles player attendance checking in the store", () => {
      const tourney = store.createTournament({ name: "Attendance Cup" });
      const team = store.addTeam(tourney.id, {
        name: "Viper Squad",
        players: [
          {
            id: "p1",
            teamId: "dummy",
            name: "Viper 1",
            riotId: "Viper#NA1",
            riotTag: "NA1",
            role: "CAPTAIN",
            verified: true,
            present: false,
          },
        ],
      });

      expect(team.status).toBe("REGISTERED");
      expect(team.players[0].present).toBe(false);

      const updatedTeam = store.toggleTeamCheckIn(tourney.id, team.id);
      expect(updatedTeam.status).toBe("CHECKED_IN");
      expect(updatedTeam.players[0].present).toBe(true);
    });

    it("6.3 updates PC status to OFFLINE and automatically recalculates lab capacity", () => {
      // Use seeded tournament
      const tourneyId = "vto-tourney-1";
      const initialMetrics = store.getVenueMetrics(tourneyId);
      expect(initialMetrics.operationalStations).toBe(4);

      // Break a PC in Lab 2 Station 1 (10 PCs -> 9 working PCs)
      store.updatePCStatus(tourneyId, "lab-2", "pc-2-1", "OFFLINE");
      const updatedMetrics = store.getVenueMetrics(tourneyId);

      // Lab 2 station is now non-operational -> total operational dropped to 3
      expect(updatedMetrics.operationalStations).toBe(3);

      // Restore PC back to AVAILABLE
      store.updatePCStatus(tourneyId, "lab-2", "pc-2-1", "AVAILABLE");
      const restoredMetrics = store.getVenueMetrics(tourneyId);
      expect(restoredMetrics.operationalStations).toBe(4);
    });

    it("6.4 records incident tickets and resolves them with audit trail logs", () => {
      const tourneyId = "vto-tourney-1";
      const incident = store.reportIncident({
        tournamentId: tourneyId,
        matchCode: "M01",
        reportedBy: "volunteer-marshal-1",
        category: "HARDWARE",
        severity: "HIGH",
        description: "Monitor power cord disconnected",
      });

      expect(incident.id).toBeDefined();
      expect(incident.status).toBe("REPORTED");

      store.resolveIncident(
        tourneyId,
        incident.id,
        "Power cord re-seated and tested"
      );
      const incidents = store.getIncidents(tourneyId);
      const resolved = incidents.find((i) => i.id === incident.id);

      expect(resolved?.status).toBe("RESOLVED");
      expect(resolved?.resolutionNotes).toContain("Power cord re-seated");
    });

    it("6.5 verifies official result and triggers winner advancement in stored bracket", () => {
      const tourneyId = "vto-tourney-1";
      const bracket = store.getBracket(tourneyId)!;
      const r1m1 = bracket.rounds[0].matches.find((m) => !m.isBye)!;

      const winnerId = r1m1.teamA!.id;
      const updatedBracket = store.submitAndVerifyResult(
        tourneyId,
        r1m1.id,
        winnerId,
        13,
        9
      );

      const targetMatch = updatedBracket.rounds[0].matches.find(
        (m) => m.id === r1m1.id
      )!;
      expect(targetMatch.status).toBe("VERIFIED");
      expect(targetMatch.winnerId).toBe(winnerId);

      const nextRoundMatch = updatedBracket.rounds[1].matches.find(
        (m) => m.id === targetMatch.nextMatchId
      )!;
      expect(
        nextRoundMatch.teamA?.id === winnerId || nextRoundMatch.teamB?.id === winnerId
      ).toBe(true);
    });
  });
});

// ============================================================================
// TIER 2: BOUNDARY & CORNER CASES (>=5 Test Cases Per Feature / Boundary)
// ============================================================================

describe("Tier 2: Boundary & Corner Cases", () => {
  // --------------------------------------------------------------------------
  // Boundary 1: Team Count Boundaries (1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32)
  // --------------------------------------------------------------------------
  describe("Boundary 1: Team Count Boundaries", () => {
    it("2.1 N = 1 team throws error (minimum 2 participants required)", () => {
      const teams = createMockParticipants(1);
      expect(() => generateSingleEliminationBracket(teams)).toThrowError(
        "A tournament requires at least 2 participants."
      );
    });

    it("2.2 N = 2 teams generates 1 round, 1 match, 0 BYEs (minimal legal bracket)", () => {
      const teams = createMockParticipants(2);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(2);
      expect(bracket.totalRounds).toBe(1);
      expect(bracket.totalBYEs).toBe(0);
      expect(bracket.rounds[0].name).toBe("Grand Finals");
      expect(bracket.rounds[0].matches[0].isBye).toBe(false);
    });

    it("2.3 N = 3 teams generates 2 rounds, 1 BYE to Seed 1, bracketSize 4", () => {
      const teams = createMockParticipants(3);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(4);
      expect(bracket.totalRounds).toBe(2);
      expect(bracket.totalBYEs).toBe(1);
      // Seed 1 gets the BYE directly to Finals
      const byeMatch = bracket.rounds[0].matches.find((m) => m.isBye);
      expect(byeMatch?.winnerId).toBe(teams[0].id);
      expect(bracket.rounds[1].matches[0].teamA?.id).toBe(teams[0].id);
    });

    it("2.4 N = 5 teams generates 3 rounds, 3 BYEs to Seeds 1, 2, 3, bracketSize 8", () => {
      const teams = createMockParticipants(5);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalRounds).toBe(3);
      expect(bracket.totalBYEs).toBe(3);
      const byeMatches = bracket.rounds[0].matches.filter((m) => m.isBye);
      expect(byeMatches).toHaveLength(3);
    });

    it("2.5 N = 7 teams generates 3 rounds, 1 BYE to Seed 1, bracketSize 8", () => {
      const teams = createMockParticipants(7);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalRounds).toBe(3);
      expect(bracket.totalBYEs).toBe(1);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(1);
    });

    it("2.6 N = 8 teams generates 3 rounds, 0 BYEs, bracketSize 8", () => {
      const teams = createMockParticipants(8);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(8);
      expect(bracket.totalRounds).toBe(3);
      expect(bracket.totalBYEs).toBe(0);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(0);
    });

    it("2.7 N = 9 teams generates 4 rounds, 7 BYEs, bracketSize 16", () => {
      const teams = createMockParticipants(9);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(16);
      expect(bracket.totalRounds).toBe(4);
      expect(bracket.totalBYEs).toBe(7);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(7);
    });

    it("2.8 N = 13 teams generates 4 rounds, 3 BYEs (standard college tournament size)", () => {
      const teams = createMockParticipants(13);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(16);
      expect(bracket.totalRounds).toBe(4);
      expect(bracket.totalBYEs).toBe(3);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(3);
    });

    it("2.9 N = 15 teams generates 4 rounds, 1 BYE to Seed 1, bracketSize 16", () => {
      const teams = createMockParticipants(15);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(16);
      expect(bracket.totalRounds).toBe(4);
      expect(bracket.totalBYEs).toBe(1);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(1);
    });

    it("2.10 N = 16 teams generates 4 rounds, 0 BYEs, bracketSize 16", () => {
      const teams = createMockParticipants(16);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(16);
      expect(bracket.totalRounds).toBe(4);
      expect(bracket.totalBYEs).toBe(0);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(0);
    });

    it("2.11 N = 17 teams generates 5 rounds, 15 BYEs, bracketSize 32", () => {
      const teams = createMockParticipants(17);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(32);
      expect(bracket.totalRounds).toBe(5);
      expect(bracket.totalBYEs).toBe(15);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(15);
    });

    it("2.12 N = 32 teams generates 5 rounds, 0 BYEs, bracketSize 32", () => {
      const teams = createMockParticipants(32);
      const bracket = generateSingleEliminationBracket(teams);

      expect(bracket.bracketSize).toBe(32);
      expect(bracket.totalRounds).toBe(5);
      expect(bracket.totalBYEs).toBe(0);
      expect(bracket.rounds[0].matches.filter((m) => m.isBye)).toHaveLength(0);
    });
  });

  // --------------------------------------------------------------------------
  // Boundary 2: PC Count Boundaries (0, 1, 4, 10, 30, 40 PCs)
  // --------------------------------------------------------------------------
  describe("Boundary 2: PC Count Boundaries", () => {
    it("2.13 0 PCs produces 0 operational stations and 0 simultaneous matches", () => {
      const lab = evaluateLabCapacity({
        id: "lab-0",
        name: "Empty Lab",
        totalPcs: 0,
        pcs: [],
        stations: [{ id: "st-1", name: "Station 1" }],
      });
      const venue = calculateVenueCapacity([lab]);

      expect(lab.workingPcCount).toBe(0);
      expect(lab.operationalStationsCount).toBe(0);
      expect(venue.maxSimultaneousMatches).toBe(0);
    });

    it("2.14 1 PC produces 0 operational stations (below 10 PC match requirement)", () => {
      const pcs: DomainPC[] = [
        { id: "pc-1", pcNumber: "PC-01", labId: "lab-1", status: "AVAILABLE" },
      ];
      const lab = evaluateLabCapacity({
        id: "lab-1",
        name: "Single PC Lab",
        totalPcs: 1,
        pcs,
        stations: [{ id: "st-1", name: "Station 1", pcs }],
      });

      expect(lab.operationalStationsCount).toBe(0);
      expect(lab.stations[0].isOperational).toBe(false);
    });

    it("2.15 4 PCs produces 0 operational stations (below 10 PC match requirement)", () => {
      const pcs: DomainPC[] = Array.from({ length: 4 }, (_, i) => ({
        id: `pc-${i + 1}`,
        pcNumber: `PC-0${i + 1}`,
        labId: "lab-4",
        status: "AVAILABLE",
      }));
      const lab = evaluateLabCapacity({
        id: "lab-4",
        name: "Sub-threshold Lab",
        totalPcs: 4,
        pcs,
        stations: [{ id: "st-1", name: "Station 1", pcs }],
      });

      expect(lab.operationalStationsCount).toBe(0);
    });

    it("2.16 10 PCs produces exactly 1 operational station and 1 match capacity", () => {
      const lab = createMockLab("lab-10", "Ten PC Lab", 1, 10, 1, 0);
      const venue = calculateVenueCapacity([lab]);

      expect(lab.operationalStationsCount).toBe(1);
      expect(venue.operationalStations).toBe(1);
      expect(venue.maxSimultaneousMatches).toBe(1);
    });

    it("2.17 30 PCs produces exactly 3 operational stations and 3 match capacity", () => {
      const lab = createMockLab("lab-30", "Thirty PC Lab", 3, 10, 1, 0);
      const venue = calculateVenueCapacity([lab]);

      expect(lab.operationalStationsCount).toBe(3);
      expect(venue.operationalStations).toBe(3);
      expect(venue.maxSimultaneousMatches).toBe(3);
    });

    it("2.18 40 PCs across 2 labs produces exactly 4 operational stations and 4 match capacity", () => {
      const lab1 = createMockLab("lab-1", "Lab 1", 3, 10, 1, 0); // 30 PCs
      const lab2 = createMockLab("lab-2", "Lab 2", 1, 10, 31, 0); // 10 PCs
      const venue = calculateVenueCapacity([lab1, lab2]);

      expect(venue.totalConfiguredPCs).toBe(40);
      expect(venue.operationalStations).toBe(4);
      expect(venue.maxSimultaneousMatches).toBe(4);
    });
  });

  // --------------------------------------------------------------------------
  // Boundary 3: Scheduling Duration & Buffer Boundaries (0 Buffer, Large Buffer)
  // --------------------------------------------------------------------------
  describe("Boundary 3: Scheduling Duration & Buffer Boundaries", () => {
    it("2.19 0 buffer duration schedules consecutive matches back-to-back without gap", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 1, 10, 1, 0); // Single station: matches run sequentially
      const result = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T10:00:00.000Z",
        matchDurationMinutes: 30,
        bufferDurationMinutes: 0, // 0 buffer
      });

      expect(result.conflicts).toHaveLength(0);
      const matches = result.fixtures;
      const m1End = new Date(matches[0].estimatedEndTime).getTime();
      const m2Start = new Date(matches[1].startTime).getTime();

      // With 0 buffer, match 2 starts exactly when match 1 ends
      expect(m2Start).toBe(m1End);
    });

    it("2.20 large buffer duration (60 min) enforces large spacing between station matches", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 1, 10, 1, 0);
      const result = generateFixtures(bracket, lab.stations, {
        tournamentStartTime: "2026-10-15T10:00:00.000Z",
        matchDurationMinutes: 45,
        bufferDurationMinutes: 60, // 1 hour buffer
      });

      const matches = result.fixtures;
      const m1End = new Date(matches[0].estimatedEndTime).getTime();
      const m2Start = new Date(matches[1].startTime).getTime();

      expect(m2Start - m1End).toBe(60 * 60 * 1000);
    });

    it("2.21 invalid tournament start time format throws an error", () => {
      const teams = createMockParticipants(4);
      const bracket = generateSingleEliminationBracket(teams);
      const lab = createMockLab("lab-1", "Arena", 1, 10, 1, 0);

      expect(() =>
        generateFixtures(bracket, lab.stations, {
          tournamentStartTime: "invalid-date-string-not-iso",
        })
      ).toThrowError("Invalid tournament start time provided to scheduler.");
    });
  });

  // --------------------------------------------------------------------------
  // Boundary 4: Offline PCs & Status Degradation Boundaries
  // --------------------------------------------------------------------------
  describe("Boundary 4: Offline PCs & Status Degradation", () => {
    it("2.22 station drops to non-operational when a PC is marked OFFLINE", () => {
      const lab = createMockLab("lab-1", "Hall", 1, 10, 1, 0);
      expect(lab.operationalStationsCount).toBe(1);

      lab.stations[0].pcs[0].status = "OFFLINE";
      const updated = reevaluateMockLab(lab);
      expect(updated.operationalStationsCount).toBe(0);
      expect(updated.stations[0].isOperational).toBe(false);
    });

    it("2.23 station drops to non-operational when a PC is marked MAINTENANCE", () => {
      const lab = createMockLab("lab-1", "Hall", 1, 10, 1, 0);
      lab.stations[0].pcs[0].status = "MAINTENANCE";
      const updated = reevaluateMockLab(lab);
      expect(updated.operationalStationsCount).toBe(0);
    });

    it("2.24 station drops to non-operational when a PC is marked TECHNICAL_ISSUE", () => {
      const lab = createMockLab("lab-1", "Hall", 1, 10, 1, 0);
      lab.stations[0].pcs[0].status = "TECHNICAL_ISSUE";
      const updated = reevaluateMockLab(lab);
      expect(updated.operationalStationsCount).toBe(0);
    });

    it("2.25 station drops to non-operational when a PC is marked RESERVED", () => {
      const lab = createMockLab("lab-1", "Hall", 1, 10, 1, 0);
      lab.stations[0].pcs[0].status = "RESERVED";
      const updated = reevaluateMockLab(lab);
      expect(updated.operationalStationsCount).toBe(0);
    });

    it("2.26 multiple offline PCs distributed across stations reduce capacity proportionally", () => {
      // Lab with 3 stations (30 PCs). Take 1 PC offline in station 1, and 2 in station 2
      const lab = createMockLab("lab-1", "Hall", 3, 10, 1, 0);
      lab.stations[0].pcs[0].status = "OFFLINE"; // Station 1 has 9 working
      lab.stations[1].pcs[0].status = "TECHNICAL_ISSUE"; // Station 2 has 8 working
      lab.stations[1].pcs[1].status = "TECHNICAL_ISSUE";

      const updated = reevaluateMockLab(lab);
      // Only Station 3 remains fully operational with 10 working PCs
      expect(updated.operationalStationsCount).toBe(1);
      expect(updated.stations[0].isOperational).toBe(false);
      expect(updated.stations[1].isOperational).toBe(false);
      expect(updated.stations[2].isOperational).toBe(true);
    });
  });

  // --------------------------------------------------------------------------
  // Boundary 5: Illegal State Transition Boundaries
  // --------------------------------------------------------------------------
  describe("Boundary 5: Illegal State Transitions", () => {
    it("2.27 direct jump from SCHEDULED to VERIFIED throws error", () => {
      expect(() => validateMatchTransition("SCHEDULED", "VERIFIED")).toThrowError(
        /Illegal match status transition/
      );
    });

    it("2.28 direct jump from SCHEDULED to LIVE throws error", () => {
      expect(() => validateMatchTransition("SCHEDULED", "LIVE")).toThrowError(
        /Illegal match status transition/
      );
    });

    it("2.29 direct jump from DRAFT to LIVE throws error", () => {
      expect(() => validateTournamentTransition("DRAFT", "LIVE")).toThrowError(
        /Illegal tournament status transition/
      );
    });

    it("2.30 transition out of CANCELLED match state throws error", () => {
      expect(() => validateMatchTransition("CANCELLED", "SCHEDULED")).toThrowError(
        /Illegal match status transition/
      );
    });

    it("2.31 transition out of FORFEIT match state throws error", () => {
      expect(() => validateMatchTransition("FORFEIT", "LIVE")).toThrowError(
        /Illegal match status transition/
      );
    });

    it("2.32 transition out of ARCHIVED tournament state throws error", () => {
      expect(() =>
        validateTournamentTransition("ARCHIVED", "DRAFT")
      ).toThrowError(/Illegal tournament status transition/);
    });
  });
});

// ============================================================================
// TIER 3: CROSS-FEATURE COMBINATIONS (Pairwise Interactions)
// ============================================================================

describe("Tier 3: Cross-Feature Combinations", () => {
  it("3.1 Registration + Seeding + Bracket Alignment: guarantees Seed 1 & 2 meet only in Grand Finals", () => {
    // Register 8 teams in shuffled/arbitrary order
    const rawTeams = [
      { id: "t-4", name: "Team D", seed: 4 },
      { id: "t-1", name: "Team A", seed: 1 },
      { id: "t-7", name: "Team G", seed: 7 },
      { id: "t-2", name: "Team B", seed: 2 },
      { id: "t-6", name: "Team F", seed: 6 },
      { id: "t-3", name: "Team C", seed: 3 },
      { id: "t-8", name: "Team H", seed: 8 },
      { id: "t-5", name: "Team E", seed: 5 },
    ];

    const bracket = generateSingleEliminationBracket(rawTeams);
    const r1 = bracket.rounds[0];

    // Seed 1 plays Seed 8 in Match 1
    const m1 = r1.matches[0];
    expect(m1.teamA?.seed).toBe(1);
    expect(m1.teamB?.seed).toBe(8);

    // Seed 2 plays Seed 7 in Match 3
    const m3 = r1.matches[2];
    expect(m3.teamA?.seed).toBe(2);
    expect(m3.teamB?.seed).toBe(7);

    // Seed 1 is in top half (Match 1 -> Semifinal 1 -> Grand Finals)
    // Seed 2 is in bottom half (Match 3 -> Semifinal 2 -> Grand Finals)
    expect(m1.nextMatchId).not.toBe(m3.nextMatchId);
  });

  it("3.2 Hardware Failure + Dynamic Rescheduling: reassigns pending fixtures excluding broken station", () => {
    const teams = createMockParticipants(8);
    const bracket = generateSingleEliminationBracket(teams);

    // Initially 2 stations
    const lab = createMockLab("lab-1", "Alpha Hall", 2, 10, 1, 0);
    const initialSchedule = generateFixtures(bracket, lab.stations, {
      tournamentStartTime: "2026-10-15T09:00:00.000Z",
    });

    // Both stations were utilized
    const usedStationsInitial = new Set(
      initialSchedule.fixtures.map((f) => f.stationId).filter(Boolean)
    );
    expect(usedStationsInitial.size).toBe(2);

    // Station 1 suffers hardware failure
    lab.stations[0].pcs[0].status = "OFFLINE";
    const evaluatedLab = reevaluateMockLab(lab);
    expect(evaluatedLab.operationalStationsCount).toBe(1);

    // Re-run scheduler with only operational stations
    const operationalStations = evaluatedLab.stations.filter((s) => s.isOperational);
    const emergencySchedule = generateFixtures(bracket, operationalStations, {
      tournamentStartTime: "2026-10-15T09:00:00.000Z",
    });

    expect(emergencySchedule.conflicts).toHaveLength(0);
    // All playable fixtures must now be assigned to Station 2 exclusively
    const assignedStations = emergencySchedule.fixtures
      .filter((f) => !f.isBye)
      .map((f) => f.stationId);
    expect(assignedStations.every((stId) => stId === lab.stations[1].id)).toBe(true);
  });

  it("3.3 Attendance Check-in + Pre-Finalization Gate: blocks un-checked teams, passes on check-in", () => {
    const teams = createRosterTeams(4, 5);
    // Mark one team as not checked in
    teams[3].checkedIn = false;

    const lab = createMockLab("lab-1", "Beta Hall", 2, 10, 1, 0);
    const venueMetrics = calculateVenueCapacity([lab]);
    const bracket = generateSingleEliminationBracket(
      teams.map((t) => ({ id: t.id, name: t.name, seed: 1 }))
    );
    const fixturesResult = generateFixtures(bracket, lab.stations, {
      tournamentStartTime: "2026-10-15T09:00:00.000Z",
    });

    // 1st run: Attendance Warning
    const report1 = runPreFinalizationValidation({
      tournament: { id: "t1", name: "Tourney", status: "READY" },
      teams,
      venueMetrics,
      bracket,
      fixtures: fixturesResult.fixtures,
      volunteersCount: 2,
      requireFullAttendance: true,
    });
    expect(report1.summary.warnings).toBeGreaterThan(0);

    // Check-in the 4th team at the attendance desk
    teams[3].checkedIn = true;
    const report2 = runPreFinalizationValidation({
      tournament: { id: "t1", name: "Tourney", status: "READY" },
      teams,
      venueMetrics,
      bracket,
      fixtures: fixturesResult.fixtures,
      volunteersCount: 2,
      requireFullAttendance: true,
    });
    expect(report2.summary.warnings).toBe(0);
    expect(report2.canFinalize).toBe(true);
  });

  it("3.4 Check-in + Match Forfeit + Auto Advancement: advances non-forfeiting opponent to next round", () => {
    const teams = createMockParticipants(4);
    let bracket = generateSingleEliminationBracket(teams);

    const match1 = bracket.rounds[0].matches[0];
    // Match progress: SCHEDULED -> CALLED -> FORFEIT (Team B forfeits)
    expect(canTransitionMatch(match1.status, "CALLED")).toBe(true);
    match1.status = "CALLED";
    expect(canTransitionMatch(match1.status, "FORFEIT")).toBe(true);
    match1.status = "FORFEIT";

    // Advance Team A as winner
    const winningTeam = match1.teamA!;
    bracket = advanceBracketWinner(bracket, match1.id, winningTeam.id);

    // Target match remains in terminal FORFEIT state, winner advanced into Finals
    const finals = bracket.rounds[1].matches[0];
    expect(finals.teamA?.id).toBe(winningTeam.id);
  });

  it("3.5 State Machine Transitions + Winner Advancement + DAG Chain across consecutive rounds", () => {
    const teams = createMockParticipants(4);
    let bracket = generateSingleEliminationBracket(teams);

    // Simulate Match 1 (Seed 1 vs Seed 4)
    const m1 = bracket.rounds[0].matches[0];
    const steps: MatchStatus[] = [
      "CALLED",
      "READY",
      "LOBBY_READY",
      "LIVE",
      "FINISHED",
      "RESULT_PENDING",
      "VERIFIED",
    ];

    let currentStatus = m1.status;
    for (const next of steps) {
      validateMatchTransition(currentStatus, next);
      currentStatus = next;
    }

    bracket = advanceBracketWinner(bracket, m1.id, m1.teamA!.id);
    expect(bracket.rounds[1].matches[0].teamA?.id).toBe(m1.teamA!.id);

    // Simulate Match 2 (Seed 2 vs Seed 3)
    const m2 = bracket.rounds[0].matches[1];
    currentStatus = m2.status;
    for (const next of steps) {
      validateMatchTransition(currentStatus, next);
      currentStatus = next;
    }

    bracket = advanceBracketWinner(bracket, m2.id, m2.teamA!.id);
    expect(bracket.rounds[1].matches[0].teamB?.id).toBe(m2.teamA!.id);

    // Grand Finals is now fully populated
    const finals = bracket.rounds[1].matches[0];
    expect(finals.teamA).toBeDefined();
    expect(finals.teamB).toBeDefined();
    expect(canTransitionMatch(finals.status, "CALLED")).toBe(true);
  });

  it("3.6 Admin Unlock + Audit Trail + Re-Lock: preserves history and allows fixture modification", () => {
    const tourneyId = "vto-tourney-1";
    // Transition to FINALIZED
    store.updateTournamentStatus(tourneyId, "FINALIZED");
    let current = store.getTournament(tourneyId)!;
    expect(current.status).toBe("FINALIZED");
    expect(current.finalizedAt).toBeDefined();

    // Admin unlock back to READY with recorded reason
    store.updateTournamentStatus(
      tourneyId,
      "READY",
      "Admin unlock: Station 2 replacement"
    );
    current = store.getTournament(tourneyId)!;
    expect(current.status).toBe("READY");

    // Re-lock to FINALIZED
    store.updateTournamentStatus(tourneyId, "FINALIZED", "Re-locked after repair");
    current = store.getTournament(tourneyId)!;
    expect(current.status).toBe("FINALIZED");

    // Audit logs track all operations
    const logs = store.getAuditLogs(tourneyId);
    const unlockLog = logs.find((l) => l.details.includes("Station 2 replacement"));
    const relockLog = logs.find((l) => l.details.includes("Re-locked after repair"));

    expect(unlockLog).toBeDefined();
    expect(relockLog).toBeDefined();
  });
});

// ============================================================================
// TIER 4: REAL-WORLD APPLICATION SCENARIOS
// ============================================================================

describe("Tier 4: Real-World Application Scenarios", () => {
  // --------------------------------------------------------------------------
  // Scenario 1: Realistic 13-Team College LAN Tournament with Technical Pause
  // --------------------------------------------------------------------------
  it("4.1 executes complete 13-team college tournament lifecycle from registration to champion with technical pause", () => {
    // 1. Register 13 Teams with 5 players each (65 total players)
    const collegiateTeams: Participant[] = [
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
    ].map((name, i) => ({
      id: `team-${i + 1}`,
      name,
      seed: i + 1,
      institution: `University of Gaming ${i + 1}`,
    }));

    const rosterTeams = collegiateTeams.map((t) => ({
      id: t.id,
      name: t.name,
      checkedIn: true,
      players: Array.from({ length: 5 }, (_, p) => ({
        id: `${t.id}-p${p + 1}`,
        name: `${t.name} Player ${p + 1}`,
        riotId: `Player${p + 1}#${t.name.substring(0, 3).toUpperCase()}`,
        verified: true,
      })),
    }));

    // 2. Configure Venue: Lab 1 (30 PCs/3 st) + Lab 2 (10 PCs/1 st) = 4 stations
    const lab1 = createMockLab("lab-1", "Lab 1 (North)", 3, 10, 1, 0);
    const lab2 = createMockLab("lab-2", "Lab 2 (South)", 1, 10, 31, 0);
    const allStations = [...lab1.stations, ...lab2.stations];
    const venueMetrics = calculateVenueCapacity([lab1, lab2]);

    expect(venueMetrics.maxSimultaneousMatches).toBe(4);

    // 3. Generate Bracket: 16 slots, 4 rounds, 3 BYEs to top 3 seeds
    let bracket = generateSingleEliminationBracket(collegiateTeams);
    expect(bracket.totalBYEs).toBe(3);
    expect(bracket.totalRounds).toBe(4);

    // 4. Generate Fixtures (45m match + 15m buffer)
    const schedule = generateFixtures(bracket, allStations, {
      tournamentStartTime: "2026-10-15T09:00:00.000Z",
      matchDurationMinutes: 45,
      bufferDurationMinutes: 15,
    });
    expect(schedule.conflicts).toHaveLength(0);
    expect(schedule.totalMatchesScheduled).toBe(12); // 15 total - 3 BYEs = 12 playable

    // 5. Pre-Finalization Validation
    const validation = runPreFinalizationValidation({
      tournament: { id: "col-lan-1", name: "Campus VALORANT Cup", status: "READY" },
      teams: rosterTeams,
      venueMetrics,
      bracket,
      fixtures: schedule.fixtures,
      volunteersCount: 4,
      requireFullAttendance: true,
    });
    expect(validation.canFinalize).toBe(true);

    // 6. Transition Tournament to FINALIZED then LIVE
    expect(canTransitionTournament("READY", "FINALIZED")).toBe(true);
    expect(canTransitionTournament("FINALIZED", "LIVE")).toBe(true);

    // 7. Execute Round 1 with simulated technical pause on Match 2
    const incidents: { category: string; description: string; resolved: boolean }[] =
      [];

    for (let rIdx = 0; rIdx < bracket.rounds.length; rIdx++) {
      const round = bracket.rounds[rIdx];

      for (const match of round.matches) {
        if (match.isBye) continue;

        expect(match.teamA).toBeDefined();
        expect(match.teamB).toBeDefined();

        // Lifecycle: SCHEDULED -> CALLED -> READY -> LOBBY_READY -> LIVE
        match.status = "CALLED";
        match.status = "READY";
        match.status = "LOBBY_READY";
        match.status = "LIVE";

        // Technical incident on Round 1, Match 2 (headset disconnect)
        if (round.roundNumber === 1 && match.matchNumber === 2) {
          expect(canTransitionMatch(match.status, "PAUSED")).toBe(true);
          match.status = "PAUSED";
          incidents.push({
            category: "HARDWARE",
            description: "PC-14 audio headset disconnected",
            resolved: true,
          });
          // Resumed
          expect(canTransitionMatch(match.status, "LIVE")).toBe(true);
          match.status = "LIVE";
        }

        // Higher seed wins deterministically
        const winner =
          (match.teamA?.seed ?? 99) <= (match.teamB?.seed ?? 99)
            ? match.teamA!
            : match.teamB!;

        match.status = "FINISHED";
        match.status = "RESULT_PENDING";
        match.status = "VERIFIED";

        bracket = advanceBracketWinner(bracket, match.id, winner.id);
      }
    }

    // 8. Crowning Champion
    const grandFinal = bracket.rounds[bracket.rounds.length - 1].matches[0];
    expect(grandFinal.status).toBe("VERIFIED");
    expect(grandFinal.winnerId).toBe("team-1"); // Seed 1: Sentinels Academy
    expect(incidents).toHaveLength(1);
    expect(incidents[0].resolved).toBe(true);
  });

  // --------------------------------------------------------------------------
  // Scenario 2: 16-Team Tournament with Mid-Tournament PC Breakdown & Reallocation
  // --------------------------------------------------------------------------
  it("4.2 handles mid-tournament station failure and dynamic schedule reallocation cleanly", () => {
    // 16 teams registered
    const teams = createMockParticipants(16, "AlphaTeam");
    let bracket = generateSingleEliminationBracket(teams);
    expect(bracket.totalBYEs).toBe(0);
    expect(bracket.rounds[0].matches).toHaveLength(8);

    // Initial setup: 5 stations across 2 labs (Lab 1: 3 stations, Lab 2: 2 stations = 50 PCs)
    const lab1 = createMockLab("lab-1", "Lab North", 3, 10, 1, 0);
    const lab2 = createMockLab("lab-2", "Lab South", 2, 10, 31, 0);
    let allStations = [...lab1.stations, ...lab2.stations];
    expect(allStations.filter((s) => s.isOperational)).toHaveLength(5);

    // Initial schedule on 5 stations
    const schedule1 = generateFixtures(bracket, allStations, {
      tournamentStartTime: "2026-10-15T09:00:00.000Z",
      matchDurationMinutes: 45,
      bufferDurationMinutes: 15,
    });
    expect(schedule1.conflicts).toHaveLength(0);

    // Play Round 1 matches
    for (const match of bracket.rounds[0].matches) {
      match.status = "VERIFIED";
      const winner = match.teamA!;
      bracket = advanceBracketWinner(bracket, match.id, winner.id);
    }

    // DISASTER: 2 PCs in Station 2 (Lab 1) suffer power surge mid-event
    lab1.stations[1].pcs[0].status = "TECHNICAL_ISSUE";
    lab1.stations[1].pcs[1].status = "TECHNICAL_ISSUE";

    const reevaluatedLab1 = reevaluateMockLab(lab1);
    expect(reevaluatedLab1.operationalStationsCount).toBe(2); // Station 2 is down!
    expect(reevaluatedLab1.stations[1].isOperational).toBe(false);

    // Reconstruct operational station list (Stations 1, 3, 4, 5 remain operational)
    const remainingOperationalStations = [
      ...reevaluatedLab1.stations.filter((s) => s.isOperational),
      ...lab2.stations.filter((s) => s.isOperational),
    ];
    expect(remainingOperationalStations).toHaveLength(4);

    // Reallocate remaining rounds (Quarterfinals, Semifinals, Finals) onto the 4 operational stations
    const reallocatedSchedule = generateFixtures(
      bracket,
      remainingOperationalStations,
      {
        tournamentStartTime: "2026-10-15T12:00:00.000Z",
        matchDurationMinutes: 45,
        bufferDurationMinutes: 15,
      }
    );

    expect(reallocatedSchedule.conflicts).toHaveLength(0);

    // Zero matches allocated to the failed Station 2
    const failedStationId = lab1.stations[1].id;
    const assignedStations = reallocatedSchedule.fixtures
      .filter((f) => !f.isBye)
      .map((f) => f.stationId);
    expect(assignedStations).not.toContain(failedStationId);

    // Complete tournament to verify stability
    for (let r = 1; r < bracket.rounds.length; r++) {
      for (const match of bracket.rounds[r].matches) {
        match.status = "VERIFIED";
        bracket = advanceBracketWinner(bracket, match.id, match.teamA!.id);
      }
    }

    const finals = bracket.rounds[bracket.rounds.length - 1].matches[0];
    expect(finals.status).toBe("VERIFIED");
    expect(finals.winnerId).toBe("team-1");
  });

  // --------------------------------------------------------------------------
  // Scenario 3: 8-Team Rapid-Fire Double Round with 0 Buffer
  // --------------------------------------------------------------------------
  it("4.3 executes rapid-fire 8-team tournament with 0 buffer without scheduling collisions", () => {
    const teams = createMockParticipants(8, "BlitzTeam");
    let bracket = generateSingleEliminationBracket(teams);

    const lab = createMockLab("lab-blitz", "LAN Center", 2, 10, 1, 0); // 2 stations
    const schedule = generateFixtures(bracket, lab.stations, {
      tournamentStartTime: "2026-10-15T14:00:00.000Z",
      matchDurationMinutes: 30,
      bufferDurationMinutes: 0,
    });

    expect(schedule.conflicts).toHaveLength(0);
    expect(schedule.totalMatchesScheduled).toBe(7);

    // Verify time continuity on each station
    [lab.stations[0].id, lab.stations[1].id].forEach((stId) => {
      const stFixtures = schedule.fixtures
        .filter((f) => f.stationId === stId)
        .sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );

      for (let i = 0; i < stFixtures.length - 1; i++) {
        const prevEnd = new Date(stFixtures[i].estimatedEndTime).getTime();
        const nextStart = new Date(stFixtures[i + 1].startTime).getTime();
        // With 0 buffer, next match starts immediately or later
        expect(nextStart).toBeGreaterThanOrEqual(prevEnd);
      }
    });

    // Advance to Finals
    for (let r = 0; r < bracket.rounds.length; r++) {
      const round = bracket.rounds[r];
      for (const match of round.matches) {
        match.status = "VERIFIED";
        bracket = advanceBracketWinner(bracket, match.id, match.teamA!.id);
      }
    }

    const championMatch = bracket.rounds[2].matches[0];
    expect(championMatch.winnerId).toBe("team-1");
  });
});
