import { describe, it, expect } from "vitest";
import {
  generateSingleEliminationBracket,
  generateSeedOrder,
  advanceBracketWinner,
} from "../../src/lib/tournament/bracket";
import { Participant } from "../../src/lib/tournament/types";

function createMockTeams(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

describe("Bracket Engine — Seed Generation", () => {
  it("generates correct seeding for bracket size 2", () => {
    expect(generateSeedOrder(2)).toEqual([1, 2]);
  });

  it("generates correct seeding for bracket size 4", () => {
    // Top seeds 1 and 2 in opposite halves
    expect(generateSeedOrder(4)).toEqual([1, 4, 2, 3]);
  });

  it("generates correct seeding for bracket size 8", () => {
    expect(generateSeedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("generates correct seeding for bracket size 16", () => {
    expect(generateSeedOrder(16)).toEqual([
      1, 16, 8, 9, 4, 13, 5, 12, 2, 15, 7, 10, 3, 14, 6, 11,
    ]);
  });
});

describe("Bracket Engine — Arbitrary Team Counts & BYEs", () => {
  const teamCounts = [2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32];

  teamCounts.forEach((count) => {
    it(`generates valid bracket for ${count} teams`, () => {
      const teams = createMockTeams(count);
      const bracket = generateSingleEliminationBracket(teams);

      const expectedSize = Math.pow(2, Math.ceil(Math.log2(count)));
      const expectedBYEs = expectedSize - count;
      const expectedRounds = Math.log2(expectedSize);

      expect(bracket.bracketSize).toBe(expectedSize);
      expect(bracket.totalBYEs).toBe(expectedBYEs);
      expect(bracket.totalRounds).toBe(expectedRounds);
      expect(bracket.rounds.length).toBe(expectedRounds);

      // Verify no duplicate team IDs in Round 1
      const round1 = bracket.rounds[0];
      const seenTeamIds = new Set<string>();
      let byeMatchCount = 0;

      for (const m of round1.matches) {
        if (m.teamA) {
          expect(seenTeamIds.has(m.teamA.id)).toBe(false);
          seenTeamIds.add(m.teamA.id);
        }
        if (m.teamB) {
          expect(seenTeamIds.has(m.teamB.id)).toBe(false);
          seenTeamIds.add(m.teamB.id);
        }
        if (m.isBye) {
          byeMatchCount++;
          expect(m.status).toBe("VERIFIED");
          expect(m.winnerId).toBeDefined();
        }
      }

      expect(byeMatchCount).toBe(expectedBYEs);
      expect(seenTeamIds.size).toBe(count);
    });
  });

  it("verifies 13-team tournament has 16 bracket size and 3 BYEs awarded to top 3 seeds", () => {
    const teams = createMockTeams(13);
    const bracket = generateSingleEliminationBracket(teams);

    expect(bracket.bracketSize).toBe(16);
    expect(bracket.totalBYEs).toBe(3);

    // Top seeds 1, 2, 3 should receive BYEs and advance to Round 2
    const round2 = bracket.rounds[1];
    const r2TeamIds = new Set<string>();

    for (const m of round2.matches) {
      if (m.teamA) r2TeamIds.add(m.teamA.id);
      if (m.teamB) r2TeamIds.add(m.teamB.id);
    }

    expect(r2TeamIds.has("team-1")).toBe(true);
    expect(r2TeamIds.has("team-2")).toBe(true);
    expect(r2TeamIds.has("team-3")).toBe(true);
  });
});

describe("Bracket Engine — Winner Advancement", () => {
  it("advances winner of Round 1 match into Round 2 target slot", () => {
    const teams = createMockTeams(13);
    const bracket = generateSingleEliminationBracket(teams);

    // Find a playable (non-BYE) match in Round 1
    const playableMatch = bracket.rounds[0].matches.find(
      (m) => !m.isBye && m.teamA && m.teamB
    );
    expect(playableMatch).toBeDefined();

    const winner = playableMatch!.teamA!;
    const updatedBracket = advanceBracketWinner(
      bracket,
      playableMatch!.id,
      winner.id
    );

    const updatedMatch = updatedBracket.rounds[0].matches.find(
      (m) => m.id === playableMatch!.id
    );
    expect(updatedMatch?.status).toBe("VERIFIED");
    expect(updatedMatch?.winnerId).toBe(winner.id);

    // Verify next match received this winner
    const nextMatch = updatedBracket.rounds[1].matches.find(
      (m) => m.id === playableMatch!.nextMatchId
    );
    expect(nextMatch).toBeDefined();

    if (playableMatch!.nextMatchSlot === "TEAM_A") {
      expect(nextMatch?.teamA?.id).toBe(winner.id);
    } else {
      expect(nextMatch?.teamB?.id).toBe(winner.id);
    }
  });
});
