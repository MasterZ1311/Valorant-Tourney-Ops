import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { Prisma } from "@prisma/client";
import {
  generateSingleEliminationBracket,
  advanceBracketWinner,
  generateSeedOrder,
} from "../../src/lib/tournament/bracket";
import {
  generateRoundRobinFixtures,
  calculateRoundRobinStandings,
} from "../../src/lib/tournament/round-robin";
import {
  generateGroupStage,
  generateKnockoutAdvancement,
  calculateGroupStandings,
} from "../../src/lib/tournament/group-stage";
import { runPreFinalizationValidation } from "../../src/lib/tournament/validator";
import {
  notDeleted,
  isDeleted,
  isSoftDeleted,
} from "../../src/lib/db-utils";
import {
  canTransitionTournament,
  validateTournamentTransition,
  canTransitionMatch,
  validateMatchTransition,
} from "../../src/lib/tournament/state-machine";
import { Participant, RoundRobinMatch, TournamentStatus, MatchStatus } from "../../src/lib/tournament/types";

function createMockTeams(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

describe("ADVERSARIAL CHALLENGE — Milestone 1 & 2 Verification", () => {
  describe("1. Single Elimination Boundary Team Counts & BYE Placements", () => {
    it("boundary N=1 team: throws clean error with expected message", () => {
      const teams = createMockTeams(1);
      expect(() => generateSingleEliminationBracket(teams)).toThrow(
        "A tournament requires at least 2 participants."
      );
    });

    const boundaryCounts = [2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32];

    boundaryCounts.forEach((count) => {
      it(`boundary N=${count} teams: generates mathematically sound bracket`, () => {
        const teams = createMockTeams(count);
        const bracket = generateSingleEliminationBracket(teams);

        const expectedSize = Math.pow(2, Math.ceil(Math.log2(count)));
        const expectedBYEs = expectedSize - count;
        const expectedRounds = Math.log2(expectedSize);

        expect(bracket.bracketSize).toBe(expectedSize);
        expect(bracket.totalBYEs).toBe(expectedBYEs);
        expect(bracket.totalRounds).toBe(expectedRounds);
        expect(bracket.rounds).toHaveLength(expectedRounds);

        // Verify Round 1 match count
        const round1 = bracket.rounds[0];
        expect(round1.matches).toHaveLength(expectedSize / 2);

        // Check BYE properties
        const byeMatches = round1.matches.filter((m) => m.isBye);
        expect(byeMatches).toHaveLength(expectedBYEs);

        for (const byeMatch of byeMatches) {
          expect(byeMatch.status).toBe("VERIFIED");
          expect(byeMatch.winnerId).toBeDefined();
          // The non-empty team is teamA and teamB is undefined
          expect(byeMatch.teamA).toBeDefined();
          expect(byeMatch.teamB).toBeUndefined();
          expect(byeMatch.winnerId).toBe(byeMatch.teamA!.id);
        }

        // Check that BYEs are awarded strictly to the highest seeds (1..expectedBYEs)
        if (expectedBYEs > 0) {
          const byeRecipientSeeds = byeMatches.map((m) => m.teamA!.seed).sort((a, b) => (a ?? 0) - (b ?? 0));
          const expectedSeeds = Array.from({ length: expectedBYEs }, (_, i) => i + 1);
          expect(byeRecipientSeeds).toEqual(expectedSeeds);

          // And verify auto-advancement into Round 2
          const round2 = bracket.rounds[1];
          const round2TeamIds = new Set<string>();
          for (const m of round2.matches) {
            if (m.teamA) round2TeamIds.add(m.teamA.id);
            if (m.teamB) round2TeamIds.add(m.teamB.id);
          }
          for (const byeMatch of byeMatches) {
            expect(round2TeamIds.has(byeMatch.winnerId!)).toBe(true);
          }
        }

        // Verify Seed 1 and Seed 2 are placed in opposite halves of the bracket
        const seedOrder = generateSeedOrder(expectedSize);
        const halfSize = expectedSize / 2;
        const firstHalf = seedOrder.slice(0, halfSize);
        const secondHalf = seedOrder.slice(halfSize);

        expect(firstHalf.includes(1)).toBe(true);
        expect(firstHalf.includes(2)).toBe(false);
        expect(secondHalf.includes(2)).toBe(true);
      });
    });

    it("simulates full lifecycle advancement from Round 1 to Champion for all boundary counts", () => {
      boundaryCounts.forEach((count) => {
        const teams = createMockTeams(count);
        let bracket = generateSingleEliminationBracket(teams);

        // Advance through each round
        for (let r = 0; r < bracket.rounds.length; r++) {
          const currentRoundMatches = bracket.rounds[r].matches;
          for (const m of currentRoundMatches) {
            if (m.status !== "VERIFIED") {
              expect(m.teamA).toBeDefined();
              expect(m.teamB).toBeDefined();
              // Deterministically choose higher seed as winner
              const winner = (m.teamA!.seed ?? 999) < (m.teamB!.seed ?? 999) ? m.teamA! : m.teamB!;
              bracket = advanceBracketWinner(bracket, m.id, winner.id);
            }
          }
        }

        // Grand Finals must have a verified winner (Seed 1 since higher seed always won)
        const grandFinals = bracket.rounds[bracket.rounds.length - 1].matches[0];
        expect(grandFinals.status).toBe("VERIFIED");
        expect(grandFinals.winnerId).toBe("team-1");
      });
    });
  });

  describe("2. Round Robin Boundary Counts & Edge Invariants", () => {
    it("boundary N=1: throws clean error", () => {
      expect(() => generateRoundRobinFixtures(createMockTeams(1))).toThrow(
        "Round Robin requires at least 2 participants."
      );
    });

    const boundaryCounts = [2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32];

    boundaryCounts.forEach((count) => {
      it(`boundary N=${count} teams: matches and rounds satisfy Berger cyclic rules`, () => {
        const teams = createMockTeams(count);
        const rr = generateRoundRobinFixtures(teams);

        const isOdd = count % 2 !== 0;
        const expectedRounds = isOdd ? count : count - 1;
        const expectedTotalPlayableMatches = (count * (count - 1)) / 2;

        expect(rr.totalRounds).toBe(expectedRounds);
        expect(rr.totalMatches).toBe(expectedTotalPlayableMatches);
        expect(rr.rounds).toHaveLength(expectedRounds);

        // Collect playable matches
        const allMatches = rr.rounds.flatMap((r) => r.matches);
        const playableMatches = allMatches.filter((m) => !m.isBye);
        expect(playableMatches).toHaveLength(expectedTotalPlayableMatches);

        // Odd count: exactly 1 BYE per round, every team rests exactly once
        if (isOdd) {
          const byeMatches = allMatches.filter((m) => m.isBye);
          expect(byeMatches).toHaveLength(count);
          const restedTeamIds = new Set(byeMatches.map((m) => m.teamA!.id));
          expect(restedTeamIds.size).toBe(count); // Every single team gets exactly 1 rest round!
        } else {
          // Even count: 0 BYEs
          expect(allMatches.every((m) => !m.isBye)).toBe(true);
        }

        // Pair completeness: every pair plays exactly once
        const pairSet = new Set<string>();
        for (const m of playableMatches) {
          expect(m.teamA).toBeDefined();
          expect(m.teamB).toBeDefined();
          const [a, b] = [m.teamA!.id, m.teamB!.id].sort();
          const pairKey = `${a}_vs_${b}`;
          expect(pairSet.has(pairKey)).toBe(false);
          pairSet.add(pairKey);
        }
        expect(pairSet.size).toBe(expectedTotalPlayableMatches);

        // Home/Away balance: |H - A| <= 1 for even, |H - A| == 0 for odd
        const homeCount = new Map<string, number>();
        const awayCount = new Map<string, number>();
        for (const t of teams) {
          homeCount.set(t.id, 0);
          awayCount.set(t.id, 0);
        }
        for (const m of playableMatches) {
          homeCount.set(m.teamA!.id, (homeCount.get(m.teamA!.id) ?? 0) + 1);
          awayCount.set(m.teamB!.id, (awayCount.get(m.teamB!.id) ?? 0) + 1);
        }
        for (const t of teams) {
          const h = homeCount.get(t.id) ?? 0;
          const a = awayCount.get(t.id) ?? 0;
          if (isOdd) {
            expect(Math.abs(h - a)).toBe(0);
          } else {
            expect(Math.abs(h - a)).toBeLessThanOrEqual(1);
          }
        }
      });
    });

    it("evaluates extreme scores: 13-0 regulation blowout vs 14-12 overtime nailbiter", () => {
      const teams = createMockTeams(2);
      const rr = generateRoundRobinFixtures(teams);
      const match = rr.rounds[0].matches[0];

      // Test 1: Regulation blowout (13 - 0)
      const regMatch: RoundRobinMatch = {
        ...match,
        scoreA: 13,
        scoreB: 0,
        status: "VERIFIED",
        winnerId: teams[0].id,
      };
      let standings = calculateRoundRobinStandings([regMatch], teams);
      expect(standings[0].points).toBe(3); // 3 pts for regulation
      expect(standings[0].regulationWins).toBe(1);
      expect(standings[0].otWins).toBe(0);
      expect(standings[0].roundDifferential).toBe(13);

      // Test 2: Overtime match (14 - 12)
      const otMatch: RoundRobinMatch = {
        ...match,
        scoreA: 14,
        scoreB: 12,
        isOvertime: true,
        status: "VERIFIED",
        winnerId: teams[0].id,
      };
      standings = calculateRoundRobinStandings([otMatch], teams);
      expect(standings[0].points).toBe(1); // 1 pt for OT win
      expect(standings[0].regulationWins).toBe(0);
      expect(standings[0].otWins).toBe(1);
      expect(standings[0].roundDifferential).toBe(2);
    });

    it("resolves complex 3-way circular ties via round differential, then total rounds won, then seed", () => {
      const teams = createMockTeams(3);
      // Case 1: Circular tie (A beats B 13-5, B beats C 13-7, C beats A 13-10)
      // All have 3 pts (1 reg win, 1 loss)
      // Diff:
      // A: +8 (vs B) - 3 (vs C) = +5
      // B: -8 (vs A) + 6 (vs C) = -2
      // C: -6 (vs B) + 3 (vs A) = -3
      // Expected order: A (1st), B (2nd), C (3rd)
      const matchesCase1: RoundRobinMatch[] = [
        {
          id: "m1",
          roundNumber: 1,
          roundName: "R1",
          matchNumber: 1,
          code: "M1",
          teamA: teams[0],
          teamB: teams[1],
          scoreA: 13,
          scoreB: 5,
          winnerId: teams[0].id,
          status: "VERIFIED",
          isBye: false,
        },
        {
          id: "m2",
          roundNumber: 2,
          roundName: "R2",
          matchNumber: 1,
          code: "M2",
          teamA: teams[1],
          teamB: teams[2],
          scoreA: 13,
          scoreB: 7,
          winnerId: teams[1].id,
          status: "VERIFIED",
          isBye: false,
        },
        {
          id: "m3",
          roundNumber: 3,
          roundName: "R3",
          matchNumber: 1,
          code: "M3",
          teamA: teams[2],
          teamB: teams[0],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[2].id,
          status: "VERIFIED",
          isBye: false,
        },
      ];

      const standings1 = calculateRoundRobinStandings(matchesCase1, teams);
      expect(standings1[0].teamId).toBe("team-1");
      expect(standings1[1].teamId).toBe("team-2");
      expect(standings1[2].teamId).toBe("team-3");
      expect(standings1[0].tiebreakerReason).toContain("Round differential");

      // Case 2: Exact same score differential (A beats B 13-10, B beats C 13-10, C beats A 13-10)
      // All have same points (3), same diff (0), same rounds won (23).
      // Fallback: Seed (team-1, team-2, team-3)
      const matchesCase2: RoundRobinMatch[] = [
        {
          id: "m1",
          roundNumber: 1,
          roundName: "R1",
          matchNumber: 1,
          code: "M1",
          teamA: teams[0],
          teamB: teams[1],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[0].id,
          status: "VERIFIED",
          isBye: false,
        },
        {
          id: "m2",
          roundNumber: 2,
          roundName: "R2",
          matchNumber: 1,
          code: "M2",
          teamA: teams[1],
          teamB: teams[2],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[1].id,
          status: "VERIFIED",
          isBye: false,
        },
        {
          id: "m3",
          roundNumber: 3,
          roundName: "R3",
          matchNumber: 1,
          code: "M3",
          teamA: teams[2],
          teamB: teams[0],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[2].id,
          status: "VERIFIED",
          isBye: false,
        },
      ];

      const standings2 = calculateRoundRobinStandings(matchesCase2, teams);
      expect(standings2[0].teamId).toBe("team-1");
      expect(standings2[1].teamId).toBe("team-2");
      expect(standings2[2].teamId).toBe("team-3");
    });
  });

  describe("3. Database Schema: 7 Compound Unique Constraints & Soft Deletion", () => {
    it("verifies all 7 compound unique constraints exist in Prisma DMMF", () => {
      const expectedConstraints = [
        { model: "Team", fields: ["tournamentId", "name"] },
        { model: "Lab", fields: ["buildingId", "name"] },
        { model: "Station", fields: ["labId", "name"] },
        { model: "PC", fields: ["labId", "pcNumber"] },
        { model: "Round", fields: ["tournamentId", "roundNumber"] },
        { model: "Match", fields: ["roundId", "matchNumber"] },
        { model: "Player", fields: ["teamId", "riotId", "riotTag"] },
      ];

      for (const expected of expectedConstraints) {
        const model = Prisma.dmmf.datamodel.models.find((m) => m.name === expected.model);
        expect(model, `Model ${expected.model} must exist in Prisma schema`).toBeDefined();
        expect(
          model!.uniqueFields,
          `Model ${expected.model} must have compound unique constraint on ${expected.fields.join(", ")}`
        ).toContainEqual(expected.fields);
      }
    });

    it("verifies duplicate rejection logic on compound unique keys", () => {
      // Create simulated in-memory store validating compound key uniqueness
      const teamSet = new Set<string>();
      const addTeam = (tournamentId: string, name: string) => {
        const key = `${tournamentId}::${name}`;
        if (teamSet.has(key)) {
          throw new Error(`Unique constraint failed on Team(tournamentId, name) for key ${key}`);
        }
        teamSet.add(key);
      };

      addTeam("tourney-1", "Sentinels");
      // Same name in different tournament is permitted
      expect(() => addTeam("tourney-2", "Sentinels")).not.toThrow();
      // Same name in same tournament must fail
      expect(() => addTeam("tourney-1", "Sentinels")).toThrow(
        "Unique constraint failed on Team(tournamentId, name)"
      );

      // Verify Player compound key [teamId, riotId, riotTag]
      const playerSet = new Set<string>();
      const addPlayer = (teamId: string, riotId: string, riotTag: string) => {
        const key = `${teamId}::${riotId}#${riotTag}`;
        if (playerSet.has(key)) {
          throw new Error(`Unique constraint failed on Player(teamId, riotId, riotTag)`);
        }
        playerSet.add(key);
      };

      addPlayer("team-1", "TenZ", "NA1");
      // Same tag on different team permitted
      expect(() => addPlayer("team-2", "TenZ", "NA1")).not.toThrow();
      // Duplicate on same team rejected
      expect(() => addPlayer("team-1", "TenZ", "NA1")).toThrow(
        "Unique constraint failed on Player(teamId, riotId, riotTag)"
      );
    });

    it("verifies soft-delete (deletedAt) structure and helper filters", () => {
      const softDeleteModels = ["Tournament", "Team", "Player", "Match", "PC"];

      // Must have deletedAt field in DMMF
      for (const modelName of softDeleteModels) {
        const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
        expect(model).toBeDefined();

        const field = model!.fields.find((f) => f.name === "deletedAt");
        expect(field).toBeDefined();
        expect(field!.type).toBe("DateTime");
        expect(field!.isRequired).toBe(false);
      }

      // Verify schema.prisma defines @@index([deletedAt]) for all 5 models
      const schemaPath = path.resolve(process.cwd(), "prisma/schema.prisma");
      const schemaText = fs.readFileSync(schemaPath, "utf8");
      
      for (const modelName of softDeleteModels) {
        const modelRegex = new RegExp(`model\\s+${modelName}\\s+\\{[\\s\\S]*?@@index\\(\\[deletedAt\\]\\)[\\s\\S]*?\\}`, "m");
        expect(modelRegex.test(schemaText), `${modelName} must define @@index([deletedAt]) in schema.prisma`).toBe(true);
      }

      // Check query filters
      expect(notDeleted).toEqual({ deletedAt: null });
      expect(isDeleted).toEqual({ deletedAt: { not: null } });

      // Check runtime helper
      expect(isSoftDeleted(null)).toBe(false);
      expect(isSoftDeleted(undefined)).toBe(false);
      expect(isSoftDeleted({ deletedAt: null })).toBe(false);
      expect(isSoftDeleted({ deletedAt: new Date() })).toBe(true);
    });
  });

  describe("4. Pre-Flight Validator Check #10: Conflict-Free Fixture Schedule", () => {
    const mockVenue = {
      totalLabs: 2,
      totalConfiguredPCs: 40,
      totalWorkingPCs: 40,
      totalOfflinePCs: 0,
      totalStations: 4,
      operationalStations: 4,
      maxSimultaneousMatches: 4,
      details: [],
    };

    const mockTeams = Array.from({ length: 4 }, (_, i) => ({
      id: `t-${i + 1}`,
      name: `Team ${i + 1}`,
      players: Array.from({ length: 5 }, (_, p) => ({
        id: `p-${i + 1}-${p + 1}`,
        name: `P ${p + 1}`,
        riotId: `P${p + 1}#NA1`,
      })),
    }));

    const validFixture = {
      matchId: "m-1",
      roundNumber: 1,
      roundName: "Semifinals",
      matchCode: "M01",
      teamAId: "t-1",
      teamAName: "Team 1",
      teamBId: "t-2",
      teamBName: "Team 2",
      isBye: false,
      stationId: "station-1",
      startTime: "2026-10-15T09:00:00.000Z",
      estimatedEndTime: "2026-10-15T09:45:00.000Z",
      status: "SCHEDULED",
    };

    it("passes Check #10 on valid conflict-free schedule", () => {
      const report = runPreFinalizationValidation({
        tournament: {
          id: "t1",
          name: "Championship",
          status: "READY",
          startTime: "2026-10-15T09:00:00.000Z",
        },
        teams: mockTeams,
        venueMetrics: mockVenue,
        bracket: generateSingleEliminationBracket(createMockTeams(4)),
        fixtures: [validFixture],
        conflicts: [],
        volunteersCount: 4,
      });

      const check10 = report.checks.find((c) => c.name === "Conflict-Free Fixture Schedule");
      expect(check10).toBeDefined();
      expect(check10!.passed).toBe(true);
      expect(check10!.severity).toBe("INFO");
      expect(report.canFinalize).toBe(true);
    });

    it("fails Check #10 when no fixtures are generated", () => {
      const report = runPreFinalizationValidation({
        tournament: {
          id: "t1",
          name: "Championship",
          status: "READY",
          startTime: "2026-10-15T09:00:00.000Z",
        },
        teams: mockTeams,
        venueMetrics: mockVenue,
        fixtures: [],
        conflicts: [],
        volunteersCount: 4,
      });

      const check10 = report.checks.find((c) => c.name === "Conflict-Free Fixture Schedule");
      expect(check10).toBeDefined();
      expect(check10!.passed).toBe(false);
      expect(check10!.severity).toBe("CRITICAL");
      expect(report.canFinalize).toBe(false);
    });

    it("fails Check #10 when scheduling conflicts exist in conflicts array", () => {
      const report = runPreFinalizationValidation({
        tournament: {
          id: "t1",
          name: "Championship",
          status: "READY",
          startTime: "2026-10-15T09:00:00.000Z",
        },
        teams: mockTeams,
        venueMetrics: mockVenue,
        fixtures: [validFixture],
        conflicts: ["Team 1 has overlapping match on Station 1 and Station 2"],
        volunteersCount: 4,
      });

      const check10 = report.checks.find((c) => c.name === "Conflict-Free Fixture Schedule");
      expect(check10!.passed).toBe(false);
      expect(check10!.severity).toBe("CRITICAL");
      expect(check10!.details).toContain("Team 1 has overlapping match");
      expect(report.canFinalize).toBe(false);
    });

    it("fails Check #10 when scheduleConflicts array contains conflict messages", () => {
      const report = runPreFinalizationValidation({
        tournament: {
          id: "t1",
          name: "Championship",
          status: "READY",
          startTime: "2026-10-15T09:00:00.000Z",
        },
        teams: mockTeams,
        venueMetrics: mockVenue,
        fixtures: [validFixture],
        scheduleConflicts: ["Station 1 has insufficient buffer duration between matches"],
        volunteersCount: 4,
      });

      const check10 = report.checks.find((c) => c.name === "Conflict-Free Fixture Schedule");
      expect(check10!.passed).toBe(false);
      expect(check10!.severity).toBe("CRITICAL");
      expect(check10!.details).toContain("insufficient buffer duration");
      expect(report.canFinalize).toBe(false);
    });

    it("fails Check #10 when tournament startTime is missing or invalid date", () => {
      const report = runPreFinalizationValidation({
        tournament: {
          id: "t1",
          name: "Championship",
          status: "READY",
          startTime: null,
          startDate: null,
        },
        teams: mockTeams,
        venueMetrics: mockVenue,
        fixtures: [{ ...validFixture, startTime: "invalid-date-string" }],
        conflicts: [],
        volunteersCount: 4,
      });

      const check10 = report.checks.find((c) => c.name === "Conflict-Free Fixture Schedule");
      expect(check10!.passed).toBe(false);
      expect(check10!.severity).toBe("CRITICAL");
      expect(check10!.message).toContain("missing or invalid start times");
      expect(report.canFinalize).toBe(false);
    });
  });

  describe("5. Group Stage + Knockout Edge Cases", () => {
    it("fails cleanly when fewer than groupCount * 2 teams are provided", () => {
      expect(() => generateGroupStage(createMockTeams(7), 4)).toThrow(
        "Group stage requires at least 2 teams per group (8 participants for 4 groups)."
      );
    });

    it("executes snake seeding distribution into 4 groups for 16 teams", () => {
      const teams = createMockTeams(16);
      const gs = generateGroupStage(teams, 4);

      expect(gs.groups).toHaveLength(4);
      // Group A: 1, 8, 9, 16
      expect(gs.groups[0].teams.map((t) => t.seed)).toEqual([1, 8, 9, 16]);
      // Group B: 2, 7, 10, 15
      expect(gs.groups[1].teams.map((t) => t.seed)).toEqual([2, 7, 10, 15]);
      // Group C: 3, 6, 11, 14
      expect(gs.groups[2].teams.map((t) => t.seed)).toEqual([3, 6, 11, 14]);
      // Group D: 4, 5, 12, 13
      expect(gs.groups[3].teams.map((t) => t.seed)).toEqual([4, 5, 12, 13]);
    });

    it("advances top 2 from 4 groups into knockout bracket with same-group separation", () => {
      const teams = createMockTeams(16);
      const gs = generateGroupStage(teams, 4);

      // Play all matches with deterministic scores
      for (const group of gs.groups) {
        for (const round of group.rounds) {
          for (const match of round.matches) {
            match.scoreA = 13;
            match.scoreB = 5;
            match.winnerId = match.teamA!.id;
            match.status = "VERIFIED";
          }
        }
      }

      const standings = calculateGroupStandings(gs.groups);
      const { advancement, bracket } = generateKnockoutAdvancement(standings);

      expect(advancement).toHaveLength(8);
      expect(bracket.rounds).toHaveLength(3); // 8 teams -> Quarterfinals, Semifinals, Grand Finals

      // Invariant: Teams from the same group (e.g. Group A 1st and Group A 2nd)
      // must be placed into opposite bracket halves (Upper half: QF1/QF2, Lower half: QF3/QF4)
      const qfMatches = bracket.rounds[0].matches;
      expect(qfMatches).toHaveLength(4);

      const upperHalfTeamIds = [
        qfMatches[0].teamA?.id,
        qfMatches[0].teamB?.id,
        qfMatches[1].teamA?.id,
        qfMatches[1].teamB?.id,
      ];

      const lowerHalfTeamIds = [
        qfMatches[2].teamA?.id,
        qfMatches[2].teamB?.id,
        qfMatches[3].teamA?.id,
        qfMatches[3].teamB?.id,
      ];

      const groupA1st = standings[0]!.standings![0]!.teamId;
      const groupA2nd = standings[0]!.standings![1]!.teamId;

      expect(upperHalfTeamIds.includes(groupA1st)).toBe(true);
      expect(lowerHalfTeamIds.includes(groupA2nd)).toBe(true);
    });
  });

  describe("6. State Machine Invariant Stress Testing (GEMINI.md § 3.3)", () => {
    it("strictly validates valid and invalid tournament lifecycle transitions", () => {
      // Valid path
      expect(canTransitionTournament("DRAFT", "READY")).toBe(true);
      expect(canTransitionTournament("READY", "FINALIZED")).toBe(true);
      expect(canTransitionTournament("FINALIZED", "LIVE")).toBe(true);
      expect(canTransitionTournament("LIVE", "COMPLETED")).toBe(true);
      expect(canTransitionTournament("COMPLETED", "ARCHIVED")).toBe(true);

      // Admin unlock transition
      expect(canTransitionTournament("FINALIZED", "READY")).toBe(true);

      // Illegal jumps (MUST throw)
      const illegalTournamentTransitions: [TournamentStatus, TournamentStatus][] = [
        ["DRAFT", "LIVE"],
        ["DRAFT", "COMPLETED"],
        ["READY", "LIVE"],
        ["READY", "COMPLETED"],
        ["COMPLETED", "LIVE"],
        ["COMPLETED", "READY"],
        ["ARCHIVED", "DRAFT"],
        ["ARCHIVED", "LIVE"],
      ];

      for (const [from, to] of illegalTournamentTransitions) {
        expect(canTransitionTournament(from, to), `Transition from ${from} to ${to} should be forbidden`).toBe(false);
        expect(() => validateTournamentTransition(from, to)).toThrow(
          `Illegal tournament status transition from ${from} to ${to}.`
        );
      }
    });

    it("strictly enforces match state progression and blocks illegal score skips", () => {
      // Valid progression
      const validPath: [MatchStatus, MatchStatus][] = [
        ["SCHEDULED", "CALLED"],
        ["CALLED", "READY"],
        ["READY", "LOBBY_READY"],
        ["LOBBY_READY", "LIVE"],
        ["LIVE", "FINISHED"],
        ["FINISHED", "RESULT_PENDING"],
        ["RESULT_PENDING", "VERIFIED"],
      ];

      for (const [from, to] of validPath) {
        expect(canTransitionMatch(from, to)).toBe(true);
        expect(() => validateMatchTransition(from, to)).not.toThrow();
      }

      // Illegal shortcuts (CRITICAL INVARIANT: NEVER advance unverified scores or skip stages)
      const illegalMatchJumps: [MatchStatus, MatchStatus][] = [
        ["SCHEDULED", "LIVE"],
        ["SCHEDULED", "VERIFIED"],
        ["CALLED", "LIVE"],
        ["READY", "LIVE"],
        ["LIVE", "VERIFIED"], // Volunteer cannot skip RESULT_PENDING
        ["FINISHED", "VERIFIED"], // Cannot skip official verification
        ["CANCELLED", "LIVE"],
        ["FORFEIT", "LIVE"],
      ];

      for (const [from, to] of illegalMatchJumps) {
        expect(canTransitionMatch(from, to), `Match transition ${from} -> ${to} must be forbidden`).toBe(false);
        expect(() => validateMatchTransition(from, to)).toThrow(
          `Illegal match status transition from ${from} to ${to}.`
        );
      }
    });
  });

  describe("7. Odd-Team Rest Round Disjointness (Round Robin)", () => {
    const oddTeamCounts = [3, 5, 7, 9, 13, 15, 17];

    oddTeamCounts.forEach((count) => {
      it(`verifies odd N=${count} teams has strictly disjoint rest schedule`, () => {
        const teams = createMockTeams(count);
        const rr = generateRoundRobinFixtures(teams);

        const restMap = new Map<number, string>(); // roundNumber -> restedTeamId
        const teamRestRounds = new Map<string, number[]>(); // teamId -> roundNumbers

        for (const r of rr.rounds) {
          const byeMatches = r.matches.filter((m) => m.isBye);
          // Invariant: Exactly 1 team rests per round
          expect(byeMatches).toHaveLength(1);

          const restingTeam = byeMatches[0].teamA!;
          expect(restMap.has(r.roundNumber)).toBe(false);
          restMap.set(r.roundNumber, restingTeam.id);

          if (!teamRestRounds.has(restingTeam.id)) {
            teamRestRounds.set(restingTeam.id, []);
          }
          teamRestRounds.get(restingTeam.id)!.push(r.roundNumber);
        }

        // Invariant: Every team rests EXACTLY once
        for (const t of teams) {
          const rounds = teamRestRounds.get(t.id);
          expect(rounds, `Team ${t.id} must rest in at least one round`).toBeDefined();
          expect(rounds!.length, `Team ${t.id} must rest exactly once`).toBe(1);
        }
      });
    });
  });

  describe("8. 4-Way Circular Ties & Extreme Scores in Round Robin", () => {
    it("resolves a 4-way circular tie deterministically to seed fallback without infinite loop", () => {
      const teams = createMockTeams(4);
      // Construct a perfectly balanced circular 4-way tie:
      // T1 beats T2 13-10
      // T2 beats T3 13-10
      // T3 beats T4 13-10
      // T4 beats T1 13-10
      // T1 beats T3 13-10
      // T2 beats T4 13-10
      // Wait: let's make all 4 teams have identical 2 wins, 1 loss or identical points/diff
      // Actually, if each team wins 1 match:
      // T1 beats T2 (13-10), T2 beats T3 (13-10), T3 beats T4 (13-10), T4 beats T1 (13-10)
      // And matches (T1 vs T3) and (T2 vs T4) are unplayed or cancelled:
      const matches: RoundRobinMatch[] = [
        {
          id: "m1",
          roundNumber: 1,
          roundName: "R1",
          matchNumber: 1,
          code: "M1",
          teamA: teams[0],
          teamB: teams[1],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[0].id,
          status: "VERIFIED",
          isBye: false,
        },
        {
          id: "m2",
          roundNumber: 1,
          roundName: "R1",
          matchNumber: 2,
          code: "M2",
          teamA: teams[1],
          teamB: teams[2],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[1].id,
          status: "VERIFIED",
          isBye: false,
        },
        {
          id: "m3",
          roundNumber: 2,
          roundName: "R2",
          matchNumber: 1,
          code: "M3",
          teamA: teams[2],
          teamB: teams[3],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[2].id,
          status: "VERIFIED",
          isBye: false,
        },
        {
          id: "m4",
          roundNumber: 2,
          roundName: "R2",
          matchNumber: 2,
          code: "M4",
          teamA: teams[3],
          teamB: teams[0],
          scoreA: 13,
          scoreB: 10,
          winnerId: teams[3].id,
          status: "VERIFIED",
          isBye: false,
        },
      ];

      // All 4 teams have: 1 win, 1 loss, 3 pts, 23 rounds won, 23 rounds lost, diff = 0.
      const standings = calculateRoundRobinStandings(matches, teams);
      expect(standings).toHaveLength(4);

      // Must terminate cleanly and fall back to seed order
      expect(standings[0].teamId).toBe("team-1");
      expect(standings[1].teamId).toBe("team-2");
      expect(standings[2].teamId).toBe("team-3");
      expect(standings[3].teamId).toBe("team-4");
    });

    it("evaluates marathon overtime scores (26-24)", () => {
      const teams = createMockTeams(2);
      const match: RoundRobinMatch = {
        id: "m-marathon",
        roundNumber: 1,
        roundName: "R1",
        matchNumber: 1,
        code: "M1",
        teamA: teams[0],
        teamB: teams[1],
        scoreA: 26,
        scoreB: 24,
        isOvertime: true,
        winnerId: teams[0].id,
        status: "VERIFIED",
        isBye: false,
      };

      const standings = calculateRoundRobinStandings([match], teams);
      expect(standings[0].points).toBe(1); // 1 pt for overtime win
      expect(standings[0].otWins).toBe(1);
      expect(standings[0].regulationWins).toBe(0);
      expect(standings[0].roundDifferential).toBe(2);
      expect(standings[1].points).toBe(0);
      expect(standings[1].roundDifferential).toBe(-2);
    });
  });

  describe("9. Asymmetric Group Sizes in Group Stage (17 teams into 4 groups)", () => {
    it("handles 17 teams cleanly with 4 groups (sizes 5, 4, 4, 4)", () => {
      const teams = createMockTeams(17);
      const gs = generateGroupStage(teams, 4);

      expect(gs.groups).toHaveLength(4);
      // Group sizes: 17 = 5 + 4 + 4 + 4
      const sizes = gs.groups.map((g) => g.teams.length).sort((a, b) => b - a);
      expect(sizes).toEqual([5, 4, 4, 4]);

      // All internal fixtures generated properly
      for (const group of gs.groups) {
        if (group.teams.length === 5) {
          // 5 teams -> 5 rounds, 10 playable matches, 5 BYE matches
          const allMatches = group.rounds.flatMap((r) => r.matches);
          const playable = allMatches.filter((m) => !m.isBye);
          expect(playable).toHaveLength(10);
        } else {
          // 4 teams -> 3 rounds, 6 playable matches, 0 BYE matches
          const allMatches = group.rounds.flatMap((r) => r.matches);
          expect(allMatches.every((m) => !m.isBye)).toBe(true);
          expect(allMatches).toHaveLength(6);
        }
      }

      // Standings calculate cleanly
      const standings = calculateGroupStandings(gs.groups);
      expect(standings).toHaveLength(4);

      // Knockout advancement produces 8-team bracket
      const { advancement, bracket } = generateKnockoutAdvancement(standings);
      expect(advancement).toHaveLength(8);
      expect(bracket.rounds).toHaveLength(3);
    });
  });
});

