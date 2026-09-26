import { describe, it, expect } from "vitest";
import {
  generateIPLPlayoffs,
  advanceIPLPlayoffResult,
} from "../../src/lib/tournament/ipl-playoffs";
import { Participant } from "../../src/lib/tournament/types";

describe("IPL Playoffs & 3-Place Prize Rankings Engine", () => {
  const top4Teams: Participant[] = [
    { id: "team-1", name: "XARAN", seed: 1 },
    { id: "team-2", name: "Muthusipi Orchestra", seed: 2 },
    { id: "team-3", name: "Eclipse", seed: 3 },
    { id: "team-4", name: "Tenzor", seed: 4 },
  ];

  it("should generate standard IPL playoff structure for top 4 teams", () => {
    const playoffs = generateIPLPlayoffs("test-tourney", top4Teams);

    expect(playoffs.matches.q1.teamA?.name).toBe("XARAN");
    expect(playoffs.matches.q1.teamB?.name).toBe("Muthusipi Orchestra");
    expect(playoffs.matches.eliminator.teamA?.name).toBe("Eclipse");
    expect(playoffs.matches.eliminator.teamB?.name).toBe("Tenzor");

    // Q2 and GF initially have unassigned feeder teams
    expect(playoffs.matches.q2.teamA).toBeUndefined();
    expect(playoffs.matches.q2.teamB).toBeUndefined();
    expect(playoffs.matches.grandFinal.teamA).toBeUndefined();
    expect(playoffs.matches.grandFinal.teamB).toBeUndefined();
    expect(playoffs.rankings.isCompleted).toBe(false);
  });

  it("should reject IPL playoffs if less than 4 teams are provided", () => {
    expect(() => generateIPLPlayoffs("test-tourney", top4Teams.slice(0, 3))).toThrow(
      /require exactly 4 qualified teams/
    );
  });

  it("should properly advance Q1 winner to Grand Final and Q1 loser to Q2", () => {
    let playoffs = generateIPLPlayoffs("test-tourney", top4Teams);

    // Q1: XARAN vs Muthusipi Orchestra -> XARAN wins
    playoffs = advanceIPLPlayoffResult(playoffs, "Q1", "team-1", { scoreA: 13, scoreB: 9 });

    expect(playoffs.matches.q1.status).toBe("VERIFIED");
    expect(playoffs.matches.q1.winnerId).toBe("team-1");
    // Winner (XARAN) goes straight to Grand Final
    expect(playoffs.matches.grandFinal.teamA?.id).toBe("team-1");
    // Loser (Muthusipi Orchestra) drops to Qualifier 2
    expect(playoffs.matches.q2.teamA?.id).toBe("team-2");
  });

  it("should properly advance Eliminator winner to Q2 and eliminate loser as 4th Place", () => {
    let playoffs = generateIPLPlayoffs("test-tourney", top4Teams);

    // EL: Eclipse vs Tenzor -> Eclipse wins (13-11)
    playoffs = advanceIPLPlayoffResult(playoffs, "EL", "team-3", { scoreA: 13, scoreB: 11 });

    expect(playoffs.matches.eliminator.status).toBe("VERIFIED");
    expect(playoffs.matches.eliminator.winnerId).toBe("team-3");
    // Winner (Eclipse) goes to Q2
    expect(playoffs.matches.q2.teamB?.id).toBe("team-3");
    // Loser (Tenzor) is official 4th Place
    expect(playoffs.rankings.fourthPlace?.id).toBe("team-4");
    expect(playoffs.rankings.fourthPlace?.name).toBe("Tenzor");
  });

  it("should complete entire playoff flow and crown exact 1st, 2nd, and 3rd Prize Places", () => {
    let playoffs = generateIPLPlayoffs("test-tourney", top4Teams);

    // 1. Q1: XARAN vs Muthusipi Orchestra -> XARAN wins (13-8)
    playoffs = advanceIPLPlayoffResult(playoffs, "Q1", "team-1", { scoreA: 13, scoreB: 8 });

    // 2. Eliminator: Eclipse vs Tenzor -> Eclipse wins (13-10)
    playoffs = advanceIPLPlayoffResult(playoffs, "EL", "team-3", { scoreA: 13, scoreB: 10 });

    // 3. Q2: Muthusipi Orchestra (Q1 loser) vs Eclipse (EL winner) -> Muthusipi Orchestra wins (13-11)
    expect(playoffs.matches.q2.teamA?.name).toBe("Muthusipi Orchestra");
    expect(playoffs.matches.q2.teamB?.name).toBe("Eclipse");

    playoffs = advanceIPLPlayoffResult(playoffs, "Q2", "team-2", { scoreA: 13, scoreB: 11 });

    // Loser of Q2 takes 3rd Place (Bronze Prize)!
    expect(playoffs.rankings.thirdPlace?.id).toBe("team-3");
    expect(playoffs.rankings.thirdPlace?.name).toBe("Eclipse");

    // 4. Grand Final: XARAN (Q1 winner) vs Muthusipi Orchestra (Q2 winner)
    expect(playoffs.matches.grandFinal.teamA?.name).toBe("XARAN");
    expect(playoffs.matches.grandFinal.teamB?.name).toBe("Muthusipi Orchestra");

    playoffs = advanceIPLPlayoffResult(playoffs, "GF", "team-1", { scoreA: 13, scoreB: 7 });

    // Verify final podium
    expect(playoffs.rankings.isCompleted).toBe(true);
    expect(playoffs.rankings.firstPlace?.id).toBe("team-1");
    expect(playoffs.rankings.firstPlace?.name).toBe("XARAN"); // Champion / 1st Place

    expect(playoffs.rankings.secondPlace?.id).toBe("team-2");
    expect(playoffs.rankings.secondPlace?.name).toBe("Muthusipi Orchestra"); // Runner-Up / 2nd Place

    expect(playoffs.rankings.thirdPlace?.id).toBe("team-3");
    expect(playoffs.rankings.thirdPlace?.name).toBe("Eclipse"); // 3rd Place Bronze Prize

    expect(playoffs.rankings.fourthPlace?.id).toBe("team-4");
    expect(playoffs.rankings.fourthPlace?.name).toBe("Tenzor"); // 4th Place
  });
});
