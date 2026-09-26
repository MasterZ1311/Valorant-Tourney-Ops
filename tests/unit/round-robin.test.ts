import { describe, it, expect } from "vitest";
import {
  generateRoundRobinFixtures,
  calculateRoundRobinStandings,
} from "../../src/lib/tournament/round-robin";
import { Participant, RoundRobinMatch } from "../../src/lib/tournament/types";

function createMockTeams(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

describe("Round Robin Engine — Fixture Generation", () => {
  it("throws an error when fewer than 2 participants are provided", () => {
    expect(() => generateRoundRobinFixtures([])).toThrow(
      "Round Robin requires at least 2 participants."
    );
    expect(() => generateRoundRobinFixtures(createMockTeams(1))).toThrow(
      "Round Robin requires at least 2 participants."
    );
  });

  const evenCounts = [2, 4, 8];
  evenCounts.forEach((count) => {
    describe(`Even team count: ${count} teams`, () => {
      it(`generates ${count - 1} rounds and ${(count * (count - 1)) / 2} matches`, () => {
        const teams = createMockTeams(count);
        const result = generateRoundRobinFixtures(teams);

        const expectedRounds = count - 1;
        const expectedMatches = (count * (count - 1)) / 2;

        expect(result.totalRounds).toBe(expectedRounds);
        expect(result.totalMatches).toBe(expectedMatches);
        expect(result.rounds.length).toBe(expectedRounds);

        // Flatten all matches
        const allMatches = result.rounds.flatMap((r) => r.matches);
        expect(allMatches.length).toBe(expectedMatches);

        // Every match must not be a BYE
        expect(allMatches.every((m) => !m.isBye)).toBe(true);

        // Verify each team plays every other team exactly once
        const pairCounts = new Map<string, number>();
        for (const m of allMatches) {
          expect(m.teamA).toBeDefined();
          expect(m.teamB).toBeDefined();
          const [id1, id2] = [m.teamA!.id, m.teamB!.id].sort();
          const pairKey = `${id1}_vs_${id2}`;
          pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
        }

        expect(pairCounts.size).toBe(expectedMatches);
        for (const count of pairCounts.values()) {
          expect(count).toBe(1);
        }

        // Verify balanced home/away: difference between home and away games <= 1
        const homeGames = new Map<string, number>();
        const awayGames = new Map<string, number>();
        for (const t of teams) {
          homeGames.set(t.id, 0);
          awayGames.set(t.id, 0);
        }

        for (const m of allMatches) {
          homeGames.set(m.teamA!.id, (homeGames.get(m.teamA!.id) ?? 0) + 1);
          awayGames.set(m.teamB!.id, (awayGames.get(m.teamB!.id) ?? 0) + 1);
        }

        for (const t of teams) {
          const h = homeGames.get(t.id) ?? 0;
          const a = awayGames.get(t.id) ?? 0;
          expect(Math.abs(h - a)).toBeLessThanOrEqual(1);
          expect(h + a).toBe(count - 1);
        }
      });
    });
  });

  const oddCounts = [3, 5];
  oddCounts.forEach((count) => {
    describe(`Odd team count: ${count} teams`, () => {
      it(`generates ${count} rounds with exactly 1 BYE per round and ${(count * (count - 1)) / 2} playable matches`, () => {
        const teams = createMockTeams(count);
        const result = generateRoundRobinFixtures(teams);

        const expectedRounds = count;
        const expectedPlayableMatches = (count * (count - 1)) / 2;

        expect(result.totalRounds).toBe(expectedRounds);
        expect(result.totalMatches).toBe(expectedPlayableMatches);
        expect(result.rounds.length).toBe(expectedRounds);

        const allMatches = result.rounds.flatMap((r) => r.matches);
        const playableMatches = allMatches.filter((m) => !m.isBye);
        const byeMatches = allMatches.filter((m) => m.isBye);

        expect(playableMatches.length).toBe(expectedPlayableMatches);
        expect(byeMatches.length).toBe(count);

        // Exactly 1 BYE match per round
        for (const r of result.rounds) {
          const roundByes = r.matches.filter((m) => m.isBye);
          expect(roundByes.length).toBe(1);
          expect(roundByes[0].status).toBe("VERIFIED");
          expect(roundByes[0].teamA).toBeDefined();
          expect(roundByes[0].teamB).toBeUndefined();
        }

        // Each team receives exactly 1 BYE across the tournament
        const byeRecipients = new Set<string>();
        for (const bm of byeMatches) {
          expect(byeRecipients.has(bm.teamA!.id)).toBe(false);
          byeRecipients.add(bm.teamA!.id);
        }
        expect(byeRecipients.size).toBe(count);

        // Every team plays every other team exactly once
        const pairCounts = new Map<string, number>();
        for (const m of playableMatches) {
          expect(m.teamA).toBeDefined();
          expect(m.teamB).toBeDefined();
          const [id1, id2] = [m.teamA!.id, m.teamB!.id].sort();
          const pairKey = `${id1}_vs_${id2}`;
          pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
        }

        expect(pairCounts.size).toBe(expectedPlayableMatches);
        for (const cnt of pairCounts.values()) {
          expect(cnt).toBe(1);
        }

        // Verify balanced home/away among playable matches
        for (const t of teams) {
          const h = playableMatches.filter((m) => m.teamA?.id === t.id).length;
          const a = playableMatches.filter((m) => m.teamB?.id === t.id).length;
          expect(Math.abs(h - a)).toBeLessThanOrEqual(1);
          expect(h + a).toBe(count - 1);
        }
      });
    });
  });
});

describe("Round Robin Engine — Standings & Tiebreakers", () => {
  it("calculates correct points: 3 for standard win, 1 for OT win, 0 for loss", () => {
    const teams = createMockTeams(3);
    const matches: RoundRobinMatch[] = [
      // Team 1 beats Team 2 in regulation (13-5) -> Team 1: 3 pts, Team 2: 0 pts
      {
        id: "m1",
        roundNumber: 1,
        roundName: "Round 1",
        matchNumber: 1,
        code: "RR-R1-M1",
        teamA: teams[0],
        teamB: teams[1],
        winnerId: teams[0].id,
        scoreA: 13,
        scoreB: 5,
        isOvertime: false,
        isBye: false,
        status: "VERIFIED",
      },
      // Team 1 beats Team 3 in overtime (14-12) -> Team 1: 1 pt (OT win), Team 3: 0 pts
      {
        id: "m2",
        roundNumber: 2,
        roundName: "Round 2",
        matchNumber: 1,
        code: "RR-R2-M1",
        teamA: teams[0],
        teamB: teams[2],
        winnerId: teams[0].id,
        scoreA: 14,
        scoreB: 12,
        isOvertime: true,
        isBye: false,
        status: "VERIFIED",
      },
      // Team 2 beats Team 3 in regulation (13-8) -> Team 2: 3 pts, Team 3: 0 pts
      {
        id: "m3",
        roundNumber: 3,
        roundName: "Round 3",
        matchNumber: 1,
        code: "RR-R3-M1",
        teamA: teams[1],
        teamB: teams[2],
        winnerId: teams[1].id,
        scoreA: 13,
        scoreB: 8,
        isOvertime: false,
        isBye: false,
        status: "VERIFIED",
      },
    ];

    const standings = calculateRoundRobinStandings(matches, teams);

    expect(standings.length).toBe(3);

    // Rank 1: Team 1 (4 pts: 1 standard win + 1 OT win)
    expect(standings[0].teamId).toBe("team-1");
    expect(standings[0].rank).toBe(1);
    expect(standings[0].points).toBe(4);
    expect(standings[0].wins).toBe(2);
    expect(standings[0].regulationWins).toBe(1);
    expect(standings[0].otWins).toBe(1);
    expect(standings[0].losses).toBe(0);
    expect(standings[0].roundsWon).toBe(27); // 13 + 14
    expect(standings[0].roundsLost).toBe(17); // 5 + 12
    expect(standings[0].roundDifferential).toBe(10);

    // Rank 2: Team 2 (3 pts: 1 standard win, 1 loss)
    expect(standings[1].teamId).toBe("team-2");
    expect(standings[1].rank).toBe(2);
    expect(standings[1].points).toBe(3);
    expect(standings[1].wins).toBe(1);
    expect(standings[1].regulationWins).toBe(1);
    expect(standings[1].otWins).toBe(0);
    expect(standings[1].losses).toBe(1);

    // Rank 3: Team 3 (0 pts: 2 losses)
    expect(standings[2].teamId).toBe("team-3");
    expect(standings[2].rank).toBe(3);
    expect(standings[2].points).toBe(0);
    expect(standings[2].losses).toBe(2);
  });

  it("resolves 2-way tie using Head-to-Head result", () => {
    const teams = createMockTeams(4);
    // Team 1 beats Team 2 (13-10)
    // Both finish with 6 points
    const matches: RoundRobinMatch[] = [
      {
        id: "m1",
        roundNumber: 1,
        roundName: "Round 1",
        matchNumber: 1,
        code: "M1",
        teamA: teams[0],
        teamB: teams[1],
        winnerId: teams[0].id,
        scoreA: 13,
        scoreB: 10,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m2",
        roundNumber: 1,
        roundName: "Round 1",
        matchNumber: 2,
        code: "M2",
        teamA: teams[2],
        teamB: teams[3],
        winnerId: teams[2].id,
        scoreA: 13,
        scoreB: 5,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m3",
        roundNumber: 2,
        roundName: "Round 2",
        matchNumber: 1,
        code: "M3",
        teamA: teams[0],
        teamB: teams[2],
        winnerId: teams[0].id,
        scoreA: 13,
        scoreB: 8,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m4",
        roundNumber: 2,
        roundName: "Round 2",
        matchNumber: 2,
        code: "M4",
        teamA: teams[1],
        teamB: teams[3],
        winnerId: teams[1].id,
        scoreA: 13,
        scoreB: 2,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m5",
        roundNumber: 3,
        roundName: "Round 3",
        matchNumber: 1,
        code: "M5",
        teamA: teams[0],
        teamB: teams[3],
        winnerId: teams[3].id,
        scoreA: 10,
        scoreB: 13,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m6",
        roundNumber: 3,
        roundName: "Round 3",
        matchNumber: 2,
        code: "M6",
        teamA: teams[1],
        teamB: teams[2],
        winnerId: teams[1].id,
        scoreA: 13,
        scoreB: 4,
        isBye: false,
        status: "VERIFIED",
      },
    ];

    const standings = calculateRoundRobinStandings(matches, teams);

    // Team 1 and Team 2 both have 2 wins (6 pts).
    // Notice Team 2 has better round differential:
    // Team 2: (10-13) + (13-2) + (13-4) = -3 + 11 + 9 = +17
    // Team 1: (13-10) + (13-8) + (10-13) = +3 + 5 - 3 = +5
    // But Team 1 won the Head-to-Head against Team 2!
    // Therefore, Team 1 MUST be ranked #1 by H2H, and Team 2 #2!
    expect(standings[0].teamId).toBe("team-1");
    expect(standings[0].points).toBe(6);
    expect(standings[0].tiebreakerReason).toContain("Head-to-head win over Team 2");

    expect(standings[1].teamId).toBe("team-2");
    expect(standings[1].points).toBe(6);
    expect(standings[1].tiebreakerReason).toContain("Head-to-head loss to Team 1");
  });

  it("resolves 3-way circular tie using Round Differential", () => {
    const teams = createMockTeams(3);
    // Circular tie:
    // Team 1 beats Team 2: 13-4 (+9 diff for T1, -9 for T2)
    // Team 2 beats Team 3: 13-6 (+7 diff for T2, -7 for T3)
    // Team 3 beats Team 1: 13-10 (+3 diff for T3, -3 for T1)
    // All teams have 1 win, 3 points each.
    // In H2H mini-league, all teams have 1 win (tied).
    // Round differentials:
    // Team 1: +9 - 3 = +6
    // Team 2: -9 + 7 = -2
    // Team 3: -7 + 3 = -4
    const matches: RoundRobinMatch[] = [
      {
        id: "m1",
        roundNumber: 1,
        roundName: "Round 1",
        matchNumber: 1,
        code: "M1",
        teamA: teams[0],
        teamB: teams[1],
        winnerId: teams[0].id,
        scoreA: 13,
        scoreB: 4,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m2",
        roundNumber: 2,
        roundName: "Round 2",
        matchNumber: 1,
        code: "M2",
        teamA: teams[1],
        teamB: teams[2],
        winnerId: teams[1].id,
        scoreA: 13,
        scoreB: 6,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m3",
        roundNumber: 3,
        roundName: "Round 3",
        matchNumber: 1,
        code: "M3",
        teamA: teams[2],
        teamB: teams[0],
        winnerId: teams[2].id,
        scoreA: 13,
        scoreB: 10,
        isBye: false,
        status: "VERIFIED",
      },
    ];

    const standings = calculateRoundRobinStandings(matches, teams);

    expect(standings[0].teamId).toBe("team-1");
    expect(standings[0].roundDifferential).toBe(6);
    expect(standings[0].rank).toBe(1);

    expect(standings[1].teamId).toBe("team-2");
    expect(standings[1].roundDifferential).toBe(-2);
    expect(standings[1].rank).toBe(2);

    expect(standings[2].teamId).toBe("team-3");
    expect(standings[2].roundDifferential).toBe(-4);
    expect(standings[2].rank).toBe(3);
  });

  it("resolves tie using Total Rounds Won when points and differential are tied", () => {
    const teams = createMockTeams(2);
    // Both teams finish with 3 points and round differential of 0:
    // Team 1: Won 13-7 (+6), Lost 7-13 (-6) -> 3 pts, diff = 0, rounds won = 20
    // Team 2: Won 13-9 (+4), Lost 9-13 (-4) -> 3 pts, diff = 0, rounds won = 22
    const matches: RoundRobinMatch[] = [
      {
        id: "m1",
        roundNumber: 1,
        roundName: "R1",
        matchNumber: 1,
        code: "M1",
        teamA: teams[0],
        teamB: { id: "ext-1", name: "Ext 1" },
        winnerId: teams[0].id,
        scoreA: 13,
        scoreB: 7,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m2",
        roundNumber: 2,
        roundName: "R2",
        matchNumber: 1,
        code: "M2",
        teamA: { id: "ext-2", name: "Ext 2" },
        teamB: teams[0],
        winnerId: "ext-2",
        scoreA: 13,
        scoreB: 7,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m3",
        roundNumber: 1,
        roundName: "R1",
        matchNumber: 2,
        code: "M3",
        teamA: teams[1],
        teamB: { id: "ext-3", name: "Ext 3" },
        winnerId: teams[1].id,
        scoreA: 13,
        scoreB: 9,
        isBye: false,
        status: "VERIFIED",
      },
      {
        id: "m4",
        roundNumber: 2,
        roundName: "R2",
        matchNumber: 2,
        code: "M4",
        teamA: { id: "ext-4", name: "Ext 4" },
        teamB: teams[1],
        winnerId: "ext-4",
        scoreA: 13,
        scoreB: 9,
        isBye: false,
        status: "VERIFIED",
      },
    ];

    const standings = calculateRoundRobinStandings(matches, teams);

    // Both have 3 points and 0 round differential
    // Team 2 has 22 rounds won vs Team 1's 20 rounds won
    expect(standings[0].teamId).toBe("team-2");
    expect(standings[0].points).toBe(3);
    expect(standings[0].roundDifferential).toBe(0);
    expect(standings[0].roundsWon).toBe(22);
    expect(standings[0].tiebreakerReason).toContain("Total rounds won (22");

    expect(standings[1].teamId).toBe("team-1");
    expect(standings[1].points).toBe(3);
    expect(standings[1].roundDifferential).toBe(0);
    expect(standings[1].roundsWon).toBe(20);
  });
});
