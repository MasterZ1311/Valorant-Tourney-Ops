import { Participant, MatchStatus } from "./types";

export interface IPLPlayoffMatch {
  id: string;
  code: "Q1" | "EL" | "Q2" | "GF";
  name: string;
  description: string;
  roundNumber: number;
  teamA?: Participant;
  teamB?: Participant;
  sourceDescriptionA: string;
  sourceDescriptionB: string;
  winnerId?: string;
  loserId?: string;
  scoreA?: number;
  scoreB?: number;
  status: MatchStatus;
  stationName?: string;
  labName?: string;
  startTime?: string;
}

export interface IPLPrizeRankings {
  firstPlace?: Participant;   // Champion (Gold Prize)
  secondPlace?: Participant;  // Runner-Up (Silver Prize)
  thirdPlace?: Participant;   // 3rd Place (Bronze Prize)
  fourthPlace?: Participant;  // 4th Place
  isCompleted: boolean;
}

export interface IPLPlayoffStructure {
  tournamentId: string;
  top4Teams: Participant[];
  matches: {
    q1: IPLPlayoffMatch;
    eliminator: IPLPlayoffMatch;
    q2: IPLPlayoffMatch;
    grandFinal: IPLPlayoffMatch;
  };
  rankings: IPLPrizeRankings;
}

/**
 * Generates an IPL / Page Playoff structure for the top 4 teams.
 * 
 * Rules:
 * - Qualifier 1 (Q1): Rank 1 vs Rank 2
 *   - Winner advances directly to the Grand Final.
 *   - Loser drops to Qualifier 2 (gets a second chance).
 * - Eliminator (EL): Rank 3 vs Rank 4
 *   - Winner advances to Qualifier 2.
 *   - Loser is eliminated and finishes in 4th place.
 * - Qualifier 2 (Q2): Loser of Q1 vs Winner of Eliminator
 *   - Winner advances to the Grand Final.
 *   - Loser is eliminated and finishes in 3rd place (Bronze Prize).
 * - Grand Final (GF): Winner of Q1 vs Winner of Q2
 *   - Winner is the Tournament Champion (1st Place / Gold Prize).
 *   - Loser is the Runner-Up (2nd Place / Silver Prize).
 */
export function generateIPLPlayoffs(
  tournamentId: string,
  top4Teams: Participant[]
): IPLPlayoffStructure {
  if (top4Teams.length < 4) {
    throw new Error(
      `IPL Playoffs require exactly 4 qualified teams. Provided: ${top4Teams.length}`
    );
  }

  const [rank1, rank2, rank3, rank4] = top4Teams.slice(0, 4);

  const q1: IPLPlayoffMatch = {
    id: `ipl-${tournamentId}-q1`,
    code: "Q1",
    name: "Qualifier 1",
    description: "Rank 1 vs Rank 2 — Winner to Grand Final, Loser to Qualifier 2",
    roundNumber: 1,
    teamA: rank1,
    teamB: rank2,
    sourceDescriptionA: "Rank 1 Seed",
    sourceDescriptionB: "Rank 2 Seed",
    status: "SCHEDULED",
  };

  const eliminator: IPLPlayoffMatch = {
    id: `ipl-${tournamentId}-el`,
    code: "EL",
    name: "Eliminator",
    description: "Rank 3 vs Rank 4 — Winner to Qualifier 2, Loser finishes 4th Place",
    roundNumber: 1,
    teamA: rank3,
    teamB: rank4,
    sourceDescriptionA: "Rank 3 Seed",
    sourceDescriptionB: "Rank 4 Seed",
    status: "SCHEDULED",
  };

  const q2: IPLPlayoffMatch = {
    id: `ipl-${tournamentId}-q2`,
    code: "Q2",
    name: "Qualifier 2 (Semifinal)",
    description: "Loser of Q1 vs Winner of Eliminator — Winner to Grand Final, Loser finishes 3rd Place",
    roundNumber: 2,
    sourceDescriptionA: "Loser of Qualifier 1",
    sourceDescriptionB: "Winner of Eliminator",
    status: "SCHEDULED",
  };

  const grandFinal: IPLPlayoffMatch = {
    id: `ipl-${tournamentId}-gf`,
    code: "GF",
    name: "Grand Final",
    description: "Winner of Q1 vs Winner of Q2 — Decides 1st Place (Champion) and 2nd Place",
    roundNumber: 3,
    sourceDescriptionA: "Winner of Qualifier 1",
    sourceDescriptionB: "Winner of Qualifier 2",
    status: "SCHEDULED",
  };

  return {
    tournamentId,
    top4Teams: [rank1, rank2, rank3, rank4],
    matches: {
      q1,
      eliminator,
      q2,
      grandFinal,
    },
    rankings: {
      isCompleted: false,
    },
  };
}

/**
 * Records a verified result in the IPL Playoff bracket and deterministically advances teams.
 */
export function advanceIPLPlayoffResult(
  playoffs: IPLPlayoffStructure,
  matchCode: "Q1" | "EL" | "Q2" | "GF",
  winnerId: string,
  scores?: { scoreA: number; scoreB: number }
): IPLPlayoffStructure {
  const updated: IPLPlayoffStructure = JSON.parse(JSON.stringify(playoffs));
  const { matches } = updated;

  let targetMatch: IPLPlayoffMatch;
  if (matchCode === "Q1") targetMatch = matches.q1;
  else if (matchCode === "EL") targetMatch = matches.eliminator;
  else if (matchCode === "Q2") targetMatch = matches.q2;
  else if (matchCode === "GF") targetMatch = matches.grandFinal;
  else throw new Error(`Unknown IPL match code: ${matchCode}`);

  if (!targetMatch.teamA || !targetMatch.teamB) {
    throw new Error(`Cannot verify match ${matchCode} before both teams are determined.`);
  }

  const winner =
    targetMatch.teamA.id === winnerId
      ? targetMatch.teamA
      : targetMatch.teamB.id === winnerId
      ? targetMatch.teamB
      : null;

  if (!winner) {
    throw new Error(`Winner ID ${winnerId} is not a participant in ${matchCode}.`);
  }

  const loser = targetMatch.teamA.id === winner.id ? targetMatch.teamB : targetMatch.teamA;

  targetMatch.winnerId = winner.id;
  targetMatch.loserId = loser.id;
  targetMatch.status = "VERIFIED";
  if (scores) {
    targetMatch.scoreA = scores.scoreA;
    targetMatch.scoreB = scores.scoreB;
  }

  // Bracket Progression Rules
  if (matchCode === "Q1") {
    // Winner of Q1 -> Grand Final Slot A
    matches.grandFinal.teamA = winner;
    // Loser of Q1 -> Qualifier 2 Slot A
    matches.q2.teamA = loser;
  } else if (matchCode === "EL") {
    // Winner of Eliminator -> Qualifier 2 Slot B
    matches.q2.teamB = winner;
    // Loser of Eliminator -> 4th Place
    updated.rankings.fourthPlace = loser;
  } else if (matchCode === "Q2") {
    // Winner of Q2 -> Grand Final Slot B
    matches.grandFinal.teamB = winner;
    // Loser of Q2 -> 3rd Place (Bronze Prize)
    updated.rankings.thirdPlace = loser;
  } else if (matchCode === "GF") {
    // Winner of Grand Final -> 1st Place (Champion)
    updated.rankings.firstPlace = winner;
    // Loser of Grand Final -> 2nd Place (Runner-up)
    updated.rankings.secondPlace = loser;
    updated.rankings.isCompleted = true;
  }

  return updated;
}
