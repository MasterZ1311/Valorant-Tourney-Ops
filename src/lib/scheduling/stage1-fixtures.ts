import { Participant } from "../tournament/types";

export type Stage1MatchStatus =
  | "Scheduled"
  | "Teams Called"
  | "Waiting"
  | "Ready"
  | "Live"
  | "Completed"
  | "Delayed"
  | "Paused"
  | "Forfeit"
  | "Cancelled"
  | "BYE"
  | "UNUSED";

export interface AttendanceStatus {
  teamAReported: boolean;
  teamBReported: boolean;
  teamAReady: boolean;
  teamBReady: boolean;
  calledAt?: string;
  readyAt?: string;
  notes?: string;
}

export interface MatchResultData {
  teamAScore: number;
  teamBScore: number;
  winnerId?: string;
  loserId?: string;
  isOvertime?: boolean;
  verified: boolean;
}

export interface LabStationSlot {
  labId: string;
  labName: string; // e.g. "AI Lab", "Meta lab"
  stationId: string;
  stationName: string; // e.g. "Match 1", "Match 2", "Match 3"
  matchNumberInLab: number; // 1, 2, 3
  pcCount: number; // 10
}

export interface Stage1MatchSlot {
  matchId: string; // e.g. "M-001"
  timeSlotNumber: number; // 1 or 2
  timeSlotName: string; // "Time Slot 1"
  labId: string;
  labName: string; // "AI Lab" or "Meta lab"
  stationId: string;
  stationName: string; // "Match 1", "Match 2", "Match 3"
  teamA?: Participant;
  teamB?: Participant;
  isBye: boolean;
  isUnused: boolean;
  status: Stage1MatchStatus;
  attendanceStatus: AttendanceStatus;
  result?: MatchResultData;
  notes?: string;
  startTime: string; // ISO
  endTime: string; // ISO
  gracePeriodEndTime?: string; // ISO
}

export interface Stage1TimeSlot {
  slotNumber: number;
  name: string; // "Time Slot 1"
  startTime: string;
  endTime: string;
  matches: Stage1MatchSlot[];
  totalMatches: number;
  activeMatches: number;
  byeCount: number;
  unusedCount: number;
}

export interface Stage1LabConfig {
  id: string;
  name: string;
  systems: number;
  matchCapacity: number; // floor(systems / systemsPerMatch)
  stations: { id: string; name: string }[];
}

export interface Stage1TournamentConfig {
  labs: Stage1LabConfig[];
  playersPerTeam: number;
  systemsPerMatch: number;
  matchDurationMinutes: number;
  breakDurationMinutes: number;
  gracePeriodMinutes: number;
  startTime: string; // ISO string or "10:00"
}

export interface Stage1ScheduleResult {
  tournamentId: string;
  config: Stage1TournamentConfig;
  slots: Stage1TimeSlot[];
  totalTeams: number;
  teamsWithMatches: number;
  byeTeam?: Participant;
  allMatches: Stage1MatchSlot[];
  conflicts: string[];
}

/**
 * Default LAN hardware configuration:
 * - AI Lab: 30 systems -> 3 match stations (10 systems each)
 * - Meta lab: 10 systems -> 1 match station (10 systems)
 * Total capacity: 4 simultaneous matches per slot.
 */
export function getDefaultStage1Config(startTime?: string): Stage1TournamentConfig {
  const start = startTime || new Date().toISOString();

  return {
    labs: [
      {
        id: "lab-ai",
        name: "AI Lab",
        systems: 30,
        matchCapacity: 3,
        stations: [
          { id: "ai-m1", name: "Match 1" },
          { id: "ai-m2", name: "Match 2" },
          { id: "ai-m3", name: "Match 3" },
        ],
      },
      {
        id: "lab-meta",
        name: "Meta lab",
        systems: 10,
        matchCapacity: 1,
        stations: [{ id: "meta-m1", name: "Match 1" }],
      },
    ],
    playersPerTeam: 5,
    systemsPerMatch: 10,
    matchDurationMinutes: 45,
    breakDurationMinutes: 15,
    gracePeriodMinutes: 10,
    startTime: start,
  };
}

