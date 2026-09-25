import { BracketMatch, BracketStructure } from "../tournament/types";
import {
  DomainStation,
  ScheduledFixture,
  SchedulingOptions,
  SchedulingResult,
} from "./types";

interface StationAvailability {
  station: DomainStation;
  availableAt: number; // epoch ms
}

interface TeamAvailability {
  teamId: string;
  availableAt: number; // epoch ms
}

/**
 * Deterministic fixture scheduling engine enforcing hardware capacity,
 * station exclusivity, team non-overlap, and round predecessor dependencies.
 */
export function generateFixtures(
  bracket: BracketStructure,
  stations: DomainStation[],
  options: SchedulingOptions
): SchedulingResult {
  const operationalStations = stations.filter((s) => s.isOperational);
  const conflicts: string[] = [];

  if (operationalStations.length === 0) {
    throw new Error(
      "Unable to generate fixtures because there are 0 operational stations with at least 10 working PCs."
    );
  }

  const matchDurationMs = (options.matchDurationMinutes ?? 45) * 60 * 1000;
  const bufferDurationMs = (options.bufferDurationMinutes ?? 15) * 60 * 1000;
  const slotDurationMs = matchDurationMs + bufferDurationMs;

  const baseStartTime = new Date(options.tournamentStartTime).getTime();
  if (isNaN(baseStartTime)) {
    throw new Error("Invalid tournament start time provided to scheduler.");
  }

  // Station availability tracking: stationId -> available timestamp (epoch ms)
  const stationAvailability = new Map<string, number>();
  operationalStations.forEach((st) => {
    stationAvailability.set(st.id, baseStartTime);
  });

  // Team availability tracking: teamId -> available timestamp (epoch ms)
  const teamAvailability = new Map<string, number>();

  // Match completion tracking: matchId -> completion timestamp (epoch ms)
  const matchCompletionTime = new Map<string, number>();

  const fixtures: ScheduledFixture[] = [];
  let maxEndTime = baseStartTime;

  // Process matches round by round to guarantee predecessor resolution
  for (const round of bracket.rounds) {
    for (const match of round.matches) {
      if (match.isBye) {
        // BYE matches do not consume stations or time
        matchCompletionTime.set(match.id, baseStartTime);
        fixtures.push({
          matchId: match.id,
          roundNumber: round.roundNumber,
          roundName: round.name,
          matchCode: match.code,
          teamAId: match.teamA?.id,
          teamAName: match.teamA?.name ?? "BYE",
          teamBId: match.teamB?.id,
          teamBName: match.teamB?.name ?? "BYE",
          isBye: true,
          startTime: new Date(baseStartTime).toISOString(),
          estimatedEndTime: new Date(baseStartTime).toISOString(),
          status: "VERIFIED",
        });
        continue;
      }

      // 1. Earliest time based on predecessor matches (feeder matches)
      let earliestStartTime = baseStartTime;
      if (match.sourceMatchAId) {
        const sourceACompletion = matchCompletionTime.get(match.sourceMatchAId);
        if (sourceACompletion !== undefined) {
          earliestStartTime = Math.max(
            earliestStartTime,
            sourceACompletion + bufferDurationMs
          );
        }
      }
      if (match.sourceMatchBId) {
        const sourceBCompletion = matchCompletionTime.get(match.sourceMatchBId);
        if (sourceBCompletion !== undefined) {
          earliestStartTime = Math.max(
            earliestStartTime,
            sourceBCompletion + bufferDurationMs
          );
        }
      }

      // 2. Earliest time based on team availability (if teams are known)
      if (match.teamA?.id) {
        const teamAAvailable = teamAvailability.get(match.teamA.id) ?? baseStartTime;
        earliestStartTime = Math.max(earliestStartTime, teamAAvailable);
      }
      if (match.teamB?.id) {
        const teamBAvailable = teamAvailability.get(match.teamB.id) ?? baseStartTime;
        earliestStartTime = Math.max(earliestStartTime, teamBAvailable);
      }

      // 3. Find the best available station
      // Find station whose availability is earliest or fits closest to earliestStartTime
      let bestStation: DomainStation | null = null;
      let chosenStartTime = Infinity;

      for (const st of operationalStations) {
        const stAvail = stationAvailability.get(st.id) ?? baseStartTime;
        const candidateStartTime = Math.max(earliestStartTime, stAvail);
        if (candidateStartTime < chosenStartTime) {
          chosenStartTime = candidateStartTime;
          bestStation = st;
        }
      }

      if (!bestStation || chosenStartTime === Infinity) {
        conflicts.push(`Could not allocate station for match ${match.code}`);
        continue;
      }

      const matchEndTime = chosenStartTime + matchDurationMs;
      const stationFreeTime = chosenStartTime + slotDurationMs;

      // Update trackers
      stationAvailability.set(bestStation.id, stationFreeTime);
      matchCompletionTime.set(match.id, matchEndTime);

      if (match.teamA?.id) {
        teamAvailability.set(match.teamA.id, stationFreeTime);
      }
      if (match.teamB?.id) {
        teamAvailability.set(match.teamB.id, stationFreeTime);
      }

      if (matchEndTime > maxEndTime) {
        maxEndTime = matchEndTime;
      }

      fixtures.push({
        matchId: match.id,
        roundNumber: round.roundNumber,
        roundName: round.name,
        matchCode: match.code,
        teamAId: match.teamA?.id,
        teamAName: match.teamA?.name ?? `Winner ${match.sourceMatchAId || "TBD"}`,
        teamBId: match.teamB?.id,
        teamBName: match.teamB?.name ?? `Winner ${match.sourceMatchBId || "TBD"}`,
        isBye: false,
        stationId: bestStation.id,
        stationName: bestStation.name,
        labId: bestStation.labId,
        labName: bestStation.labName,
        startTime: new Date(chosenStartTime).toISOString(),
        estimatedEndTime: new Date(matchEndTime).toISOString(),
        status: "SCHEDULED",
      });
    }
  }

  return {
    fixtures,
    totalMatchesScheduled: fixtures.filter((f) => !f.isBye).length,
    simultaneousStationCapacity: operationalStations.length,
    estimatedTournamentEndTime: new Date(maxEndTime).toISOString(),
    conflicts,
  };
}
