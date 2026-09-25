import { BracketStructure } from "./types";
import { ScheduledFixture, VenueCapacityMetrics } from "../scheduling/types";

export interface ValidationItem {
  name: string;
  category: "TEAMS" | "PLAYERS" | "VENUE" | "BRACKET" | "SCHEDULE" | "VOLUNTEERS";
  passed: boolean;
  message: string;
  details?: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
}

export interface ValidationReport {
  overallPassed: boolean;
  canFinalize: boolean;
  summary: {
    criticalErrors: number;
    warnings: number;
    passedChecks: number;
  };
  checks: ValidationItem[];
}

export interface FinalizationData {
  tournament: {
    id: string;
    name: string;
    status: string;
  };
  teams: {
    id: string;
    name: string;
    players: { id: string; name: string; riotId: string; verified?: boolean }[];
    checkedIn?: boolean;
  }[];
  venueMetrics: VenueCapacityMetrics;
  bracket?: BracketStructure | null;
  fixtures?: ScheduledFixture[] | null;
  volunteersCount: number;
  requireFullAttendance?: boolean;
}

/**
 * Validates tournament readiness across 10 critical checkpoints prior to finalization locking.
 */
export function runPreFinalizationValidation(
  data: FinalizationData
): ValidationReport {
  const checks: ValidationItem[] = [];

  // 1. Team Count Check
  const teamCount = data.teams.length;
  if (teamCount < 2) {
    checks.push({
      name: "Minimum Team Count",
      category: "TEAMS",
      passed: false,
      message: `Tournament has ${teamCount} team(s). At least 2 teams are required.`,
      severity: "CRITICAL",
    });
  } else {
    checks.push({
      name: "Minimum Team Count",
      category: "TEAMS",
      passed: true,
      message: `Configured with ${teamCount} registered teams.`,
      severity: "INFO",
    });
  }

  // 2. Player Roster Completeness
  let totalPlayers = 0;
  let incompleteTeams = 0;
  for (const team of data.teams) {
    totalPlayers += team.players.length;
    if (team.players.length < 5) {
      incompleteTeams++;
    }
  }

  if (incompleteTeams > 0) {
    checks.push({
      name: "Player Roster Completeness",
      category: "PLAYERS",
      passed: false,
      message: `${incompleteTeams} team(s) have fewer than the required 5 starting players.`,
      details: "VALORANT requires 5 players per team to participate in official matches.",
      severity: "CRITICAL",
    });
  } else {
    checks.push({
      name: "Player Roster Completeness",
      category: "PLAYERS",
      passed: true,
      message: `All ${teamCount} teams have complete starting rosters (${totalPlayers} total players).`,
      severity: "INFO",
    });
  }

  // 3. Attendance Check
  if (data.requireFullAttendance) {
    const uncheckTeams = data.teams.filter((t) => !t.checkedIn);
    if (uncheckTeams.length > 0) {
      checks.push({
        name: "Team Attendance Check-In",
        category: "TEAMS",
        passed: false,
        message: `${uncheckTeams.length} team(s) have not checked in yet.`,
        severity: "WARNING",
      });
    } else {
      checks.push({
        name: "Team Attendance Check-In",
        category: "TEAMS",
        passed: true,
        message: `All ${teamCount} teams have checked in at the registration desk.`,
        severity: "INFO",
      });
    }
  }

  // 4. Lab & Station Capacity
  if (data.venueMetrics.totalLabs === 0) {
    checks.push({
      name: "Lab Configuration",
      category: "VENUE",
      passed: false,
      message: "No labs have been configured for this tournament.",
      severity: "CRITICAL",
    });
  } else {
    checks.push({
      name: "Lab Configuration",
      category: "VENUE",
      passed: true,
      message: `${data.venueMetrics.totalLabs} lab(s) configured.`,
      severity: "INFO",
    });
  }

  // 5. Operational Stations & PC Health
  if (data.venueMetrics.operationalStations === 0) {
    checks.push({
      name: "Station Operational Readiness",
      category: "VENUE",
      passed: false,
      message: "0 operational stations found with at least 10 working PCs.",
      details: "Check PC status (OFFLINE / MAINTENANCE) in lab settings.",
      severity: "CRITICAL",
    });
  } else {
    checks.push({
      name: "Station Operational Readiness",
      category: "VENUE",
      passed: true,
      message: `${data.venueMetrics.operationalStations} operational stations active (${data.venueMetrics.maxSimultaneousMatches} simultaneous matches supported).`,
      severity: "INFO",
    });
  }

  // 6. Offline PC Ratio Warning
  if (data.venueMetrics.totalOfflinePCs > 0) {
    checks.push({
      name: "PC Health Alert",
      category: "VENUE",
      passed: true,
      message: `${data.venueMetrics.totalOfflinePCs} PC(s) marked offline or in maintenance.`,
      details: "System has recalculated match capacity to exclude broken PCs.",
      severity: "WARNING",
    });
  }

  // 7. Bracket Generation
  if (!data.bracket || data.bracket.rounds.length === 0) {
    checks.push({
      name: "Tournament Bracket Structure",
      category: "BRACKET",
      passed: false,
      message: "Tournament bracket has not been generated.",
      severity: "CRITICAL",
    });
  } else {
    checks.push({
      name: "Tournament Bracket Structure",
      category: "BRACKET",
      passed: true,
      message: `Bracket valid: ${data.bracket.bracketSize} slots, ${data.bracket.totalRounds} rounds, ${data.bracket.totalBYEs} BYE(s).`,
      severity: "INFO",
    });
  }

  // 8. Fixture Generation
  if (!data.fixtures || data.fixtures.length === 0) {
    checks.push({
      name: "Fixture Generation",
      category: "SCHEDULE",
      passed: false,
      message: "Match fixtures have not been generated.",
      severity: "CRITICAL",
    });
  } else {
    const unassigned = data.fixtures.filter((f) => !f.isBye && !f.stationId);
    if (unassigned.length > 0) {
      checks.push({
        name: "Fixture Station Allocation",
        category: "SCHEDULE",
        passed: false,
        message: `${unassigned.length} playable match(es) have no assigned station.`,
        severity: "CRITICAL",
      });
    } else {
      checks.push({
        name: "Fixture Generation & Allocation",
        category: "SCHEDULE",
        passed: true,
        message: `All ${data.fixtures.length} matches mapped to stations and time slots.`,
        severity: "INFO",
      });
    }
  }

  // 9. Volunteer Staffing
  if (data.volunteersCount === 0) {
    checks.push({
      name: "Volunteer Staffing",
      category: "VOLUNTEERS",
      passed: true,
      message: "No volunteer marshals currently assigned to stations.",
      severity: "WARNING",
    });
  } else {
    checks.push({
      name: "Volunteer Staffing",
      category: "VOLUNTEERS",
      passed: true,
      message: `${data.volunteersCount} volunteer(s) on active roster.`,
      severity: "INFO",
    });
  }

  const criticalErrors = checks.filter((c) => !c.passed && c.severity === "CRITICAL").length;
  const warnings = checks.filter((c) => c.severity === "WARNING").length;
  const passedChecks = checks.filter((c) => c.passed).length;

  return {
    overallPassed: criticalErrors === 0,
    canFinalize: criticalErrors === 0,
    summary: {
      criticalErrors,
      warnings,
      passedChecks,
    },
    checks,
  };
}
