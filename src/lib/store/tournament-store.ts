import { BracketStructure, MatchStatus, TournamentStatus } from "../tournament/types";
import { DomainLab, DomainPC, DomainStation, PCStatus, ScheduledFixture, VenueCapacityMetrics } from "../scheduling/types";
import { evaluateLabCapacity, calculateVenueCapacity } from "../scheduling/capacity";
import { generateSingleEliminationBracket, advanceBracketWinner } from "../tournament/bracket";
import { generateFixtures } from "../scheduling/scheduler";
import { runPreFinalizationValidation, ValidationReport } from "../tournament/validator";
import { validateTournamentTransition, validateMatchTransition } from "../tournament/state-machine";
import {
  Stage1ScheduleResult,
  Stage1MatchSlot,
  Stage1MatchStatus,
  generateStage1Schedule,
  getDefaultStage1Config,
  swapStage1Teams as swapStage1TeamsEngine,
  recalculateLabCapacity,
} from "../scheduling/stage1-fixtures";
import {
  IPLPlayoffStructure,
  IPLPrizeRankings,
  generateIPLPlayoffs,
  advanceIPLPlayoffResult,
} from "../tournament/ipl-playoffs";

export interface StoredTournament {
  id: string;
  name: string;
  game: string;
  venueName: string;
  date: string;
  startTime: string;
  status: TournamentStatus;
  format: string;
  currentRound: number;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredPlayer {
  id: string;
  teamId: string;
  name: string;
  collegeId?: string;
  riotId: string;
  riotTag: string;
  phone?: string;
  role: "CAPTAIN" | "STARTER" | "SUBSTITUTE";
  verified: boolean;
  present: boolean;
}

export interface StoredTeam {
  id: string;
  tournamentId: string;
  name: string;
  captain: string;
  captainContact: string;
  institution: string;
  seed: number;
  status: "REGISTERED" | "CHECKED_IN" | "INCOMPLETE" | "READY" | "PLAYING" | "QUALIFIED" | "ELIMINATED" | "DISQUALIFIED" | "NO_SHOW";
  checkedInAt?: string;
  hasPlayed?: boolean;
  players: StoredPlayer[];
}

export interface StoredIncident {
  id: string;
  tournamentId: string;
  matchId?: string;
  matchCode?: string;
  teamId?: string;
  reportedBy: string;
  category: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "REPORTED" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  description: string;
  resolutionNotes?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface StoredAuditLog {
  id: string;
  tournamentId?: string;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}

class TournamentStore {
  private tournaments: Map<string, StoredTournament> = new Map();
  private teams: Map<string, StoredTeam[]> = new Map(); // tournamentId -> teams
  private labs: Map<string, DomainLab[]> = new Map(); // tournamentId -> labs
  private brackets: Map<string, BracketStructure> = new Map(); // tournamentId -> bracket
  private fixtures: Map<string, ScheduledFixture[]> = new Map(); // tournamentId -> fixtures
  private stage1Schedules: Map<string, Stage1ScheduleResult> = new Map(); // tournamentId -> stage1Schedule
  private iplPlayoffs: Map<string, IPLPlayoffStructure> = new Map(); // tournamentId -> iplPlayoffs
  private incidents: Map<string, StoredIncident[]> = new Map(); // tournamentId -> incidents
  private auditLogs: StoredAuditLog[] = [];

  constructor() {
    this.seedDefaultTournament();
  }

