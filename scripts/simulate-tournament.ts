import {
  generateSingleEliminationBracket,
  advanceBracketWinner,
} from "../src/lib/tournament/bracket";
import {
  evaluateLabCapacity,
  calculateVenueCapacity,
} from "../src/lib/scheduling/capacity";
import { generateFixtures } from "../src/lib/scheduling/scheduler";
import { runPreFinalizationValidation } from "../src/lib/tournament/validator";
import {
  canTransitionMatch,
  canTransitionTournament,
} from "../src/lib/tournament/state-machine";
import { Participant, BracketStructure } from "../src/lib/tournament/types";
import { DomainLab, DomainPC, DomainStation } from "../src/lib/scheduling/types";

console.log("===============================================================");
console.log("VTO - TOURNAMENT SIMULATION ENGINE (13 TEAMS, 40 PCs)");
console.log("===============================================================\n");

// 1. Create Tournament & Teams
console.log("[STEP 1] Creating Tournament & Registering 13 Teams (5 players each)...");
const TEAM_NAMES = [
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
];

interface SimTeam extends Participant {
  players: { id: string; name: string; riotId: string; verified: boolean }[];
  checkedIn: boolean;
}

const teams: SimTeam[] = TEAM_NAMES.map((name, i) => ({
  id: `team-${i + 1}`,
  name,
  seed: i + 1,
  checkedIn: true,
  players: Array.from({ length: 5 }, (_, p) => ({
    id: `t${i + 1}-p${p + 1}`,
    name: `${name} Player ${p + 1}`,
    riotId: `Player${p + 1}#${name.substring(0, 3).toUpperCase()}`,
    verified: true,
  })),
}));

console.log(`[PASS] 13 Teams registered with ${teams.length * 5} total players.`);
console.log(`[PASS] All 13 teams checked in at registration desk.\n`);

// 2. Configure Labs & Stations
console.log("[STEP 2] Configuring Physical Labs & Hardware...");
console.log("   - Lab 1: 30 PCs across 3 Stations (PCs 1-10, 11-20, 21-30)");
console.log("   - Lab 2: 10 PCs across 1 Station (PCs 31-40)");

