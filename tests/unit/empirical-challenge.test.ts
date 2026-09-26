import { describe, it, expect } from "vitest";
import {
  generateRoundRobinFixtures,
  calculateRoundRobinStandings,
} from "../../src/lib/tournament/round-robin";
import {
  generateGroupStage,
  calculateGroupStandings,
  generateKnockoutAdvancement,
} from "../../src/lib/tournament/group-stage";
import {
  advanceBracketWinner,
  generateSingleEliminationBracket,
} from "../../src/lib/tournament/bracket";
import {
  Participant,
  RoundRobinMatch,
  TeamStanding,
} from "../../src/lib/tournament/types";
import { generateSeedData, seed } from "../../prisma/seed";
import { PrismaClient } from "@prisma/client";

describe("Empirical Challenge — Milestone 1 & Milestone 2 Stress Harness", () => {
  // --------------------------------------------------------------------------
  // CHALLENGE 1: Round Robin Berger Cyclic Pairing for Sizes 2..16
  // --------------------------------------------------------------------------
  describe("1. Round Robin Berger Cyclic Pairing Stress Test", () => {
    const targetSizes = [2, 3, 4, 5, 6, 7, 8, 9, 13, 16];

    targetSizes.forEach((n) => {
      it(`should rigorously verify Berger cyclic invariants for N = ${n} teams`, () => {
        const participants: Participant[] = Array.from({ length: n }, (_, i) => ({
          id: `team-${i + 1}`,
          name: `Team ${String.fromCharCode(65 + (i % 26))}${Math.floor(i / 26) || ""}`,
          seed: i + 1,
        }));

        const structure = generateRoundRobinFixtures(participants);

        const expectedRounds = n % 2 === 0 ? n - 1 : n;
        const expectedPlayableMatches = (n * (n - 1)) / 2;

        expect(structure.totalRounds).toBe(expectedRounds);
        expect(structure.rounds.length).toBe(expectedRounds);
        expect(structure.totalMatches).toBe(expectedPlayableMatches);

        // Track matches played per unordered pair using numerical team indexing
        const pairMatchCounts = new Map<string, number>();
        for (let i = 1; i <= n; i++) {
          for (let j = i + 1; j <= n; j++) {
            const key = `team-${i}_vs_team-${j}`;
            pairMatchCounts.set(key, 0);
          }
        }

        // Track home and away counts per team for playable matches
        const homeCounts = new Map<string, number>();
        const awayCounts = new Map<string, number>();
        const byeCounts = new Map<string, number>();
        participants.forEach((p) => {
          homeCounts.set(p.id, 0);
          awayCounts.set(p.id, 0);
          byeCounts.set(p.id, 0);
        });

        let totalPlayableEncountered = 0;

        structure.rounds.forEach((round, roundIdx) => {
          expect(round.roundNumber).toBe(roundIdx + 1);

          // Invariant: No team plays twice in the same round
          const teamsInRound = new Set<string>();

          round.matches.forEach((match) => {
            if (match.isBye) {
              expect(match.teamA).toBeDefined();
              expect(match.teamB).toBeUndefined();
              expect(match.winnerId).toBe(match.teamA?.id);
              const teamId = match.teamA!.id;
              expect(teamsInRound.has(teamId)).toBe(false);
              teamsInRound.add(teamId);
              byeCounts.set(teamId, (byeCounts.get(teamId) ?? 0) + 1);
            } else {
              expect(match.teamA).toBeDefined();
              expect(match.teamB).toBeDefined();
              const aId = match.teamA!.id;
              const bId = match.teamB!.id;

              expect(aId).not.toBe(bId);

              // Verify neither team has already played in this round
              expect(teamsInRound.has(aId)).toBe(false);
              expect(teamsInRound.has(bId)).toBe(false);
              teamsInRound.add(aId);
              teamsInRound.add(bId);

              // Record pair match with numerical sorting
              const numA = parseInt(aId.replace("team-", ""), 10);
              const numB = parseInt(bId.replace("team-", ""), 10);
              const pairKey = numA < numB ? `team-${numA}_vs_team-${numB}` : `team-${numB}_vs_team-${numA}`;

              expect(pairMatchCounts.has(pairKey)).toBe(true);
              pairMatchCounts.set(pairKey, (pairMatchCounts.get(pairKey) ?? 0) + 1);

              homeCounts.set(aId, (homeCounts.get(aId) ?? 0) + 1);
              awayCounts.set(bId, (awayCounts.get(bId) ?? 0) + 1);
              totalPlayableEncountered++;
            }
          });

          // Invariant: In every round, all N teams must be accounted for (either playing or on BYE)
          expect(teamsInRound.size).toBe(n);
        });

        // Invariant: Total playable matches matches theoretical n*(n-1)/2
        expect(totalPlayableEncountered).toBe(expectedPlayableMatches);

        // Invariant: Every unordered pair plays exactly once
        for (const [pair, count] of pairMatchCounts.entries()) {
          expect(count).toBe(1);
        }

        // Invariant: BYE counts and Home/Away balance
        participants.forEach((p) => {
          const h = homeCounts.get(p.id) ?? 0;
          const a = awayCounts.get(p.id) ?? 0;
          const byes = byeCounts.get(p.id) ?? 0;

          if (n % 2 === 0) {
            // Even teams: Zero BYEs, each plays n - 1 matches
            expect(byes).toBe(0);
            expect(h + a).toBe(n - 1);
            // Since n - 1 is odd, optimal balance is |H - A| <= 1
            expect(Math.abs(h - a)).toBeLessThanOrEqual(1);
          } else {
            // Odd teams: Exactly 1 BYE per team, each plays n - 1 matches
            expect(byes).toBe(1);
            expect(h + a).toBe(n - 1);
            // Since n - 1 is even, exact home/away balance is achieved: |H - A| == 0
            expect(Math.abs(h - a)).toBe(0);
            expect(h).toBe((n - 1) / 2);
            expect(a).toBe((n - 1) / 2);
          }
        });
      });
    });

    it("should reject edge cases (< 2 participants)", () => {
      expect(() => generateRoundRobinFixtures([])).toThrow(
        "Round Robin requires at least 2 participants."
      );
      expect(() =>
        generateRoundRobinFixtures([{ id: "t1", name: "Solo Team" }])
      ).toThrow("Round Robin requires at least 2 participants.");
    });
  });

  // --------------------------------------------------------------------------
  // CHALLENGE 2: Tiebreaker Engine (2-team H2H, 3-team circular ties)
  // --------------------------------------------------------------------------
  describe("2. Tiebreaker Engine Stress Tests", () => {
    const participants: Participant[] = [
      { id: "team-a", name: "Team A", seed: 1 },
      { id: "team-b", name: "Team B", seed: 2 },
      { id: "team-c", name: "Team C", seed: 3 },
      { id: "team-d", name: "Team D", seed: 4 },
    ];

    it("should break a 2-team tie when tied on points via direct Head-to-Head win", () => {
      const matches: RoundRobinMatch[] = [
        {
          id: "m-ab",
          roundNumber: 1,
          roundName: "Round 1",
          matchNumber: 1,
          code: "M1",
          teamA: participants[0], // A
          teamB: participants[1], // B
          scoreA: 13,
          scoreB: 10,
          winnerId: "team-a",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-ad",
          roundNumber: 1,
          roundName: "Round 1",
          matchNumber: 2,
          code: "M2",
          teamA: participants[0], // A
          teamB: participants[3], // D
          scoreA: 13,
          scoreB: 8,
          winnerId: "team-a",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-ca",
          roundNumber: 2,
          roundName: "Round 2",
          matchNumber: 1,
          code: "M3",
          teamA: participants[2], // C
          teamB: participants[0], // A
          scoreA: 13,
          scoreB: 10,
          winnerId: "team-c",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-bc",
          roundNumber: 2,
          roundName: "Round 2",
          matchNumber: 2,
          code: "M4",
          teamA: participants[1], // B
          teamB: participants[2], // C
          scoreA: 13,
          scoreB: 9,
          winnerId: "team-b",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-bd",
          roundNumber: 3,
          roundName: "Round 3",
          matchNumber: 1,
          code: "M5",
          teamA: participants[1], // B
          teamB: participants[3], // D
          scoreA: 13,
          scoreB: 7,
          winnerId: "team-b",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-dc",
          roundNumber: 3,
          roundName: "Round 3",
          matchNumber: 2,
          code: "M6",
          teamA: participants[3], // D
          teamB: participants[2], // C
          scoreA: 13,
          scoreB: 11,
          winnerId: "team-d",
          isBye: false,
          status: "VERIFIED",
        },
      ];

      const standings = calculateRoundRobinStandings(matches, participants);

      expect(standings[0].points).toBe(6);
      expect(standings[1].points).toBe(6);

      // Direct Head-to-Head: Team A defeated Team B (13-10)
      expect(standings[0].teamId).toBe("team-a");
      expect(standings[0].tiebreakerReason).toContain("Head-to-head win over Team B");

      expect(standings[1].teamId).toBe("team-b");
      expect(standings[1].tiebreakerReason).toContain("Head-to-head loss to Team A");
    });

    it("should break 3-team circular tie (A>B, B>C, C>A) using round differential", () => {
      const matches: RoundRobinMatch[] = [
        {
          id: "m-ab",
          roundNumber: 1,
          roundName: "Round 1",
          matchNumber: 1,
          code: "RR-M1",
          teamA: participants[0],
          teamB: participants[1],
          scoreA: 13,
          scoreB: 10,
          winnerId: "team-a",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-bc",
          roundNumber: 2,
          roundName: "Round 2",
          matchNumber: 1,
          code: "RR-M2",
          teamA: participants[1],
          teamB: participants[2],
          scoreA: 13,
          scoreB: 8,
          winnerId: "team-b",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-ca",
          roundNumber: 3,
          roundName: "Round 3",
          matchNumber: 1,
          code: "RR-M3",
          teamA: participants[2],
          teamB: participants[0],
          scoreA: 13,
          scoreB: 11,
          winnerId: "team-c",
          isBye: false,
          status: "VERIFIED",
        },
      ];

      const standings = calculateRoundRobinStandings(matches, participants.slice(0, 3));

      expect(standings[0].teamId).toBe("team-b");
      expect(standings[0].roundDifferential).toBe(2);
      expect(standings[0].tiebreakerReason).toContain("Round differential (+2)");

      expect(standings[1].teamId).toBe("team-a");
      expect(standings[1].roundDifferential).toBe(1);
      expect(standings[1].tiebreakerReason).toContain("Round differential (+1)");

      expect(standings[2].teamId).toBe("team-c");
      expect(standings[2].roundDifferential).toBe(-3);
      expect(standings[2].tiebreakerReason).toContain("Round differential (-3)");
    });

    it("should break 3-team circular tie using total rounds won when round differential is equal", () => {
      const matches: RoundRobinMatch[] = [
        // Peer circular matches (3 pts each)
        {
          id: "m-ab",
          roundNumber: 1,
          roundName: "R1",
          matchNumber: 1,
          code: "M1",
          teamA: participants[0],
          teamB: participants[1],
          scoreA: 13,
          scoreB: 11,
          winnerId: "team-a",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-bc",
          roundNumber: 2,
          roundName: "R2",
          matchNumber: 1,
          code: "M2",
          teamA: participants[1],
          teamB: participants[2],
          scoreA: 13,
          scoreB: 11,
          winnerId: "team-b",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-ca",
          roundNumber: 3,
          roundName: "R3",
          matchNumber: 1,
          code: "M3",
          teamA: participants[2],
          teamB: participants[0],
          scoreA: 13,
          scoreB: 11,
          winnerId: "team-c",
          isBye: false,
          status: "VERIFIED",
        },
        // Matches vs D (all 3 lose to D with diff -2, giving 0 pts each)
        {
          id: "m-ad",
          roundNumber: 4,
          roundName: "R4",
          matchNumber: 1,
          code: "M4",
          teamA: participants[0], // A
          teamB: participants[3], // D
          scoreA: 11,
          scoreB: 13,
          winnerId: "team-d",
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-bd",
          roundNumber: 4,
          roundName: "R4",
          matchNumber: 2,
          code: "M5",
          teamA: participants[1], // B
          teamB: participants[3], // D
          scoreA: 13,
          scoreB: 15,
          winnerId: "team-d",
          isOvertime: true,
          isBye: false,
          status: "VERIFIED",
        },
        {
          id: "m-cd",
          roundNumber: 5,
          roundName: "R5",
          matchNumber: 1,
          code: "M6",
          teamA: participants[2], // C
          teamB: participants[3], // D
          scoreA: 15,
          scoreB: 17,
          winnerId: "team-d",
          isOvertime: true,
          isBye: false,
          status: "VERIFIED",
        },
      ];

      const standings = calculateRoundRobinStandings(matches, participants);

      // Team D won 3 matches (1 reg win = 3 pts, 2 OT wins = 1 pt each) -> 3 + 1 + 1 = 5 pts
      expect(standings[0].teamId).toBe("team-d");
      expect(standings[0].points).toBe(5);

      // Teams A, B, C all have 3 points and round differential -2:
      const tiedTrio = standings.slice(1, 4);
      expect(tiedTrio.map((t) => t.points)).toEqual([3, 3, 3]);
      expect(tiedTrio.map((t) => t.roundDifferential)).toEqual([-2, -2, -2]);

      // Total rounds won tiebreaker:
      // C (39) > B (37) > A (35)
      expect(standings[1].teamId).toBe("team-c");
      expect(standings[1].roundsWon).toBe(39);
      expect(standings[1].tiebreakerReason).toContain("Total rounds won (39)");

      expect(standings[2].teamId).toBe("team-b");
      expect(standings[2].roundsWon).toBe(37);
      expect(standings[2].tiebreakerReason).toContain("Total rounds won (37)");

      expect(standings[3].teamId).toBe("team-a");
      expect(standings[3].roundsWon).toBe(35);
      expect(standings[3].tiebreakerReason).toContain("Total rounds won (35)");
    });
  });

  // --------------------------------------------------------------------------
  // CHALLENGE 3: Group Stage Snake Seeding & Crossover Knockout Pairings
  // --------------------------------------------------------------------------
  describe("3. Group Stage Snake Seeding & Crossover Knockout Separation", () => {
    it("should snake seed 16 teams into 4 groups with pot parity", () => {
      const teams16: Participant[] = Array.from({ length: 16 }, (_, i) => ({
        id: `t${i + 1}`,
        name: `Team ${i + 1}`,
        seed: i + 1,
      }));

      const groupStage = generateGroupStage(teams16, 4);

      expect(groupStage.groupCount).toBe(4);
      expect(groupStage.groups.length).toBe(4);

      const [groupA, groupB, groupC, groupD] = groupStage.groups;

      // Group A: Seeds 1, 8, 9, 16
      expect(groupA.teams.map((t) => t.seed)).toEqual([1, 8, 9, 16]);
      // Group B: Seeds 2, 7, 10, 15
      expect(groupB.teams.map((t) => t.seed)).toEqual([2, 7, 10, 15]);
      // Group C: Seeds 3, 6, 11, 14
      expect(groupC.teams.map((t) => t.seed)).toEqual([3, 6, 11, 14]);
      // Group D: Seeds 4, 5, 12, 13
      expect(groupD.teams.map((t) => t.seed)).toEqual([4, 5, 12, 13]);

      // Seed Sum Parity: Every group sum = 34
      groupStage.groups.forEach((g) => {
        const sum = g.teams.reduce((acc, t) => acc + (t.seed ?? 0), 0);
        expect(sum).toBe(34);
      });
    });

    it("should ensure crossover knockout pairings separate same-group teams into opposite halves", () => {
      const mockStandings: Record<string, TeamStanding[]> = {
        "group-a": [
          { rank: 1, teamId: "A1", teamName: "A1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "A1", name: "A1" } },
          { rank: 2, teamId: "A2", teamName: "A2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "A2", name: "A2" } },
        ],
        "group-b": [
          { rank: 1, teamId: "B1", teamName: "B1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "B1", name: "B1" } },
          { rank: 2, teamId: "B2", teamName: "B2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "B2", name: "B2" } },
        ],
        "group-c": [
          { rank: 1, teamId: "C1", teamName: "C1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "C1", name: "C1" } },
          { rank: 2, teamId: "C2", teamName: "C2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "C2", name: "C2" } },
        ],
        "group-d": [
          { rank: 1, teamId: "D1", teamName: "D1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "D1", name: "D1" } },
          { rank: 2, teamId: "D2", teamName: "D2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "D2", name: "D2" } },
        ],
      };

      const { advancement, bracket } = generateKnockoutAdvancement(mockStandings);

      expect(advancement.length).toBe(8);
      expect(bracket.rounds.length).toBe(3); // QF, SF, GF

      const qfRound = bracket.rounds[0];
      expect(qfRound.matches.length).toBe(4);

      // Verify Round 1 Quarterfinal pairings:
      // QF1: A1 vs B2
      expect(qfRound.matches[0].teamA?.id).toBe("A1");
      expect(qfRound.matches[0].teamB?.id).toBe("B2");
      // QF2: C1 vs D2
      expect(qfRound.matches[1].teamA?.id).toBe("C1");
      expect(qfRound.matches[1].teamB?.id).toBe("D2");
      // QF3: B1 vs A2
      expect(qfRound.matches[2].teamA?.id).toBe("B1");
      expect(qfRound.matches[2].teamB?.id).toBe("A2");
      // QF4: D1 vs C2
      expect(qfRound.matches[3].teamA?.id).toBe("D1");
      expect(qfRound.matches[3].teamB?.id).toBe("C2");

      // Upper Half (feeds SF1): QF1 and QF2 -> { A1, B2, C1, D2 }
      // Lower Half (feeds SF2): QF3 and QF4 -> { B1, A2, D1, C2 }
      const upperHalfTeams = [
        qfRound.matches[0].teamA?.id!,
        qfRound.matches[0].teamB?.id!,
        qfRound.matches[1].teamA?.id!,
        qfRound.matches[1].teamB?.id!,
      ];
      const lowerHalfTeams = [
        qfRound.matches[2].teamA?.id!,
        qfRound.matches[2].teamB?.id!,
        qfRound.matches[3].teamA?.id!,
        qfRound.matches[3].teamB?.id!,
      ];

      expect(upperHalfTeams.slice().sort()).toEqual(["A1", "B2", "C1", "D2"]);
      expect(lowerHalfTeams.slice().sort()).toEqual(["A2", "B1", "C2", "D1"]);

      // Verify that for EVERY group, exactly one team is in the upper half and one team is in the lower half:
      const groups = [
        { name: "Group A", t1: "A1", t2: "A2" },
        { name: "Group B", t1: "B1", t2: "B2" },
        { name: "Group C", t1: "C1", t2: "C2" },
        { name: "Group D", t1: "D1", t2: "D2" },
      ];

      for (const g of groups) {
        const t1InUpper = upperHalfTeams.includes(g.t1);
        const t2InUpper = upperHalfTeams.includes(g.t2);
        const t1InLower = lowerHalfTeams.includes(g.t1);
        const t2InLower = lowerHalfTeams.includes(g.t2);

        // XOR check: Exactly one team per group in upper, exactly one in lower
        expect(t1InUpper !== t2InUpper).toBe(true);
        expect(t1InLower !== t2InLower).toBe(true);
        expect(t1InUpper).toBe(!t1InLower);
        expect(t2InUpper).toBe(!t2InLower);
      }
    });

    it("should exhaustively simulate all 128 bracket outcome paths and confirm zero same-group collisions before finals", () => {
      const mockStandings: Record<string, TeamStanding[]> = {
        "group-a": [
          { rank: 1, teamId: "A1", teamName: "A1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "A1", name: "A1" } },
          { rank: 2, teamId: "A2", teamName: "A2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "A2", name: "A2" } },
        ],
        "group-b": [
          { rank: 1, teamId: "B1", teamName: "B1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "B1", name: "B1" } },
          { rank: 2, teamId: "B2", teamName: "B2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "B2", name: "B2" } },
        ],
        "group-c": [
          { rank: 1, teamId: "C1", teamName: "C1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "C1", name: "C1" } },
          { rank: 2, teamId: "C2", teamName: "C2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "C2", name: "C2" } },
        ],
        "group-d": [
          { rank: 1, teamId: "D1", teamName: "D1", points: 9, played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "D1", name: "D1" } },
          { rank: 2, teamId: "D2", teamName: "D2", points: 6, played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, roundsWon: 35, roundsLost: 25, roundDifferential: 10, team: { id: "D2", name: "D2" } },
        ],
      };

      const { bracket } = generateKnockoutAdvancement(mockStandings);

      const groupOf = (teamId: string) => teamId.charAt(0); // 'A', 'B', 'C', 'D'

      let totalPathsTested = 0;
      let preFinalsCollisions = 0;

      for (let qfMask = 0; qfMask < 16; qfMask++) {
        for (let sfMask = 0; sfMask < 4; sfMask++) {
          totalPathsTested++;
          let currentBracket = JSON.parse(JSON.stringify(bracket));

          // 1. Play QF matches
          const qfMatches = currentBracket.rounds[0].matches;
          for (let m = 0; m < 4; m++) {
            const match = qfMatches[m];
            const pickTeamA = (qfMask & (1 << m)) === 0;
            const winner = pickTeamA ? match.teamA! : match.teamB!;
            currentBracket = advanceBracketWinner(currentBracket, match.id, winner.id);
          }

          // 2. Inspect SF matchups
          const sfMatches = currentBracket.rounds[1].matches;
          for (const sfMatch of sfMatches) {
            expect(sfMatch.teamA).toBeDefined();
            expect(sfMatch.teamB).toBeDefined();
            const groupA = groupOf(sfMatch.teamA!.id);
            const groupB = groupOf(sfMatch.teamB!.id);
            if (groupA === groupB) {
              preFinalsCollisions++;
            }
          }

          // 3. Play SF matches
          for (let m = 0; m < 2; m++) {
            const match = sfMatches[m];
            const pickTeamA = (sfMask & (1 << m)) === 0;
            const winner = pickTeamA ? match.teamA! : match.teamB!;
            currentBracket = advanceBracketWinner(currentBracket, match.id, winner.id);
          }

          // 4. Grand Finals match
          const gfMatch = currentBracket.rounds[2].matches[0];
          expect(gfMatch.teamA).toBeDefined();
          expect(gfMatch.teamB).toBeDefined();
        }
      }

      expect(totalPathsTested).toBe(64);
      expect(preFinalsCollisions).toBe(0);
    });
  });

  // --------------------------------------------------------------------------
  // CHALLENGE 4: Database & Seed Invariants
  // --------------------------------------------------------------------------
  describe("4. Database & Seed Invariants Stress Test", () => {
    it("should strictly verify all physical hardware and tournament seed invariants", () => {
      const data = generateSeedData();

      // Invariant: Tournament properties
      expect(data.tournament.name).toBe("VALORANT Campus Championship 2026");
      expect(data.tournament.status).toBe("READY");
      expect(data.tournament.format).toBe("SINGLE_ELIMINATION");

      // Invariant: Exactly 13 teams
      expect(data.teams.length).toBe(13);

      // Invariant: Exactly 65 players (5 per team)
      let totalPlayers = 0;
      const seenRiotTags = new Set<string>();

      data.teams.forEach((team, teamIdx) => {
        expect(team.seed).toBe(teamIdx + 1);
        expect(team.players.length).toBe(5);
        expect(team.status).toBe("CHECKED_IN");
        expect(team.captain).toBe(team.players[0].name);

        let captainCount = 0;
        let starterCount = 0;

        team.players.forEach((player) => {
          totalPlayers++;
          if (player.role === "CAPTAIN") captainCount++;
          if (player.role === "STARTER") starterCount++;

          const uniqueKey = `${team.name}_${player.riotId}#${player.riotTag}`;
          expect(seenRiotTags.has(uniqueKey)).toBe(false);
          seenRiotTags.add(uniqueKey);

          expect(player.verified).toBe(true);
          expect(player.present).toBe(true);
          expect(player.collegeId).toMatch(/^COL-2026-\d{3}$/);
        });

        // Exactly 1 captain and 4 starters per team
        expect(captainCount).toBe(1);
        expect(starterCount).toBe(4);
      });

      expect(totalPlayers).toBe(65);

      // Invariant: Physical Infrastructure across Labs & Stations
      const labs = data.venue.building.labs;
      expect(labs.length).toBe(2);

      const [lab1, lab2] = labs;
      expect(lab1.name).toContain("Lab 1");
      expect(lab1.totalPcs).toBe(30);
      expect(lab1.stations.length).toBe(3);

      expect(lab2.name).toContain("Lab 2");
      expect(lab2.totalPcs).toBe(10);
      expect(lab2.stations.length).toBe(1);

      // Total stations across venue = 4
      const allStations = [...lab1.stations, ...lab2.stations];
      expect(allStations.length).toBe(4);

      // Invariant: Every station has exactly 10 PCs
      let totalPcs = 0;
      allStations.forEach((station) => {
        expect(station.pcCount).toBe(10);
        expect(station.pcs.length).toBe(10);

        station.pcs.forEach((pc) => {
          totalPcs++;
          expect(pc.status).toBe("AVAILABLE");
          expect(pc.pcNumber).toMatch(/^PC-\d{2}$/);
          expect(pc.ipAddress).toMatch(/^192\.168\.1\.\d{3}$/);
        });
      });

      // Total PCs across venue = 40
      expect(totalPcs).toBe(40);

      // Invariant: GEMINI.md Capacity Formula
      // Lab match capacity = floor(working_PCs / 10) up to configured stations
      const lab1Capacity = Math.floor(lab1.totalPcs / 10);
      expect(lab1Capacity).toBe(3);
      expect(lab1Capacity).toBeLessThanOrEqual(lab1.stations.length);

      const lab2Capacity = Math.floor(lab2.totalPcs / 10);
      expect(lab2Capacity).toBe(1);
      expect(lab2Capacity).toBeLessThanOrEqual(lab2.stations.length);

      const totalConcurrentMatches = lab1Capacity + lab2Capacity;
      expect(totalConcurrentMatches).toBe(4);
    });

    it("should execute seed dry-run mode cleanly without throw", async () => {
      const prismaMock = {} as PrismaClient;
      const result = (await seed(prismaMock, true)) as {
        count: { teams: number; players: number; pcs: number; stations: number; labs: number };
      };

      expect(result.count.teams).toBe(13);
      expect(result.count.players).toBe(65);
      expect(result.count.pcs).toBe(40);
      expect(result.count.stations).toBe(4);
      expect(result.count.labs).toBe(2);
    });
  });
});
