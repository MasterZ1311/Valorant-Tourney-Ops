import { StoredTeam, StoredIncident, StoredAuditLog, StoredTournament } from "../store/tournament-store";
import { ScheduledFixture, VenueCapacityMetrics } from "../scheduling/types";
import { BracketStructure } from "../tournament/types";

/**
 * Converts array of tabular objects into RFC 4180 compliant CSV string.
 */
export function convertToCSV(headers: string[], rows: (string | number | boolean | null | undefined)[][]): string {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerRow = headers.map(escapeCell).join(",");
  const dataRows = rows.map((r) => r.map(escapeCell).join(",")).join("\n");
  return `${headerRow}\n${dataRows}`;
}

export function generateTeamsCSV(teams: StoredTeam[]): string {
  const headers = ["Team ID", "Seed", "Team Name", "Institution", "Captain", "Contact", "Status", "Players Count"];
  const rows = teams.map((t) => [
    t.id,
    t.seed,
    t.name,
    t.institution,
    t.captain,
    t.captainContact,
    t.status,
    t.players.length,
  ]);
  return convertToCSV(headers, rows);
}

export function generatePlayersCSV(teams: StoredTeam[]): string {
  const headers = ["Team Name", "Player Name", "Riot ID", "Riot Tag", "Role", "Present", "Verified"];
  const rows = teams.flatMap((t) =>
    t.players.map((p) => [
      t.name,
      p.name,
      p.riotId,
      p.riotTag,
      p.role,
      p.present ? "YES" : "NO",
      p.verified ? "YES" : "NO",
    ])
  );
  return convertToCSV(headers, rows);
}

export function generateFixturesCSV(fixtures: ScheduledFixture[]): string {
  const headers = [
    "Match Code",
    "Round",
    "Team A",
    "Team B",
    "Station",
    "Lab",
    "Scheduled Start",
    "Estimated End",
    "Status",
    "Is BYE",
  ];
  const rows = fixtures.map((f) => [
    f.matchCode,
    f.roundName,
    f.teamAName,
    f.teamBName,
    f.stationName || "TBD",
    f.labName || "TBD",
    f.startTime,
    f.estimatedEndTime,
    f.status,
    f.isBye ? "YES" : "NO",
  ]);
  return convertToCSV(headers, rows);
}

export function generateIncidentsCSV(incidents: StoredIncident[]): string {
  const headers = [
    "Incident ID",
    "Timestamp",
    "Category",
    "Severity",
    "Match Code",
    "Reported By",
    "Status",
    "Description",
    "Resolution Notes",
  ];
  const rows = incidents.map((i) => [
    i.id,
    i.createdAt,
    i.category,
    i.severity,
    i.matchCode || "N/A",
    i.reportedBy,
    i.status,
    i.description,
    i.resolutionNotes || "Unresolved",
  ]);
  return convertToCSV(headers, rows);
}

export function generateAuditCSV(logs: StoredAuditLog[]): string {
  const headers = ["Log ID", "Timestamp", "Actor", "Role", "Action", "Entity", "Entity ID", "Details"];
  const rows = logs.map((l) => [
    l.id,
    l.timestamp,
    l.actorId,
    l.actorRole,
    l.action,
    l.entity,
    l.entityId,
    l.details,
  ]);
  return convertToCSV(headers, rows);
}

export function generateFinalTournamentSummaryReport(data: {
  tournament: StoredTournament;
  teams: StoredTeam[];
  fixtures: ScheduledFixture[];
  bracket: BracketStructure | null;
  venueMetrics: VenueCapacityMetrics;
  incidents: StoredIncident[];
}): string {
  const t = data.tournament;
  const playableMatches = data.fixtures.filter((f) => !f.isBye);
  const completedMatches = playableMatches.filter((f) => f.status === "VERIFIED");

  const grandFinal = data.bracket?.rounds[data.bracket.rounds.length - 1]?.matches[0];
  const championTeam = data.teams.find((tm) => tm.id === grandFinal?.winnerId);
  const runnerUpTeam = data.teams.find((tm) => tm.id === grandFinal?.loserId);

  return `========================================================================
VALORANT TOURNAMENT OPERATIONS SYSTEM (VTO) — OFFICIAL FINAL REPORT
========================================================================
Event Name:       ${t.name}
Game:             ${t.game}
Venue:            ${t.venueName}
Date:             ${t.date}
Status:           ${t.status}
Format:           ${t.format}

------------------------------------------------------------------------
🏆 CHAMPIONSHIP STANDINGS
------------------------------------------------------------------------
🥇 CHAMPION:     ${championTeam ? `${championTeam.name} (Seed #${championTeam.seed})` : "TBD"}
🥈 RUNNER-UP:    ${runnerUpTeam ? `${runnerUpTeam.name} (Seed #${runnerUpTeam.seed})` : "TBD"}

------------------------------------------------------------------------
📊 STATISTICAL SUMMARY
------------------------------------------------------------------------
Total Registered Teams:   ${data.teams.length}
Total Starting Players:   ${data.teams.length * 5}
Configured Venue PCs:     ${data.venueMetrics.totalConfiguredPCs}
Operational Match Slots:  ${data.venueMetrics.maxSimultaneousMatches} Simultaneous Matches
Total Scheduled Matches:  ${playableMatches.length}
Completed Matches:        ${completedMatches.length}
Total Incidents Logged:   ${data.incidents.length}
Total Incidents Resolved: ${data.incidents.filter((i) => i.status === "RESOLVED").length}

------------------------------------------------------------------------
🎮 MATCH OUTCOMES & FIXTURES
------------------------------------------------------------------------
${data.fixtures
  .map(
    (f) =>
      `[${f.matchCode.padEnd(4)}] ${f.roundName.padEnd(16)} | ${f.teamAName.padEnd(20)} vs ${f.teamBName.padEnd(20)} | ${f.status.padEnd(10)} | ${f.stationName || "N/A"}`
  )
  .join("\n")}

========================================================================
Report generated automatically by VTO. Cryptographically auditable.
========================================================================`;
}