  private seedDefaultTournament() {
    const tourneyId = "vto-tourney-1";
    const now = new Date();
    const tourney: StoredTournament = {
      id: tourneyId,
      name: "VALORANT 5v5 Internal Tournament",
      game: "VALORANT",
      venueName: "Campus Gaming Complex (AI Lab & Meta lab)",
      date: now.toISOString().split("T")[0],
      startTime: "10:00",
      status: "READY",
      format: "SINGLE_ELIMINATION",
      currentRound: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.tournaments.set(tourneyId, tourney);

    // Official 13 Teams
    const official13TeamNames = [
      "XARAN",
      "Muthusipi Orchestra",
      "Eclipse",
      "Tenzor",
      "ESP (espada)",
      "Error4O4",
      "TEAM VORTEX",
      "VALORANT NOOBS",
      "Skull Krushers",
      "x",
      "Goodie Gang",
      "TEAM EREN",
      "Kawai",
    ];

    const defaultTeams: StoredTeam[] = official13TeamNames.map((name, i) => {
      const teamId = `team-${i + 1}`;
      return {
        id: teamId,
        tournamentId: tourneyId,
        name,
        captain: `Captain ${name.replace(/\s+/g, "")}`,
        captainContact: `+1-555-010${i + 1}`,
        institution: `Campus Esports Club`,
        seed: i + 1,
        status: "CHECKED_IN",
        checkedInAt: now.toISOString(),
        hasPlayed: false,
        players: Array.from({ length: 5 }, (_, p) => ({
          id: `${teamId}-p${p + 1}`,
          teamId,
          name: `${name} Player ${p + 1}`,
          riotId: `${name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}P${p + 1}`,
          riotTag: "VAL",
          role: p === 0 ? "CAPTAIN" : "STARTER",
          verified: true,
          present: true,
        })),
      };
    });
    this.teams.set(tourneyId, defaultTeams);

    // Physical Infrastructure:
    // AI Lab: 30 PCs, 3 stations (10 PCs each: Match 1, Match 2, Match 3)
    // Meta lab: 10 PCs, 1 station (10 PCs: Match 1)
    const lab1Stations: DomainStation[] = [1, 2, 3].map((s) => ({
      id: `lab-1-st-${s}`,
      name: `Match ${s}`,
      labId: "lab-1",
      labName: "AI Lab",
      requiredPCs: 10,
      pcs: [],
      isOperational: true,
      workingPcCount: 10,
    }));
    const lab1Pcs: DomainPC[] = Array.from({ length: 30 }, (_, i) => {
      const stIdx = Math.floor(i / 10);
      const pc: DomainPC = {
        id: `pc-${i + 1}`,
        pcNumber: `PC-${String(i + 1).padStart(2, "0")}`,
        labId: "lab-1",
        stationId: lab1Stations[stIdx].id,
        status: "AVAILABLE",
      };
      lab1Stations[stIdx].pcs.push(pc);
      return pc;
    });
    const lab1: DomainLab = {
      id: "lab-1",
      name: "AI Lab",
      totalPcs: 30,
      stations: lab1Stations,
      operationalStationsCount: 3,
      workingPcCount: 30,
    };

    const lab2Stations: DomainStation[] = [
      {
        id: `lab-2-st-1`,
        name: `Match 1`,
        labId: "lab-2",
        labName: "Meta lab",
        requiredPCs: 10,
        pcs: [],
        isOperational: true,
        workingPcCount: 10,
      },
    ];
    const lab2Pcs: DomainPC[] = Array.from({ length: 10 }, (_, i) => {
      const pc: DomainPC = {
        id: `pc-2-${i + 1}`,
        pcNumber: `PC-${String(31 + i).padStart(2, "0")}`,
        labId: "lab-2",
        stationId: lab2Stations[0].id,
        status: "AVAILABLE",
      };
      lab2Stations[0].pcs.push(pc);
      return pc;
    });
    const lab2: DomainLab = {
      id: "lab-2",
      name: "Meta lab",
      totalPcs: 10,
      stations: lab2Stations,
      operationalStationsCount: 1,
      workingPcCount: 10,
    };

    this.labs.set(tourneyId, [lab1, lab2]);

    // Generate Standard Bracket & Fixtures
    const participants = defaultTeams.map((t) => ({ id: t.id, name: t.name, seed: t.seed }));
    const bracket = generateSingleEliminationBracket(participants);
    this.brackets.set(tourneyId, bracket);

    const fixturesResult = generateFixtures(bracket, [...lab1.stations, ...lab2.stations], {
      tournamentStartTime: "2026-10-15T10:00:00.000Z",
      matchDurationMinutes: 45,
      bufferDurationMinutes: 15,
    });
    this.fixtures.set(tourneyId, fixturesResult.fixtures);

    // Generate Stage 1 Slot Schedule (13 Teams across AI Lab & Meta lab)
    const stage1Config = getDefaultStage1Config("2026-10-15T10:00:00.000Z");
    const stage1Schedule = generateStage1Schedule(tourneyId, participants, stage1Config);
    this.stage1Schedules.set(tourneyId, stage1Schedule);

    // Initialize IPL Playoffs structure with top 4 seeds
    const ipl = generateIPLPlayoffs(tourneyId, participants.slice(0, 4));
    this.iplPlayoffs.set(tourneyId, ipl);

    this.incidents.set(tourneyId, []);
    this.auditLogs.push({
      id: "audit-init",
      tournamentId: tourneyId,
      actorId: "system",
      actorRole: "SUPER_ADMIN",
      action: "TOURNAMENT_INITIALIZED",
      entity: "Tournament",
      entityId: tourneyId,
      details: "Tournament initialized with 13 official teams, AI Lab (30 PCs), and Meta lab (10 PCs).",
      timestamp: now.toISOString(),
    });
  }

  // --- Tournaments ---
  getTournaments(): StoredTournament[] {
    return Array.from(this.tournaments.values());
  }

  getTournament(id: string): StoredTournament | undefined {
    return this.tournaments.get(id);
  }

  createTournament(data: Partial<StoredTournament>): StoredTournament {
    const id = `tourney-${Date.now()}`;
    const now = new Date().toISOString();
    const tournament: StoredTournament = {
      id,
      name: data.name || "New VALORANT Tournament",
      game: "VALORANT",
      venueName: data.venueName || "AI Lab & Meta lab Complex",
      date: data.date || now.split("T")[0],
      startTime: data.startTime || "10:00",
      status: "DRAFT",
      format: data.format || "SINGLE_ELIMINATION",
      currentRound: 1,
      createdAt: now,
      updatedAt: now,
    };
    this.tournaments.set(id, tournament);
    this.teams.set(id, []);
    this.labs.set(id, []);
    this.incidents.set(id, []);
    this.logAudit(id, "admin", "SUPER_ADMIN", "CREATE_TOURNAMENT", "Tournament", id, `Created ${tournament.name}`);
    return tournament;
  }

  updateTournamentStatus(
    id: string,
    status: TournamentStatus,
    reason?: string,
    actorId: string = "admin",
    actorRole: string = "SUPER_ADMIN"
  ): StoredTournament {
    const t = this.tournaments.get(id);
    if (!t) throw new Error("Tournament not found");
    const oldStatus = t.status;
    if (oldStatus !== status) {
      validateTournamentTransition(oldStatus, status);
    }
    t.status = status;
    t.updatedAt = new Date().toISOString();
    if (status === "FINALIZED") {
      t.finalizedAt = new Date().toISOString();
    }
    this.logAudit(id, actorId, actorRole, "UPDATE_TOURNAMENT_STATUS", "Tournament", id, `Status changed from ${oldStatus} to ${status}${reason ? ` (${reason})` : ""}`);
    return t;
  }

  // --- Teams ---
  getTeams(tournamentId: string): StoredTeam[] {
    return this.teams.get(tournamentId) || [];
  }

  addTeam(
    tournamentId: string,
    teamData: Partial<StoredTeam>,
    actorId: string = "admin",
    actorRole: string = "SUPER_ADMIN"
  ): StoredTeam {
    const teams = this.getTeams(tournamentId);
    const newTeam: StoredTeam = {
      id: `team-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tournamentId,
      name: teamData.name || `Team ${teams.length + 1}`,
      captain: teamData.captain || "Captain",
      captainContact: teamData.captainContact || "",
      institution: teamData.institution || "Campus Esports",
      seed: teamData.seed || teams.length + 1,
      status: "REGISTERED",
      hasPlayed: false,
      players: teamData.players || [],
    };
    teams.push(newTeam);
    this.teams.set(tournamentId, teams);
    this.logAudit(tournamentId, actorId, actorRole, "ADD_TEAM", "Team", newTeam.id, `Added team ${newTeam.name}`);
    return newTeam;
  }

  toggleTeamCheckIn(
    tournamentId: string,
    teamId: string,
    actorId: string = "admin",
    actorRole: string = "REGISTRATION"
  ): StoredTeam {
    const teams = this.getTeams(tournamentId);
    const team = teams.find((t) => t.id === teamId);
    if (!team) throw new Error("Team not found");
    const nextStatus = team.status === "CHECKED_IN" ? "REGISTERED" : "CHECKED_IN";
    team.status = nextStatus;
    team.checkedInAt = nextStatus === "CHECKED_IN" ? new Date().toISOString() : undefined;
    team.players.forEach((p) => {
      p.present = nextStatus === "CHECKED_IN";
    });
    this.logAudit(tournamentId, actorId, actorRole, "CHECK_IN_TEAM", "Team", team.id, `Team ${team.name} marked ${nextStatus}`);
    return team;
  }

  // --- Labs & PC Management ---
  getLabs(tournamentId: string): DomainLab[] {
    return this.labs.get(tournamentId) || [];
  }

  updatePCStatus(
    tournamentId: string,
    labId: string,
    pcId: string,
    status: PCStatus,
    actorId: string = "admin",
    actorRole: string = "TECHNICAL"
  ): void {
    const labs = this.getLabs(tournamentId);
    const lab = labs.find((l) => l.id === labId);
    if (!lab) return;

    for (const st of lab.stations) {
      const pc = st.pcs.find((p) => p.id === pcId);
      if (pc) {
        pc.status = status;
        break;
      }
    }

    const reevaluated = evaluateLabCapacity({
      id: lab.id,
      name: lab.name,
      totalPcs: lab.totalPcs,
      pcs: lab.stations.flatMap((s) => s.pcs),
      stations: lab.stations,
    });

    const index = labs.findIndex((l) => l.id === labId);
    if (index !== -1) {
      labs[index] = reevaluated;
    }
    this.labs.set(tournamentId, labs);
    this.logAudit(tournamentId, actorId, actorRole, "UPDATE_PC_STATUS", "PC", pcId, `PC status set to ${status}`);
  }

  getVenueMetrics(tournamentId: string): VenueCapacityMetrics {
    const labs = this.getLabs(tournamentId);
    return calculateVenueCapacity(labs);
  }

  updateVenueLabConfig(
    tournamentId: string,
    labId: string,
    totalPcs: number,
    name?: string
  ): DomainLab[] {
    const labs = this.getLabs(tournamentId);
    const lab = labs.find((l) => l.id === labId);
    if (!lab) throw new Error(`Lab ${labId} not found`);

    if (name) lab.name = name;
    lab.totalPcs = totalPcs;

    // Recalculate stations: 1 station per 10 PCs
    const matchSlots = Math.floor(totalPcs / 10);
    const newStations: DomainStation[] = [];
    const newPcs: DomainPC[] = [];

    for (let s = 1; s <= matchSlots; s++) {
      const stationId = `${labId}-st-${s}`;
      const stPcs: DomainPC[] = [];
      for (let p = 1; p <= 10; p++) {
        const pcIndex = (s - 1) * 10 + p;
        const pc: DomainPC = {
          id: `${labId}-pc-${pcIndex}`,
          pcNumber: `PC-${pcIndex}`,
          labId,
          stationId,
          status: "AVAILABLE",
        };
        stPcs.push(pc);
        newPcs.push(pc);
      }
      newStations.push({
        id: stationId,
        name: `Match ${s}`,
        labId,
        labName: lab.name,
        requiredPCs: 10,
        pcs: stPcs,
        isOperational: true,
        workingPcCount: 10,
      });
    }

    lab.stations = newStations;
    lab.operationalStationsCount = matchSlots;
    lab.workingPcCount = matchSlots * 10;

    this.labs.set(tournamentId, labs);
    this.logAudit(
      tournamentId,
      "admin",
      "SUPER_ADMIN",
      "CONFIG_LAB",
      "Lab",
      labId,
      `Updated ${lab.name}: ${totalPcs} PCs, ${matchSlots} match slots.`
    );
    return labs;
  }

  // --- Bracket & Fixtures ---
  getBracket(tournamentId: string): BracketStructure | null {
    return this.brackets.get(tournamentId) || null;
  }

  generateBracket(
    tournamentId: string,
    actorId: string = "admin",
    actorRole: string = "SUPER_ADMIN"
  ): BracketStructure {
    const teams = this.getTeams(tournamentId);
    const participants = teams.map((t) => ({ id: t.id, name: t.name, seed: t.seed }));
    const bracket = generateSingleEliminationBracket(participants);
    this.brackets.set(tournamentId, bracket);
    this.logAudit(tournamentId, actorId, actorRole, "GENERATE_BRACKET", "Bracket", tournamentId, `Generated ${bracket.bracketSize}-slot bracket`);
    return bracket;
  }

  getFixtures(tournamentId: string): ScheduledFixture[] {
    return this.fixtures.get(tournamentId) || [];
  }

  generateTournamentFixtures(
    tournamentId: string,
    actorId: string = "admin",
    actorRole: string = "SUPER_ADMIN"
  ): ScheduledFixture[] {
    let bracket = this.getBracket(tournamentId);
    if (!bracket) {
      bracket = this.generateBracket(tournamentId, actorId, actorRole);
    }
    const labs = this.getLabs(tournamentId);
    const stations = labs.flatMap((l) => l.stations);
    const result = generateFixtures(bracket, stations, {
      tournamentStartTime: new Date().toISOString(),
      matchDurationMinutes: 45,
      bufferDurationMinutes: 15,
    });
    this.fixtures.set(tournamentId, result.fixtures);
    this.logAudit(tournamentId, actorId, actorRole, "GENERATE_FIXTURES", "Fixtures", tournamentId, `Generated ${result.fixtures.length} fixtures`);
    return result.fixtures;
  }

  // --- Stage 1 Slot Schedule Engine ---
  getStage1Schedule(tournamentId: string): Stage1ScheduleResult {
    let schedule = this.stage1Schedules.get(tournamentId);
    if (!schedule) {
      const teams = this.getTeams(tournamentId).map((t) => ({ id: t.id, name: t.name, seed: t.seed }));
      const config = getDefaultStage1Config();
      schedule = generateStage1Schedule(tournamentId, teams, config);
      this.stage1Schedules.set(tournamentId, schedule);
    }
    return schedule;
  }

  regenerateStage1Schedule(
    tournamentId: string,
    customByeTeamId?: string,
    customPairings?: { teamAId: string; teamBId: string }[]
  ): Stage1ScheduleResult {
    const teams = this.getTeams(tournamentId).map((t) => ({ id: t.id, name: t.name, seed: t.seed }));
    const config = getDefaultStage1Config();
    const schedule = generateStage1Schedule(tournamentId, teams, config, {
      customByeTeamId,
      customPairings,
    });
    this.stage1Schedules.set(tournamentId, schedule);
    this.logAudit(
      tournamentId,
      "admin",
      "SUPER_ADMIN",
      "REGENERATE_STAGE1_SCHEDULE",
      "Schedule",
      tournamentId,
      `Regenerated Stage 1 schedule (${schedule.slots.length} time slots)`
    );
    return schedule;
  }

  swapStage1Teams(
    tournamentId: string,
    matchIdA: string,
    slotA: "TEAM_A" | "TEAM_B",
    matchIdB: string,
    slotB: "TEAM_A" | "TEAM_B"
  ): Stage1ScheduleResult {
    const schedule = this.getStage1Schedule(tournamentId);
    const updated = swapStage1TeamsEngine(schedule, matchIdA, slotA, matchIdB, slotB);
    this.stage1Schedules.set(tournamentId, updated);
    this.logAudit(
      tournamentId,
      "admin",
      "SUPER_ADMIN",
      "SWAP_STAGE1_TEAMS",
      "Match",
      matchIdA,
      `Swapped teams between ${matchIdA} and ${matchIdB}`
    );
    return updated;
  }

  setStage1ByeTeam(tournamentId: string, teamId: string): Stage1ScheduleResult {
    return this.regenerateStage1Schedule(tournamentId, teamId);
  }

  updateStage1MatchStatus(
    tournamentId: string,
    matchId: string,
    status: Stage1MatchStatus
  ): Stage1ScheduleResult {
    const schedule = this.getStage1Schedule(tournamentId);
    const match = schedule.allMatches.find((m) => m.matchId === matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);

    match.status = status;
    if (status === "Teams Called") {
      match.attendanceStatus.calledAt = new Date().toISOString();
      const graceMs = Date.now() + schedule.config.gracePeriodMinutes * 60 * 1000;
      match.gracePeriodEndTime = new Date(graceMs).toISOString();
    } else if (status === "Ready") {
      match.attendanceStatus.teamAReady = true;
      match.attendanceStatus.teamBReady = true;
      match.attendanceStatus.readyAt = new Date().toISOString();
    } else if (status === "Completed") {
      // Mark participating teams as having played
      const teams = this.getTeams(tournamentId);
      if (match.teamA) {
        const tA = teams.find((t) => t.id === match.teamA!.id);
        if (tA) tA.hasPlayed = true;
      }
      if (match.teamB) {
        const tB = teams.find((t) => t.id === match.teamB!.id);
        if (tB) tB.hasPlayed = true;
      }
    }

    // Update in slots
    for (const s of schedule.slots) {
      const idx = s.matches.findIndex((m) => m.matchId === matchId);
      if (idx !== -1) s.matches[idx] = match;
    }

    this.stage1Schedules.set(tournamentId, schedule);
    this.logAudit(
      tournamentId,
      "organizer",
      "COORDINATOR",
      "STAGE1_STATUS_UPDATE",
      "Match",
      matchId,
      `Match ${matchId} status changed to ${status}`
    );
    return schedule;
  }

  recordStage1MatchResult(
    tournamentId: string,
    matchId: string,
    scoreA: number,
    scoreB: number,
    winnerId?: string
  ): Stage1ScheduleResult {
    const schedule = this.getStage1Schedule(tournamentId);
    const match = schedule.allMatches.find((m) => m.matchId === matchId);
    if (!match) throw new Error(`Match ${matchId} not found`);
    if (!match.teamA || !match.teamB) throw new Error(`Match lacks teams.`);

    const determinedWinnerId = winnerId || (scoreA > scoreB ? match.teamA.id : match.teamB.id);
    const loserId = determinedWinnerId === match.teamA.id ? match.teamB.id : match.teamA.id;

    match.result = {
      teamAScore: scoreA,
      teamBScore: scoreB,
      winnerId: determinedWinnerId,
      loserId,
      verified: true,
    };
    match.status = "Completed";

    // Mark both teams as hasPlayed
    const teams = this.getTeams(tournamentId);
    const tA = teams.find((t) => t.id === match.teamA!.id);
    if (tA) tA.hasPlayed = true;
    const tB = teams.find((t) => t.id === match.teamB!.id);
    if (tB) tB.hasPlayed = true;

    for (const s of schedule.slots) {
      const idx = s.matches.findIndex((m) => m.matchId === matchId);
      if (idx !== -1) s.matches[idx] = match;
    }

    this.stage1Schedules.set(tournamentId, schedule);
    this.logAudit(
      tournamentId,
      "official",
      "RESULTS_OFFICIAL",
      "STAGE1_RECORD_RESULT",
      "Match",
      matchId,
      `Result recorded: ${scoreA}-${scoreB}, Winner: ${determinedWinnerId}`
    );
    return schedule;
  }

  forfeitStage1Match(
    tournamentId: string,
    matchId: string,
    forfeitingTeamId: string,
    reason: string
  ): Stage1ScheduleResult {
    const schedule = this.getStage1Schedule(tournamentId);
    const match = schedule.allMatches.find((m) => m.matchId === matchId);
    if (!match || !match.teamA || !match.teamB) throw new Error("Match not found or invalid");

    const winner = match.teamA.id === forfeitingTeamId ? match.teamB : match.teamA;
    match.status = "Forfeit";
    match.result = {
      teamAScore: winner.id === match.teamA.id ? 13 : 0,
      teamBScore: winner.id === match.teamB.id ? 13 : 0,
      winnerId: winner.id,
      loserId: forfeitingTeamId,
      verified: true,
    };
    match.notes = `Forfeit / No Show: ${reason}`;

    for (const s of schedule.slots) {
      const idx = s.matches.findIndex((m) => m.matchId === matchId);
      if (idx !== -1) s.matches[idx] = match;
    }

    this.stage1Schedules.set(tournamentId, schedule);
    this.logAudit(
      tournamentId,
      "organizer",
      "SUPER_ADMIN",
      "STAGE1_FORFEIT_MATCH",
      "Match",
      matchId,
      `Match forfeited by ${forfeitingTeamId}. Reason: ${reason}`
    );
    return schedule;
  }

  // --- IPL Playoffs & 3-Place Rankings ---
  getIPLPlayoffs(tournamentId: string): IPLPlayoffStructure | null {
    return this.iplPlayoffs.get(tournamentId) || null;
  }

  initIPLPlayoffs(tournamentId: string, top4TeamIds?: string[]): IPLPlayoffStructure {
    const teams = this.getTeams(tournamentId);
    let selected: StoredTeam[] = [];

    if (top4TeamIds && top4TeamIds.length === 4) {
      selected = top4TeamIds.map((id) => teams.find((t) => t.id === id)!).filter(Boolean);
    }
    if (selected.length < 4) {
      selected = teams.slice(0, 4);
    }

    const participants = selected.map((t) => ({ id: t.id, name: t.name, seed: t.seed }));
    const playoffs = generateIPLPlayoffs(tournamentId, participants);
    this.iplPlayoffs.set(tournamentId, playoffs);
    this.logAudit(
      tournamentId,
      "admin",
      "SUPER_ADMIN",
      "INIT_IPL_PLAYOFFS",
      "Playoffs",
      tournamentId,
      `Initialized IPL Playoffs with top 4 teams: ${participants.map((p) => p.name).join(", ")}`
    );
    return playoffs;
  }

  recordIPLResult(
    tournamentId: string,
    matchCode: "Q1" | "EL" | "Q2" | "GF",
    winnerId: string,
    scoreA: number,
    scoreB: number
  ): IPLPlayoffStructure {
    let playoffs = this.getIPLPlayoffs(tournamentId);
    if (!playoffs) {
      playoffs = this.initIPLPlayoffs(tournamentId);
    }

    const updated = advanceIPLPlayoffResult(playoffs, matchCode, winnerId, { scoreA, scoreB });
    this.iplPlayoffs.set(tournamentId, updated);
    this.logAudit(
      tournamentId,
      "official",
      "RESULTS_OFFICIAL",
      "RECORD_IPL_RESULT",
      "PlayoffMatch",
      matchCode,
      `Recorded result for ${matchCode}: Winner ${winnerId} (${scoreA}-${scoreB})`
    );
    return updated;
  }

  getPrizeStandings(tournamentId: string): IPLPrizeRankings {
    const playoffs = this.getIPLPlayoffs(tournamentId);
    if (!playoffs) {
      return { isCompleted: false };
    }
    return playoffs.rankings;
  }

  // --- Live Operations ---
  updateMatchStatus(
    tournamentId: string,
    matchId: string,
    status: MatchStatus,
    actorId: string = "volunteer",
    actorRole: string = "MATCH_MARSHAL"
  ): void {
    const bracket = this.getBracket(tournamentId);
    let foundMatch = null;
    if (bracket) {
      for (const r of bracket.rounds) {
        const match = r.matches.find((m) => m.id === matchId);
        if (match) {
          foundMatch = match;
          break;
        }
      }
    }
    const fixtures = this.getFixtures(tournamentId);
    const fix = fixtures.find((f) => f.matchId === matchId);

    const currentStatus: MatchStatus = (foundMatch?.status || fix?.status || "SCHEDULED") as MatchStatus;
    if (currentStatus !== status) {
      validateMatchTransition(currentStatus, status);
    }

    if (foundMatch) {
      foundMatch.status = status;
    }
    if (fix) {
      fix.status = status;
    }
    this.logAudit(tournamentId, actorId, actorRole, "UPDATE_MATCH_STATUS", "Match", matchId, `Match status updated to ${status}`);
  }

  submitAndVerifyResult(
    tournamentId: string,
    matchId: string,
    winnerId: string,
    scoreA: number,
    scoreB: number,
    actorId: string = "official",
    actorRole: string = "RESULTS_OFFICIAL"
  ): BracketStructure {
    const bracket = this.getBracket(tournamentId);
    if (!bracket) throw new Error("Bracket not found");

    const updated = advanceBracketWinner(bracket, matchId, winnerId);
    this.brackets.set(tournamentId, updated);

    // Update fixture status
    const fixtures = this.getFixtures(tournamentId);
    const fix = fixtures.find((f) => f.matchId === matchId);
    if (fix) {
      fix.status = "VERIFIED";
    }

    this.logAudit(
      tournamentId,
      actorId,
      actorRole,
      "VERIFY_RESULT",
      "Match",
      matchId,
      `Verified score: ${scoreA}-${scoreB}, Winner: ${winnerId}`
    );
    return updated;
  }

  // --- Incidents ---
  getIncidents(tournamentId: string): StoredIncident[] {
    return this.incidents.get(tournamentId) || [];
  }

  reportIncident(
    incident: Omit<StoredIncident, "id" | "createdAt" | "status">,
    actorId?: string,
    actorRole?: string
  ): StoredIncident {
    const list = this.getIncidents(incident.tournamentId);
    const newInc: StoredIncident = {
      ...incident,
      id: `inc-${Date.now()}`,
      status: "REPORTED",
      createdAt: new Date().toISOString(),
    };
    list.unshift(newInc);
    this.incidents.set(incident.tournamentId, list);
    this.logAudit(
      incident.tournamentId,
      actorId || incident.reportedBy,
      actorRole || "MATCH_MARSHAL",
      "REPORT_INCIDENT",
      "Incident",
      newInc.id,
      `Incident reported: [${newInc.category}] ${newInc.description}`
    );
    return newInc;
  }

  resolveIncident(
    tournamentId: string,
    incidentId: string,
    resolutionNotes: string,
    actorId: string = "tech-lead",
    actorRole: string = "TECHNICAL"
  ): void {
    const list = this.getIncidents(tournamentId);
    const inc = list.find((i) => i.id === incidentId);
    if (inc) {
      inc.status = "RESOLVED";
      inc.resolutionNotes = resolutionNotes;
      inc.resolvedAt = new Date().toISOString();
      this.logAudit(tournamentId, actorId, actorRole, "RESOLVE_INCIDENT", "Incident", incidentId, `Resolved: ${resolutionNotes}`);
    }
  }

  // --- Audit ---
  logAudit(
    tournamentId: string | undefined,
    actorId: string,
    actorRole: string,
    action: string,
    entity: string,
    entityId: string,
    details: string
  ): void {
    const log: StoredAuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tournamentId,
      actorId,
      actorRole,
      action,
      entity,
      entityId,
      details,
      timestamp: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
  }

  getAuditLogs(tournamentId?: string): StoredAuditLog[] {
    if (tournamentId) {
      return this.auditLogs.filter((l) => l.tournamentId === tournamentId);
    }
    return this.auditLogs;
  }

  validateTournament(tournamentId: string): ValidationReport {
    const tournament = this.getTournament(tournamentId);
    if (!tournament) throw new Error("Tournament not found");
    const teams = this.getTeams(tournamentId);
    const venueMetrics = this.getVenueMetrics(tournamentId);
    const bracket = this.getBracket(tournamentId);
    const fixtures = this.getFixtures(tournamentId);

    return runPreFinalizationValidation({
      tournament,
      teams: teams.map((t) => ({
        id: t.id,
        name: t.name,
        players: t.players,
        checkedIn: t.status === "CHECKED_IN",
      })),
      venueMetrics,
      bracket,
      fixtures,
      volunteersCount: 4,
      requireFullAttendance: true,
    });
  }
}

// Global Singleton
const globalStore = global as unknown as { __tournamentStore?: TournamentStore };
export const store = globalStore.__tournamentStore || new TournamentStore();
if (process.env.NODE_ENV !== "production") {
  globalStore.__tournamentStore = store;
}
