export interface AnnouncementTemplate {
  id: string;
  name: string;
  category: "CALLS" | "MATCHES" | "INCIDENTS" | "TOURNAMENT";
  template: (vars: Record<string, string>) => string;
}

export const ANNOUNCEMENT_TEMPLATES: AnnouncementTemplate[] = [
  {
    id: "REGISTRATION_REMINDER",
    name: "Registration & Check-In Reminder",
    category: "TOURNAMENT",
    template: (v) =>
      `[NOTICE] [CHECK-IN REMINDER] All teams participating in ${v.tournamentName || "VALORANT Championship"} must report to the registration desk in ${v.venueName || "Main Hall"} to verify Riot IDs and confirm attendance before ${v.deadline || "10:00 AM"}.`,
  },
  {
    id: "TEAM_CALL",
    name: "Team Call to Station",
    category: "CALLS",
    template: (v) =>
      `[ANNOUNCEMENT] [TEAM CALL] Match ${v.matchCode}: ${v.teamA} vs ${v.teamB} is now called. Please report immediately to ${v.stationName} (${v.labName}). Teams have 5 minutes to take seats.`,
  },
  {
    id: "MATCH_STARTING",
    name: "Match Starting / Live",
    category: "MATCHES",
    template: (v) =>
      `[STATUS] [MATCH LIVE] Match ${v.matchCode} between ${v.teamA} and ${v.teamB} is now LIVE on ${v.stationName}. Custom lobby is locked.`,
  },
  {
    id: "TECH_PAUSE",
    name: "Technical Pause Notice",
    category: "INCIDENTS",
    template: (v) =>
      `[ALERT] [TECHNICAL PAUSE] Match ${v.matchCode} on ${v.stationName} is currently under an official technical pause (${v.reason || "hardware inspection"}). Please stand by.`,
  },
  {
    id: "MATCH_RESUMED",
    name: "Match Resumed",
    category: "INCIDENTS",
    template: (v) =>
      `[UPDATE] [MATCH RESUMED] Technical issue resolved on ${v.stationName}. Match ${v.matchCode} (${v.teamA} vs ${v.teamB}) has resumed.`,
  },
  {
    id: "MATCH_RESULT",
    name: "Match Concluded & Result",
    category: "MATCHES",
    template: (v) =>
      `[RESULT] [OFFICIAL RESULT] Match ${v.matchCode} concluded. ${v.winner} defeats ${v.loser} with a final score of ${v.scoreA} - ${v.scoreB}. ${v.winner} advances to ${v.nextRound || "the next round"}.`,
  },
  {
    id: "NEXT_ROUND_ANNOUNCEMENT",
    name: "Next Round Beginning",
    category: "TOURNAMENT",
    template: (v) =>
      `[SCHEDULE] [ROUND ADVANCEMENT] ${v.roundName || "Round 2"} is commencing. Fixtures are posted on the public scoreboard. Check your assigned stations.`,
  },
  {
    id: "INTERMISSION_BREAK",
    name: "Intermission / Lunch Break",
    category: "TOURNAMENT",
    template: (v) =>
      `[SCHEDULE] [OFFICIAL BREAK] The tournament is currently on a ${v.duration || "30-minute"} break. Next matches will be called promptly at ${v.resumeTime || "1:00 PM"}.`,
  },
  {
    id: "GRAND_FINALS",
    name: "Grand Championship Finals",
    category: "MATCHES",
    template: (v) =>
      `[MATCH] [GRAND FINALS] The Championship Match is about to begin: ${v.teamA} vs ${v.teamB} at ${v.stationName}. Spectators are invited to the main projection arena.`,
  },
  {
    id: "CHAMPION_CROWNED",
    name: "Tournament Winner Announcement",
    category: "TOURNAMENT",
    template: (v) =>
      `[HONOR] [CONGRATULATIONS] ${v.champion} has been crowned the CHAMPION of ${v.tournamentName || "VALORANT Campus Cup 2026"}. Commendations to all participating teams and staff.`,
  },
];
