import { describe, it, expect } from "vitest";
import {
  generateGroupStage,
  calculateGroupStandings,
  generateKnockoutAdvancement,
} from "../../src/lib/tournament/group-stage";
import { advanceBracketWinner } from "../../src/lib/tournament/bracket";
import { Participant, TeamStanding } from "../../src/lib/tournament/types";

function createMockTeams(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

describe("Group Stage Engine — Snake Seeding & Group Setup", () => {
  it("throws an error if fewer than 2 groups are requested", () => {
    const teams = createMockTeams(16);
    expect(() => generateGroupStage(teams, 1)).toThrow(
      "Group stage requires at least 2 groups."
    );
  });

  it("throws an error if teams are insufficient for groups", () => {
    const teams = createMockTeams(6);
    expect(() => generateGroupStage(teams, 4)).toThrow(
      "Group stage requires at least 2 teams per group (8 participants for 4 groups)."
    );
  });

  it("correctly performs snake seeding for 16 teams into 4 groups", () => {
    const teams = createMockTeams(16);
    const structure = generateGroupStage(teams, 4);

    expect(structure.groupCount).toBe(4);
    expect(structure.groups.length).toBe(4);
    expect(structure.totalMatches).toBe(24); // 4 groups * 6 matches

    const [groupA, groupB, groupC, groupD] = structure.groups;

    // Check Group Names
    expect(groupA.name).toBe("Group A");
    expect(groupB.name).toBe("Group B");
    expect(groupC.name).toBe("Group C");
    expect(groupD.name).toBe("Group D");

    // Snake Seeding Verification:
    // Pot 1 (1-4, left to right): A:1, B:2, C:3, D:4
    // Pot 2 (5-8, right to left): D:5, C:6, B:7, A:8
    // Pot 3 (9-12, left to right): A:9, B:10, C:11, D:12
    // Pot 4 (13-16, right to left): D:13, C:14, B:15, A:16
    const getSeeds = (g: typeof groupA) => g.teams.map((t) => t.seed);

    expect(getSeeds(groupA)).toEqual([1, 8, 9, 16]);
    expect(getSeeds(groupB)).toEqual([2, 7, 10, 15]);
    expect(getSeeds(groupC)).toEqual([3, 6, 11, 14]);
    expect(getSeeds(groupD)).toEqual([4, 5, 12, 13]);

    // Verify all 16 teams are accounted for with no duplicates
    const allAssignedIds = structure.groups.flatMap((g) => g.teams.map((t) => t.id));
    expect(new Set(allAssignedIds).size).toBe(16);

    // Verify internal round-robin fixture generation for each group
    for (const g of structure.groups) {
      expect(g.rounds.length).toBe(3); // 4 teams -> 3 rounds
      const matches = g.rounds.flatMap((r) => r.matches);
      expect(matches.length).toBe(6); // 4*3/2 = 6 matches

      // Check unique match IDs and codes prefixed with group
      for (const m of matches) {
        expect(m.id.startsWith(g.id)).toBe(true);
        expect(m.code.startsWith(`G${g.name.slice(-1)}`)).toBe(true);
        expect(m.groupId).toBe(g.id);
      }
    }
  });
});

describe("Group Stage Engine — Standings & Crossover Knockout", () => {
  it("calculates group standings from completed matches", () => {
    const teams = createMockTeams(16);
    const structure = generateGroupStage(teams, 4);

    // Populate matches in Group A:
    // Teams in Group A: Team 1 (seed 1), Team 8 (seed 8), Team 9 (seed 9), Team 16 (seed 16)
    // Make Team 1 win all 3 matches (9 pts, rank 1)
    // Make Team 8 win 2 matches (6 pts, rank 2)
    // Make Team 9 win 1 match (3 pts, rank 3)
    // Make Team 16 lose all 3 matches (0 pts, rank 4)
    const groupA = structure.groups[0];
    for (const r of groupA.rounds) {
      for (const m of r.matches) {
        m.status = "VERIFIED";
        if (m.teamA?.id === "team-1" || m.teamB?.id === "team-1") {
          const t1IsA = m.teamA?.id === "team-1";
          m.winnerId = "team-1";
          m.scoreA = t1IsA ? 13 : 5;
          m.scoreB = t1IsA ? 5 : 13;
        } else if (m.teamA?.id === "team-8" || m.teamB?.id === "team-8") {
          const t8IsA = m.teamA?.id === "team-8";
          m.winnerId = "team-8";
          m.scoreA = t8IsA ? 13 : 7;
          m.scoreB = t8IsA ? 7 : 13;
        } else {
          // Team 9 vs Team 16 -> Team 9 wins
          const t9IsA = m.teamA?.id === "team-9";
          m.winnerId = "team-9";
          m.scoreA = t9IsA ? 13 : 9;
          m.scoreB = t9IsA ? 9 : 13;
        }
      }
    }

    const updatedGroups = calculateGroupStandings(structure.groups);
    const updatedGroupA = updatedGroups[0];

    expect(updatedGroupA.standings).toBeDefined();
    expect(updatedGroupA.standings!.length).toBe(4);

    expect(updatedGroupA.standings![0].teamId).toBe("team-1");
    expect(updatedGroupA.standings![0].rank).toBe(1);
    expect(updatedGroupA.standings![0].points).toBe(9);

    expect(updatedGroupA.standings![1].teamId).toBe("team-8");
    expect(updatedGroupA.standings![1].rank).toBe(2);
    expect(updatedGroupA.standings![1].points).toBe(6);

    expect(updatedGroupA.standings![2].teamId).toBe("team-9");
    expect(updatedGroupA.standings![2].rank).toBe(3);
    expect(updatedGroupA.standings![2].points).toBe(3);

    expect(updatedGroupA.standings![3].teamId).toBe("team-16");
    expect(updatedGroupA.standings![3].rank).toBe(4);
    expect(updatedGroupA.standings![3].points).toBe(0);
  });

  it("generates crossover knockout advancement for 4 groups into 8-team Single Elimination bracket", () => {
    // Construct 4 groups with explicit top 2 teams
    const mockGroupStandings: Record<string, TeamStanding[]> = {
      "group-a": [
        { rank: 1, teamId: "A1", teamName: "Alpha 1", played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, points: 9, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "A1", name: "Alpha 1" } },
        { rank: 2, teamId: "A2", teamName: "Alpha 2", played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, points: 6, roundsWon: 33, roundsLost: 20, roundDifferential: 13, team: { id: "A2", name: "Alpha 2" } },
      ],
      "group-b": [
        { rank: 1, teamId: "B1", teamName: "Beta 1", played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, points: 9, roundsWon: 39, roundsLost: 12, roundDifferential: 27, team: { id: "B1", name: "Beta 1" } },
        { rank: 2, teamId: "B2", teamName: "Beta 2", played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, points: 6, roundsWon: 32, roundsLost: 22, roundDifferential: 10, team: { id: "B2", name: "Beta 2" } },
      ],
      "group-c": [
        { rank: 1, teamId: "C1", teamName: "Charlie 1", played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, points: 9, roundsWon: 39, roundsLost: 18, roundDifferential: 21, team: { id: "C1", name: "Charlie 1" } },
        { rank: 2, teamId: "C2", teamName: "Charlie 2", played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, points: 6, roundsWon: 31, roundsLost: 25, roundDifferential: 6, team: { id: "C2", name: "Charlie 2" } },
      ],
      "group-d": [
        { rank: 1, teamId: "D1", teamName: "Delta 1", played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, points: 9, roundsWon: 39, roundsLost: 10, roundDifferential: 29, team: { id: "D1", name: "Delta 1" } },
        { rank: 2, teamId: "D2", teamName: "Delta 2", played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, points: 6, roundsWon: 30, roundsLost: 24, roundDifferential: 6, team: { id: "D2", name: "Delta 2" } },
      ],
    };

    const result = generateKnockoutAdvancement(mockGroupStandings);

    expect(result.advancement.length).toBe(8);
    expect(result.bracket).toBeDefined();
    expect(result.bracket.bracketSize).toBe(8);
    expect(result.bracket.totalRounds).toBe(3); // QF, SF, GF
    expect(result.bracket.rounds.length).toBe(3);

    // Verify Quarterfinal Crossover Matchups:
    // Match 1: Group A 1st vs Group B 2nd
    // Match 2: Group C 1st vs Group D 2nd
    // Match 3: Group B 1st vs Group A 2nd
    // Match 4: Group D 1st vs Group C 2nd
    const qfMatches = result.bracket.rounds[0].matches;
    expect(qfMatches.length).toBe(4);

    expect(qfMatches[0].teamA?.id).toBe("A1");
    expect(qfMatches[0].teamB?.id).toBe("B2");

    expect(qfMatches[1].teamA?.id).toBe("C1");
    expect(qfMatches[1].teamB?.id).toBe("D2");

    expect(qfMatches[2].teamA?.id).toBe("B1");
    expect(qfMatches[2].teamB?.id).toBe("A2");

    expect(qfMatches[3].teamA?.id).toBe("D1");
    expect(qfMatches[3].teamB?.id).toBe("C2");

    // Invariant: Top seeds from the same group MUST be placed in opposite bracket halves!
    // Semifinal 1 will be fed by Match 1 & Match 2 ({A1, B2} vs {C1, D2})
    // Semifinal 2 will be fed by Match 3 & Match 4 ({B1, A2} vs {D1, C2})
    // Group A: A1 is in Match 1 (SF1 half), A2 is in Match 3 (SF2 half)
    expect(qfMatches[0].nextMatchId).toBe(qfMatches[1].nextMatchId); // SF 1
    expect(qfMatches[2].nextMatchId).toBe(qfMatches[3].nextMatchId); // SF 2
    expect(qfMatches[0].nextMatchId).not.toBe(qfMatches[2].nextMatchId);

    // Verify that the bracket is playable via advanceBracketWinner
    const updated = advanceBracketWinner(result.bracket, qfMatches[0].id, "A1");
    const sf1Match = updated.rounds[1].matches[0];
    expect(sf1Match.teamA?.id).toBe("A1");
  });

  it("supports 2 groups advancing to 4-team Semifinals crossover bracket", () => {
    const mockStandings: Record<string, TeamStanding[]> = {
      "group-a": [
        { rank: 1, teamId: "A1", teamName: "Alpha 1", played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, points: 9, roundsWon: 39, roundsLost: 15, roundDifferential: 24, team: { id: "A1", name: "Alpha 1" } },
        { rank: 2, teamId: "A2", teamName: "Alpha 2", played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, points: 6, roundsWon: 33, roundsLost: 20, roundDifferential: 13, team: { id: "A2", name: "Alpha 2" } },
      ],
      "group-b": [
        { rank: 1, teamId: "B1", teamName: "Beta 1", played: 3, wins: 3, regulationWins: 3, otWins: 0, losses: 0, points: 9, roundsWon: 39, roundsLost: 12, roundDifferential: 27, team: { id: "B1", name: "Beta 1" } },
        { rank: 2, teamId: "B2", teamName: "Beta 2", played: 3, wins: 2, regulationWins: 2, otWins: 0, losses: 1, points: 6, roundsWon: 32, roundsLost: 22, roundDifferential: 10, team: { id: "B2", name: "Beta 2" } },
      ],
    };

    const result = generateKnockoutAdvancement(mockStandings);

    expect(result.advancement.length).toBe(4);
    expect(result.bracket.bracketSize).toBe(4);
    expect(result.bracket.totalRounds).toBe(2); // SF, GF

    const sfMatches = result.bracket.rounds[0].matches;
    expect(sfMatches.length).toBe(2);

    // SF 1: Group A 1st vs Group B 2nd
    expect(sfMatches[0].teamA?.id).toBe("A1");
    expect(sfMatches[0].teamB?.id).toBe("B2");

    // SF 2: Group B 1st vs Group A 2nd
    expect(sfMatches[1].teamA?.id).toBe("B1");
    expect(sfMatches[1].teamB?.id).toBe("A2");
  });
});