/**
 * Dynamically recalculates match capacity per lab based on available systems.
 */
export function recalculateLabCapacity(
  labs: { id: string; name: string; systems: number }[],
  systemsPerMatch: number = 10
): Stage1LabConfig[] {
  return labs.map((l) => {
    const matchCapacity = Math.floor(l.systems / systemsPerMatch);
    const stations = Array.from({ length: matchCapacity }, (_, i) => ({
      id: `${l.id}-m${i + 1}`,
      name: `Match ${i + 1}`,
    }));
    return {
      id: l.id,
      name: l.name,
      systems: l.systems,
      matchCapacity,
      stations,
    };
  });
}

/**
 * Generates the Stage 1 tournament schedule for N teams across physical lab slots.
 * 
 * Invariants:
 * 1. 13 teams = 6 complete matches + 1 BYE.
 * 2. 12 teams play against another team; 1 team receives an explicit BYE slot.
 * 3. Max capacity per slot: AI Lab (3) + Meta lab (1) = 4 matches.
 * 4. Slot 1 = 4 matches (AI Lab M1, M2, M3 + Meta lab M1).
 * 5. Slot 2 = 2 matches (AI Lab M1, M2) + 1 BYE (AI Lab M3) + 1 UNUSED (Meta lab M1).
 * 6. No double booking: Zero team overlap in the same time slot.
 * 7. No lab capacity overflow.
 */
