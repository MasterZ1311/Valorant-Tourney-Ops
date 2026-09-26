import { describe, it, expect } from "vitest";
import {
  generateStage1Schedule,
  getDefaultStage1Config,
  recalculateLabCapacity,
  swapStage1Teams,
} from "../../src/lib/scheduling/stage1-fixtures";
import { Participant } from "../../src/lib/tournament/types";

describe("Stage 1 Slot-Based Match & Fixture Engine (13 Teams, AI Lab & Meta lab)", () => {
  const official13Teams: Participant[] = [
    { id: "t-1", name: "XARAN", seed: 1 },
    { id: "t-2", name: "Muthusipi Orchestra", seed: 2 },
    { id: "t-3", name: "Eclipse", seed: 3 },
    { id: "t-4", name: "Tenzor", seed: 4 },
    { id: "t-5", name: "ESP (espada)", seed: 5 },
    { id: "t-6", name: "Error4O4", seed: 6 },
    { id: "t-7", name: "TEAM VORTEX", seed: 7 },
    { id: "t-8", name: "VALORANT NOOBS", seed: 8 },
    { id: "t-9", name: "Skull Krushers", seed: 9 },
    { id: "t-10", name: "x", seed: 10 },
    { id: "t-11", name: "Goodie Gang", seed: 11 },
    { id: "t-12", name: "TEAM EREN", seed: 12 },
    { id: "t-13", name: "Kawai", seed: 13 },
  ];

  it("should generate exact 2 time slots for 13 teams across AI Lab and Meta lab", () => {
    const config = getDefaultStage1Config("2026-10-15T10:00:00.000Z");
    const schedule = generateStage1Schedule("vto-tourney-1", official13Teams, config);

    expect(schedule.totalTeams).toBe(13);
    expect(schedule.teamsWithMatches).toBe(12); // 6 matches = 12 teams
    expect(schedule.byeTeam?.name).toBe("Kawai"); // Seed 13 receives BYE
    expect(schedule.slots).toHaveLength(2);
    expect(schedule.conflicts).toHaveLength(0);

    // Slot 1: Exactly 4 matches (AI Lab: 3, Meta lab: 1)
    const slot1 = schedule.slots[0];
    expect(slot1.name).toBe("Time Slot 1");
    expect(slot1.matches).toHaveLength(4);
    expect(slot1.activeMatches).toBe(4);
    expect(slot1.byeCount).toBe(0);
    expect(slot1.unusedCount).toBe(0);

    // Verify AI Lab has 3 matches and Meta lab has 1 match in Slot 1
    const slot1AILab = slot1.matches.filter((m) => m.labName === "AI Lab");
    const slot1MetaLab = slot1.matches.filter((m) => m.labName === "Meta lab");
    expect(slot1AILab).toHaveLength(3);
    expect(slot1MetaLab).toHaveLength(1);

    // Check specific match pairings in Slot 1
    expect(slot1AILab[0].teamA?.name).toBe("XARAN");
    expect(slot1AILab[0].teamB?.name).toBe("Muthusipi Orchestra");

    expect(slot1AILab[1].teamA?.name).toBe("Eclipse");
    expect(slot1AILab[1].teamB?.name).toBe("Tenzor");

    expect(slot1AILab[2].teamA?.name).toBe("ESP (espada)");
    expect(slot1AILab[2].teamB?.name).toBe("Error4O4");

    expect(slot1MetaLab[0].teamA?.name).toBe("TEAM VORTEX");
    expect(slot1MetaLab[0].teamB?.name).toBe("VALORANT NOOBS");

    // Slot 2: 2 matches + 1 BYE + 1 UNUSED
    const slot2 = schedule.slots[1];
    expect(slot2.name).toBe("Time Slot 2");
    expect(slot2.matches).toHaveLength(4);
    expect(slot2.activeMatches).toBe(2);
    expect(slot2.byeCount).toBe(1);
    expect(slot2.unusedCount).toBe(1);

    const slot2AILab = slot2.matches.filter((m) => m.labName === "AI Lab");
    const slot2MetaLab = slot2.matches.filter((m) => m.labName === "Meta lab");
    expect(slot2AILab).toHaveLength(3);
    expect(slot2MetaLab).toHaveLength(1);

    expect(slot2AILab[0].teamA?.name).toBe("Skull Krushers");
    expect(slot2AILab[0].teamB?.name).toBe("x");

    expect(slot2AILab[1].teamA?.name).toBe("Goodie Gang");
    expect(slot2AILab[1].teamB?.name).toBe("TEAM EREN");

    // Explicit BYE recorded for Kawai in AI Lab Match 3
    expect(slot2AILab[2].isBye).toBe(true);
    expect(slot2AILab[2].status).toBe("BYE");
    expect(slot2AILab[2].teamA?.name).toBe("Kawai");

    // Meta lab Match 1 in Slot 2 is UNUSED / available
    expect(slot2MetaLab[0].isUnused).toBe(true);
    expect(slot2MetaLab[0].status).toBe("UNUSED");
  });

  it("should enforce physical invariant: zero double-booking in any time slot", () => {
    const config = getDefaultStage1Config();
    const schedule = generateStage1Schedule("vto-tourney-1", official13Teams, config);

    for (const slot of schedule.slots) {
      const scheduledTeamIds: string[] = [];
      for (const match of slot.matches) {
        if (match.teamA && !match.isUnused) scheduledTeamIds.push(match.teamA.id);
        if (match.teamB && !match.isUnused) scheduledTeamIds.push(match.teamB.id);
      }
      const uniqueIds = new Set(scheduledTeamIds);
      expect(uniqueIds.size).toBe(scheduledTeamIds.length);
    }
  });

  it("should allow organizer to explicitly customize the BYE team", () => {
    const config = getDefaultStage1Config();
    // Organizer assigns BYE to "XARAN" (Seed 1) instead of Kawai
    const schedule = generateStage1Schedule("vto-tourney-1", official13Teams, config, {
      customByeTeamId: "t-1", // XARAN
    });

    expect(schedule.byeTeam?.name).toBe("XARAN");

    // Kawai now plays in a match
    const kawaiMatch = schedule.allMatches.find(
      (m) => m.teamA?.id === "t-13" || m.teamB?.id === "t-13"
    );
    expect(kawaiMatch).toBeDefined();
    expect(kawaiMatch?.isBye).toBe(false);
  });

  it("should allow organizer to swap teams between matches", () => {
    const config = getDefaultStage1Config();
    let schedule = generateStage1Schedule("vto-tourney-1", official13Teams, config);

    const match1 = schedule.slots[0].matches[0];
    const match2 = schedule.slots[0].matches[1];

    expect(match1.teamA?.name).toBe("XARAN");
    expect(match2.teamA?.name).toBe("Eclipse");

    // Swap Team A of match1 with Team A of match2
    schedule = swapStage1Teams(schedule, match1.matchId, "TEAM_A", match2.matchId, "TEAM_A");

    const updatedMatch1 = schedule.slots[0].matches[0];
    const updatedMatch2 = schedule.slots[0].matches[1];

    expect(updatedMatch1.teamA?.name).toBe("Eclipse");
    expect(updatedMatch2.teamA?.name).toBe("XARAN");
  });

  it("should dynamically recalculate capacity when labs change", () => {
    // Organizer adds a third lab: "Practice Lab" with 20 systems (2 matches)
    const customLabs = recalculateLabCapacity([
      { id: "lab-ai", name: "AI Lab", systems: 30 },
      { id: "lab-meta", name: "Meta lab", systems: 10 },
      { id: "lab-practice", name: "Practice Lab", systems: 20 },
    ]);

    expect(customLabs[0].matchCapacity).toBe(3);
    expect(customLabs[1].matchCapacity).toBe(1);
    expect(customLabs[2].matchCapacity).toBe(2);

    const totalSlotCapacity = customLabs.reduce((sum, l) => sum + l.matchCapacity, 0);
    expect(totalSlotCapacity).toBe(6); // 6 simultaneous matches per slot!
  });
});
