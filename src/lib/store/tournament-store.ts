import { BracketStructure, MatchStatus, TournamentStatus } from "../tournament/types";
import { DomainLab, DomainPC, DomainStation, PCStatus, ScheduledFixture, VenueCapacityMetrics } from "../scheduling/types";
import { evaluateLabCapacity, calculateVenueCapacity } from "../scheduling/capacity";
import { generateSingleEliminationBracket, advanceBracketWinner } from "../tournament/bracket";
import { generateFixtures } from "../scheduling/scheduler";
import { runPreFinalizationValidation, ValidationReport } from "../tournament/validator";
import { validateTournamentTransition, validateMatchTransition } from "../tournament/state-machine";

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
      name: "VALORANT Campus Championship 2026",
      game: "VALORANT",
      venueName: "University Tech Arena & LAN Center",
      date: now.toISOString().split("T")[0],
      startTime: "10:00",
      status: "READY",
      format: "SINGLE_ELIMINATION",
      currentRound: 1,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.tournaments.set(tourneyId, tourney);

    // Seed 13 Teams with 5 players each
    const defaultTeams: StoredTeam[] = [
      "Sentinels Academy",
      "Fnatic Rising",
      "Paper Rex Youth",
      "Team Liquid Echo",
      "DRX Vision",
      "LOUD Genesis",
      "Evil Geniuses Nova",
      "NRG Orbit",
      "Karmine Corp Blue",
      "Team Heretics Next",
      "BBL Queens",
      "Leviatan Vanguard",
      "ZETA Division Spark",
    ].map((name, i) => {
      const teamId = `team-${i + 1}`;
      return {
        id: teamId,
        tournamentId: tourneyId,
        name,
        captain: `Captain ${i + 1}`,
        captainContact: `+1-555-010${i + 1}`,
        institution: `University of Esports ${i + 1}`,
        seed: i + 1,
        status: "CHECKED_IN",
        checkedInAt: now.toISOString(),
        players: Array.from({ length: 5 }, (_, p) => ({
          id: `${teamId}-p${p + 1}`,
          teamId,
          name: `${name} Player ${p + 1}`,
          riotId: `Player${p + 1}`,
          riotTag: name.substring(0, 3).toUpperCase(),
          role: p === 0 ? "CAPTAIN" : "STARTER",
          verified: true,
          present: true,
        })),
      };
    });
    this.teams.set(tourneyId, defaultTeams);

    // Seed Labs: Lab 1 (30 PCs, 3 stations), Lab 2 (10 PCs, 1 station)
    const lab1Stations: DomainStation[] = [1, 2, 3].map((s) => ({
      id: `lab-1-st-${s}`,
      name: `Station ${s}`,
      labId: "lab-1",
      labName: "Lab 1 (North Hall)",
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
      name: "Lab 1 (North Hall)",
      totalPcs: 30,
      stations: lab1Stations,
      operationalStationsCount: 3,
      workingPcCount: 30,
    };

    const lab2Stations: DomainStation[] = [
      {
        id: `lab-2-st-1`,
        name: `Station 1`,
        labId: "lab-2",
        labName: "Lab 2 (South Arena)",
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
      name: "Lab 2 (South Arena)",
      totalPcs: 10,
      stations: lab2Stations,
      operationalStationsCount: 1,
      workingPcCount: 10,
    };

    this.labs.set(tourneyId, [lab1, lab2]);

    // Generate Initial Bracket and Fixtures
    const bracket = generateSingleEliminationBracket(
      defaultTeams.map((t) => ({ id: t.id, name: t.name, seed: t.seed }))
    );
    this.brackets.set(tourneyId, bracket);

    const fixturesResult = generateFixtures(bracket, [...lab1.stations, ...lab2.stations], {
      tournamentStartTime: "2026-10-15T10:00:00.000Z",
      matchDurationMinutes: 45,
      bufferDurationMinutes: 15,
    });
    this.fixtures.set(tourneyId, fixturesResult.fixtures);

    this.incidents.set(tourneyId, []);
    this.auditLogs.push({
      id: "audit-init",
      tournamentId: tourneyId,
      actorId: "system",
      actorRole: "SUPER_ADMIN",
      action: "TOURNAMENT_INITIALIZED",
      entity: "Tournament",
      entityId: tourneyId,
      details: "Default tournament created with 13 teams and 4 stations",
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
      venueName: data.venueName || "Main Campus Lab",
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
      institution: teamData.institution || "College",
      seed: teamData.seed || teams.length + 1,
      status: "REGISTERED",
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