export function generateStage1Schedule(
  tournamentId: string,
  teams: Participant[],
  config: Stage1TournamentConfig,
  options?: {
    customByeTeamId?: string;
    customPairings?: { teamAId: string; teamBId: string }[];
  }
): Stage1ScheduleResult {
  const conflicts: string[] = [];
  const n = teams.length;

  if (n === 0) {
    throw new Error("Cannot generate schedule with 0 teams.");
  }

  // 1. Calculate physical match stations available per time slot
  const slotStations: LabStationSlot[] = [];
  for (const lab of config.labs) {
    for (let i = 0; i < lab.matchCapacity; i++) {
      const station = lab.stations[i] || {
        id: `${lab.id}-m${i + 1}`,
        name: `Match ${i + 1}`,
      };
      slotStations.push({
        labId: lab.id,
        labName: lab.name,
        stationId: station.id,
        stationName: station.name,
        matchNumberInLab: i + 1,
        pcCount: config.systemsPerMatch,
      });
    }
  }

  const slotCapacity = slotStations.length;
  if (slotCapacity === 0) {
    throw new Error("Zero match capacity available across configured labs.");
  }

  // 2. Select BYE team if odd number of teams
  let byeTeam: Participant | undefined;
  let playingTeams = [...teams];

  if (n % 2 !== 0) {
    if (options?.customByeTeamId) {
      const found = teams.find((t) => t.id === options.customByeTeamId);
      if (found) {
        byeTeam = found;
        playingTeams = teams.filter((t) => t.id !== found.id);
      }
    }
    if (!byeTeam) {
      // Default: the team with highest seed number or last team in roster
      byeTeam = playingTeams.pop()!;
    }
  }

  // 3. Create Pairings (12 teams -> 6 matches)
  interface TeamPair {
    teamA: Participant;
    teamB: Participant;
  }
  const pairs: TeamPair[] = [];

  if (options?.customPairings && options.customPairings.length > 0) {
    const assignedIds = new Set<string>();
    for (const cp of options.customPairings) {
      const teamA = playingTeams.find((t) => t.id === cp.teamAId);
      const teamB = playingTeams.find((t) => t.id === cp.teamBId);
      if (teamA && teamB) {
        pairs.push({ teamA, teamB });
        assignedIds.add(teamA.id);
        assignedIds.add(teamB.id);
      }
    }
    // Remaining unassigned playing teams paired sequentially
    const remaining = playingTeams.filter((t) => !assignedIds.has(t.id));
    for (let i = 0; i < remaining.length; i += 2) {
      if (remaining[i + 1]) {
        pairs.push({ teamA: remaining[i], teamB: remaining[i + 1] });
      }
    }
  } else {
    // Standard pairing: T1 vs T2, T3 vs T4, T5 vs T6, ...
    for (let i = 0; i < playingTeams.length; i += 2) {
      if (playingTeams[i + 1]) {
        pairs.push({ teamA: playingTeams[i], teamB: playingTeams[i + 1] });
      }
    }
  }

  // 4. Calculate Timing Parameters
  const slotDurationMinutes =
    config.matchDurationMinutes + config.breakDurationMinutes;
  const baseStart = new Date(config.startTime).getTime();
  const validBaseStart = isNaN(baseStart) ? Date.now() : baseStart;

  // 5. Allocate Matches into Time Slots
  // Total matches including BYE = pairs.length + (byeTeam ? 1 : 0)
  // Needed time slots = ceil(totalItems / slotCapacity)
  const totalItems = pairs.length + (byeTeam ? 1 : 0);
  const totalSlotsNeeded = Math.max(1, Math.ceil(totalItems / slotCapacity));

  let pairIndex = 0;
  let byeAssigned = false;
  let globalMatchCounter = 1;

  const slots: Stage1TimeSlot[] = [];
  const allMatches: Stage1MatchSlot[] = [];

  for (let s = 1; s <= totalSlotsNeeded; s++) {
    const slotStartTimeMs = validBaseStart + (s - 1) * slotDurationMinutes * 60 * 1000;
    const slotEndTimeMs = slotStartTimeMs + config.matchDurationMinutes * 60 * 1000;
    const gracePeriodEndMs = slotStartTimeMs + config.gracePeriodMinutes * 60 * 1000;

    const slotStartTime = new Date(slotStartTimeMs).toISOString();
    const slotEndTime = new Date(slotEndTimeMs).toISOString();
    const gracePeriodEndTime = new Date(gracePeriodEndMs).toISOString();

    const slotMatches: Stage1MatchSlot[] = [];
    const teamsInSlot = new Set<string>();

    for (const stationSlot of slotStations) {
      const matchCode = `M-${String(globalMatchCounter).padStart(3, "0")}`;

      if (pairIndex < pairs.length) {
        // Normal playable match
        const pair = pairs[pairIndex++];
        globalMatchCounter++;

        // Invariant check: No double-booking in same slot
        if (teamsInSlot.has(pair.teamA.id) || teamsInSlot.has(pair.teamB.id)) {
          conflicts.push(
            `Double-booking violation: Team ${pair.teamA.name} or ${pair.teamB.name} already scheduled in Time Slot ${s}.`
          );
        }
        teamsInSlot.add(pair.teamA.id);
        teamsInSlot.add(pair.teamB.id);

        const match: Stage1MatchSlot = {
          matchId: `m-s${s}-${stationSlot.labId}-${stationSlot.stationId}`,
          timeSlotNumber: s,
          timeSlotName: `Time Slot ${s}`,
          labId: stationSlot.labId,
          labName: stationSlot.labName,
          stationId: stationSlot.stationId,
          stationName: stationSlot.stationName,
          teamA: pair.teamA,
          teamB: pair.teamB,
          isBye: false,
          isUnused: false,
          status: "Scheduled",
          attendanceStatus: {
            teamAReported: false,
            teamBReported: false,
            teamAReady: false,
            teamBReady: false,
          },
          startTime: slotStartTime,
          endTime: slotEndTime,
          gracePeriodEndTime,
        };

        slotMatches.push(match);
        allMatches.push(match);
      } else if (byeTeam && !byeAssigned) {
        // Explicit BYE Match Slot
        byeAssigned = true;
        const byeMatch: Stage1MatchSlot = {
          matchId: `m-s${s}-${stationSlot.labId}-${stationSlot.stationId}-bye`,
          timeSlotNumber: s,
          timeSlotName: `Time Slot ${s}`,
          labId: stationSlot.labId,
          labName: stationSlot.labName,
          stationId: stationSlot.stationId,
          stationName: stationSlot.stationName,
          teamA: byeTeam,
          isBye: true,
          isUnused: false,
          status: "BYE",
          attendanceStatus: {
            teamAReported: true,
            teamBReported: false,
            teamAReady: true,
            teamBReady: false,
          },
          result: {
            teamAScore: 13,
            teamBScore: 0,
            winnerId: byeTeam.id,
            verified: true,
          },
          notes: `${byeTeam.name} receives an official First Stage BYE.`,
          startTime: slotStartTime,
          endTime: slotEndTime,
        };

        slotMatches.push(byeMatch);
        allMatches.push(byeMatch);
      } else {
        // UNUSED Match Slot (Capacity free for practice or warmups)
        const unusedMatch: Stage1MatchSlot = {
          matchId: `m-s${s}-${stationSlot.labId}-${stationSlot.stationId}-unused`,
          timeSlotNumber: s,
          timeSlotName: `Time Slot ${s}`,
          labId: stationSlot.labId,
          labName: stationSlot.labName,
          stationId: stationSlot.stationId,
          stationName: stationSlot.stationName,
          isBye: false,
          isUnused: true,
          status: "UNUSED",
          attendanceStatus: {
            teamAReported: false,
            teamBReported: false,
            teamAReady: false,
            teamBReady: false,
          },
          notes: "Unoccupied match station — available for team warm-ups.",
          startTime: slotStartTime,
          endTime: slotEndTime,
        };

        slotMatches.push(unusedMatch);
        allMatches.push(unusedMatch);
      }
    }

    slots.push({
      slotNumber: s,
      name: `Time Slot ${s}`,
      startTime: slotStartTime,
      endTime: slotEndTime,
      matches: slotMatches,
      totalMatches: slotMatches.length,
      activeMatches: slotMatches.filter((m) => !m.isBye && !m.isUnused).length,
      byeCount: slotMatches.filter((m) => m.isBye).length,
      unusedCount: slotMatches.filter((m) => m.isUnused).length,
    });
  }

  return {
    tournamentId,
    config,
    slots,
    totalTeams: n,
    teamsWithMatches: pairs.length * 2,
    byeTeam,
    allMatches,
    conflicts,
  };
}