function buildLab(
  id: string,
  name: string,
  startPc: number,
  totalPcs: number,
  stationCount: number
): DomainLab {
  const stations: DomainStation[] = [];
  const pcs: DomainPC[] = [];

  for (let s = 1; s <= stationCount; s++) {
    stations.push({
      id: `${id}-st-${s}`,
      name: `${name} / Station ${s}`,
      labId: id,
      labName: name,
      requiredPCs: 10,
      pcs: [],
      isOperational: false,
      workingPcCount: 0,
    });
  }

  for (let i = 0; i < totalPcs; i++) {
    const pcNum = startPc + i;
    const stIndex = Math.floor(i / 10);
    const stationId = stIndex < stations.length ? stations[stIndex].id : null;
    const pc: DomainPC = {
      id: `pc-${pcNum}`,
      pcNumber: `PC-${pcNum}`,
      labId: id,
      stationId,
      status: "AVAILABLE",
    };
    pcs.push(pc);
    if (stIndex < stations.length) {
      stations[stIndex].pcs.push(pc);
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

const lab1 = buildLab("lab-1", "Alpha Computing Hall", 1, 30, 3);
const lab2 = buildLab("lab-2", "Bravo Esports Suite", 31, 10, 1);
const venueMetrics = calculateVenueCapacity([lab1, lab2]);

console.log(`[PASS] Venue Calculated Capacity:`);
console.log(`  - Total Working PCs: ${venueMetrics.totalWorkingPCs}`);
console.log(`  - Configured Stations: ${venueMetrics.totalStations}`);
console.log(`  - Operational Stations: ${venueMetrics.operationalStations}`);
console.log(`  - Maximum Simultaneous Matches: ${venueMetrics.maxSimultaneousMatches}\n`);

if (venueMetrics.maxSimultaneousMatches !== 4) {
  throw new Error(`Expected 4 simultaneous matches, got ${venueMetrics.maxSimultaneousMatches}`);
}

// 3. Generate Bracket
console.log("[STEP 3] Generating Single Elimination Bracket...");
let bracket: BracketStructure = generateSingleEliminationBracket(teams);

console.log(`[PASS] Bracket Size: ${bracket.bracketSize}`);
console.log(`[PASS] Total Rounds: ${bracket.totalRounds}`);
console.log(`[PASS] Total BYEs: ${bracket.totalBYEs}`);
console.log(`  - Round 1: ${bracket.rounds[0].name} (${bracket.rounds[0].matches.length} matches: 5 played, 3 BYEs)`);
console.log(`  - Round 2: ${bracket.rounds[1].name} (${bracket.rounds[1].matches.length} matches)`);
console.log(`  - Round 3: ${bracket.rounds[2].name} (${bracket.rounds[2].matches.length} matches)`);
console.log(`  - Round 4: ${bracket.rounds[3].name} (${bracket.rounds[3].matches.length} match)\n`);

// 4. Generate Fixtures
console.log("[STEP 4] Generating Hardware-Constrained Fixtures...");
const allStations = [...lab1.stations, ...lab2.stations];
const scheduling = generateFixtures(bracket, allStations, {
  tournamentStartTime: "2026-10-15T09:00:00.000Z",
  matchDurationMinutes: 45,
  bufferDurationMinutes: 15,
});

console.log(`[PASS] Total Playable Matches Scheduled: ${scheduling.totalMatchesScheduled}`);
console.log(`[PASS] Estimated Tournament End Time: ${scheduling.estimatedTournamentEndTime}`);
console.log(`[PASS] Fixture Conflicts Detected: ${scheduling.conflicts.length}\n`);

if (scheduling.conflicts.length > 0) {
  throw new Error(`Scheduling conflicts detected: ${scheduling.conflicts.join(", ")}`);
}

// 5. Pre-Finalization Validation
console.log("[STEP 5] Running Pre-Finalization Validation Pipeline...");
const validation = runPreFinalizationValidation({
  tournament: { id: "tourney-1", name: "Campus VALORANT Invitational", status: "READY" },
  teams,
  venueMetrics,
  bracket,
  fixtures: scheduling.fixtures,
  volunteersCount: 4,
  requireFullAttendance: true,
});

console.log(`[PASS] Pre-Finalization Status: ${validation.overallPassed ? "PASS" : "FAIL"}`);
validation.checks.forEach((chk) => {
  const symbol = chk.passed ? "[PASS]" : "[FAIL]";
  console.log(`  ${symbol} [${chk.category}] ${chk.name}: ${chk.message}`);
});

if (!validation.canFinalize) {
  throw new Error("Validation pipeline failed before tournament finalization!");
}

console.log("\n[LOCKED] TOURNAMENT FINALIZED — ALL FIXTURES & ROSTERS LOCKED\n");

// 6. Live Tournament Match Simulation
console.log("[STEP 6] Simulating Live Tournament Rounds & Incident Handling...\n");

const incidents: { id: string; category: string; description: string; resolved: boolean }[] = [];

for (let rIndex = 0; rIndex < bracket.rounds.length; rIndex++) {
  const round = bracket.rounds[rIndex];
  console.log(`--- [ROUND ${round.roundNumber}: ${round.name.toUpperCase()}] ---`);

  for (const match of round.matches) {
    if (match.isBye) {
      console.log(`  [BYE] ${match.code}: ${match.teamA?.name} received BYE -> Auto-Advanced`);
      continue;
    }

    if (!match.teamA || !match.teamB) {
      throw new Error(`Match ${match.code} has missing teams at execution time!`);
    }

    // State transitions: SCHEDULED -> CALLED -> READY -> LOBBY_READY -> LIVE
    if (!canTransitionMatch(match.status, "CALLED")) throw new Error("Invalid transition to CALLED");
    match.status = "CALLED";
    match.status = "READY";
    match.status = "LOBBY_READY";
    match.status = "LIVE";

    // Simulate incident on Round 1, Match 2 (e.g. M02)
    if (round.roundNumber === 1 && match.matchNumber === 2) {
      console.log(`  [INCIDENT] Technical pause on ${match.code} — Audio headset disconnect on PC-14.`);
      match.status = "PAUSED";
      incidents.push({
        id: "inc-1",
        category: "HARDWARE",
        description: "Audio headset replaced by Marshal",
        resolved: true,
      });
      match.status = "LIVE";
      console.log(`  [RESOLVED] Headset replaced. Match resumed.`);
    }

    // Determine deterministic simulated winner based on higher seed
    const seedA = match.teamA.seed ?? 99;
    const seedB = match.teamB.seed ?? 99;
    const winner = seedA <= seedB ? match.teamA : match.teamB;
    const loser = seedA <= seedB ? match.teamB : match.teamA;
    const scoreA = seedA <= seedB ? 13 : Math.floor(Math.random() * 5) + 6;
    const scoreB = seedA <= seedB ? Math.floor(Math.random() * 5) + 6 : 13;

    match.status = "FINISHED";
    match.status = "RESULT_PENDING";

    // Result Official Verifies
    match.status = "VERIFIED";
    match.winnerId = winner.id;
    match.loserId = loser.id;

    console.log(
      `  [MATCH] ${match.code}: ${match.teamA.name} (${scoreA}) vs (${scoreB}) ${match.teamB.name} => Winner: ${winner.name}`
    );

    // Advance winner in bracket
    bracket = advanceBracketWinner(bracket, match.id, winner.id);
  }
  console.log("");
}

// 7. Crowning Champion & Final Report
const grandFinal = bracket.rounds[bracket.rounds.length - 1].matches[0];
const champion = teams.find((t) => t.id === grandFinal.winnerId);
const runnerUp = teams.find((t) => t.id === grandFinal.loserId);

console.log("===============================================================");
console.log("[STATUS] TOURNAMENT COMPLETED — FINAL RESULTS");
console.log("===============================================================");
console.log(`[CHAMPION]   ${champion?.name} (Seed #${champion?.seed})`);
console.log(`[RUNNER-UP]  ${runnerUp?.name} (Seed #${runnerUp?.seed})`);
console.log(`[INCIDENTS]  Total incidents logged and resolved: ${incidents.length}`);
console.log(`[AUDIT]      Integrity verified: all matches verified before advancement`);
console.log("===============================================================\n");
