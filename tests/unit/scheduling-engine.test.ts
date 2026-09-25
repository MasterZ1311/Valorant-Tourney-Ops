import { describe, it, expect } from "vitest";
import {
  evaluateLabCapacity,
  calculateVenueCapacity,
} from "../../src/lib/scheduling/capacity";
import { generateFixtures } from "../../src/lib/scheduling/scheduler";
import { generateSingleEliminationBracket } from "../../src/lib/tournament/bracket";
import { DomainLab, DomainPC, DomainStation } from "../../src/lib/scheduling/types";
import { Participant } from "../../src/lib/tournament/types";

function createMockLab(
  id: string,
  name: string,
  totalPcs: number,
  stationCount: number,
  offlinePcsCount: number = 0
): DomainLab {
  const pcs: DomainPC[] = [];
  const stations: DomainStation[] = [];

  for (let s = 1; s <= stationCount; s++) {
    const stationId = `${id}-station-${s}`;
    stations.push({
      id: stationId,
      name: `Station ${s}`,
      labId: id,
      labName: name,
      requiredPCs: 10,
      pcs: [],
      isOperational: false,
      workingPcCount: 0,
    });
  }

  // Create PCs and distribute across stations
  for (let i = 1; i <= totalPcs; i++) {
    const stationIndex = Math.floor((i - 1) / 10);
    const stationId =
      stationIndex < stations.length ? stations[stationIndex].id : null;
    const isOffline = i <= offlinePcsCount;

    const pc: DomainPC = {
      id: `${id}-pc-${i}`,
      pcNumber: `PC-${i}`,
      labId: id,
      stationId,
      status: isOffline ? "OFFLINE" : "AVAILABLE",
    };
    pcs.push(pc);

    if (stationIndex < stations.length) {
      stations[stationIndex].pcs.push(pc);
    }
  }

  return evaluateLabCapacity({
    id,
    name,
    totalPcs,
    pcs,
    stations,
  });
}

function createMockTeams(count: number): Participant[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `team-${i + 1}`,
    name: `Team ${i + 1}`,
    seed: i + 1,
  }));
}

describe("Scheduling Engine — Dynamic Lab & PC Capacity", () => {
  it("calculates 4 simultaneous matches for 40 functional PCs (Lab 1: 30 PCs/3 stations, Lab 2: 10 PCs/1 station)", () => {
    const lab1 = createMockLab("lab-1", "Lab 1", 30, 3, 0);
    const lab2 = createMockLab("lab-2", "Lab 2", 10, 1, 0);

    expect(lab1.operationalStationsCount).toBe(3);
    expect(lab2.operationalStationsCount).toBe(1);

    const venue = calculateVenueCapacity([lab1, lab2]);
    expect(venue.totalConfiguredPCs).toBe(40);
    expect(venue.totalWorkingPCs).toBe(40);
    expect(venue.totalOfflinePCs).toBe(0);
    expect(venue.operationalStations).toBe(4);
    expect(venue.maxSimultaneousMatches).toBe(4);
  });

  it("reduces Lab 1 capacity when 5 PCs are marked OFFLINE in Station 1", () => {
    // 5 offline PCs in station 1 => station 1 has only 5 working PCs, so station 1 is NOT operational
    const lab1 = createMockLab("lab-1", "Lab 1", 30, 3, 5);
    const lab2 = createMockLab("lab-2", "Lab 2", 10, 1, 0);

    expect(lab1.operationalStationsCount).toBe(2); // Only stations 2 and 3 have 10 PCs
    expect(lab2.operationalStationsCount).toBe(1);

    const venue = calculateVenueCapacity([lab1, lab2]);
    expect(venue.totalWorkingPCs).toBe(35);
    expect(venue.totalOfflinePCs).toBe(5);
    expect(venue.operationalStations).toBe(3);
    expect(venue.maxSimultaneousMatches).toBe(3);
  });
});

describe("Scheduling Engine — Conflict-Free Fixture Generation", () => {
  it("generates fixtures for 13 teams across 4 stations without team or station collisions", () => {
    const teams = createMockTeams(13);
    const bracket = generateSingleEliminationBracket(teams);

    const lab1 = createMockLab("lab-1", "Lab 1", 30, 3, 0);
    const lab2 = createMockLab("lab-2", "Lab 2", 10, 1, 0);
    const stations = [...lab1.stations, ...lab2.stations];

    const result = generateFixtures(bracket, stations, {
      tournamentStartTime: "2026-10-15T10:00:00.000Z",
      matchDurationMinutes: 45,
      bufferDurationMinutes: 15,
    });

    expect(result.conflicts).toHaveLength(0);
    expect(result.simultaneousStationCapacity).toBe(4);

    const playableFixtures = result.fixtures.filter((f) => !f.isBye);
    expect(playableFixtures.length).toBeGreaterThan(0);

    // 1. Verify no station overlap: for any station, consecutive matches do not overlap
    const stationMatchesMap = new Map<string, typeof playableFixtures>();
    for (const f of playableFixtures) {
      if (!f.stationId) continue;
      const list = stationMatchesMap.get(f.stationId) || [];
      list.push(f);
      stationMatchesMap.set(f.stationId, list);
    }

    stationMatchesMap.forEach((matches, stationId) => {
      matches.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      for (let i = 0; i < matches.length - 1; i++) {
        const currentEnd = new Date(matches[i].estimatedEndTime).getTime();
        const nextStart = new Date(matches[i + 1].startTime).getTime();
        expect(nextStart).toBeGreaterThanOrEqual(currentEnd);
      }
    });

    // 2. Verify no team overlap: a team is never scheduled in two matches at the same time
    const teamMatchesMap = new Map<string, typeof playableFixtures>();
    for (const f of playableFixtures) {
      if (f.teamAId) {
        const list = teamMatchesMap.get(f.teamAId) || [];
        list.push(f);
        teamMatchesMap.set(f.teamAId, list);
      }
      if (f.teamBId) {
        const list = teamMatchesMap.get(f.teamBId) || [];
        list.push(f);
        teamMatchesMap.set(f.teamBId, list);
      }
    }

    teamMatchesMap.forEach((matches) => {
      matches.sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );
      for (let i = 0; i < matches.length - 1; i++) {
        const currentEnd = new Date(matches[i].estimatedEndTime).getTime();
        const nextStart = new Date(matches[i + 1].startTime).getTime();
        expect(nextStart).toBeGreaterThanOrEqual(currentEnd);
      }
    });
  });
});