/**
 * Allows an organizer to manually reorder / swap two teams between matches or slots.
 */
export function swapStage1Teams(
  schedule: Stage1ScheduleResult,
  matchIdA: string,
  slotA: "TEAM_A" | "TEAM_B",
  matchIdB: string,
  slotB: "TEAM_A" | "TEAM_B"
): Stage1ScheduleResult {
  const updated: Stage1ScheduleResult = JSON.parse(JSON.stringify(schedule));

  const matchA = updated.allMatches.find((m) => m.matchId === matchIdA);
  const matchB = updated.allMatches.find((m) => m.matchId === matchIdB);

  if (!matchA || !matchB) {
    throw new Error("One or both matches not found in schedule.");
  }

  const teamA = slotA === "TEAM_A" ? matchA.teamA : matchA.teamB;
  const teamB = slotB === "TEAM_A" ? matchB.teamA : matchB.teamB;

  // Swap
  if (slotA === "TEAM_A") matchA.teamA = teamB;
  else matchA.teamB = teamB;

  if (slotB === "TEAM_A") matchB.teamA = teamA;
  else matchB.teamB = teamA;

  // Update in slots array
  for (const s of updated.slots) {
    const idxA = s.matches.findIndex((m) => m.matchId === matchIdA);
    if (idxA !== -1) s.matches[idxA] = matchA;

    const idxB = s.matches.findIndex((m) => m.matchId === matchIdB);
    if (idxB !== -1) s.matches[idxB] = matchB;
  }

  return updated;
}
