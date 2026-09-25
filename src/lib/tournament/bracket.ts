import {
  BracketMatch,
  BracketRound,
  BracketStructure,
  Participant,
  MatchSlot,
} from "./types";

/**
 * Returns the round name based on total rounds and current round index (1-based)
 */
export function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsRemaining = totalRounds - roundNumber + 1;
  switch (roundsRemaining) {
    case 1:
      return "Grand Finals";
    case 2:
      return "Semifinals";
    case 3:
      return "Quarterfinals";
    case 4:
      return "Round of 16";
    case 5:
      return "Round of 32";
    case 6:
      return "Round of 64";
    default:
      return `Round ${roundNumber}`;
  }
}

/**
 * Generates the seed sequence for standard tournament bracket pairing
 * guaranteeing that top seeds only meet in designated late rounds.
 */
export function generateSeedOrder(bracketSize: number): number[] {
  if (bracketSize < 2 || (bracketSize & (bracketSize - 1)) !== 0) {
    throw new Error(`Bracket size must be a power of 2, received ${bracketSize}`);
  }

  let order: number[] = [1, 2];
  while (order.length < bracketSize) {
    const nextSize = order.length * 2;
    const nextOrder: number[] = [];
    for (const seed of order) {
      nextOrder.push(seed);
      nextOrder.push(nextSize + 1 - seed);
    }
    order = nextOrder;
  }
  return order;
}

/**
 * Generates a complete single elimination bracket structure for N participants.
 */
export function generateSingleEliminationBracket(
  participants: Participant[]
): BracketStructure {
  const n = participants.length;
  if (n < 2) {
    throw new Error("A tournament requires at least 2 participants.");
  }

  // Calculate bracket size B = next power of 2 >= n
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(n)));
  const totalRounds = Math.log2(bracketSize);
  const totalBYEs = bracketSize - n;

  // Sort participants by seed (or by existing order if seeds are absent/partial)
  const sortedParticipants = [...participants].sort((a, b) => {
    const seedA = a.seed ?? 9999;
    const seedB = b.seed ?? 9999;
    return seedA - seedB;
  });

  // Assign seeds 1..n if not already explicitly assigned
  const seededParticipants: (Participant | null)[] = new Array(bracketSize).fill(null);
  
  // Seed order mapping: seed number -> participant
  // Seed 1..n map to participants 0..(n-1)
  // Seeds (n+1)..bracketSize represent BYEs
  const seedToParticipantMap = new Map<number, Participant>();
  sortedParticipants.forEach((p, idx) => {
    const assignedSeed = idx + 1;
    seedToParticipantMap.set(assignedSeed, {
      ...p,
      seed: p.seed ?? assignedSeed,
    });
  });

  const seedSlots = generateSeedOrder(bracketSize);
  for (let i = 0; i < bracketSize; i++) {
    const seed = seedSlots[i];
    if (seed <= n) {
      seededParticipants[i] = seedToParticipantMap.get(seed) || null;
    } else {
      seededParticipants[i] = null; // BYE slot
    }
  }

  const rounds: BracketRound[] = [];
  let globalMatchCounter = 1;

  // Build rounds from Round 1 to Grand Finals
  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRound = bracketSize / Math.pow(2, r);
    const roundName = getRoundName(r, totalRounds);
    const matches: BracketMatch[] = [];

    for (let m = 1; m <= matchesInRound; m++) {
      const matchId = `match-r${r}-m${m}`;
      const code = `M${String(globalMatchCounter).padStart(2, "0")}`;
      globalMatchCounter++;

      const bracketMatch: BracketMatch = {
        id: matchId,
        roundNumber: r,
        roundName,
        matchNumber: m,
        code,
        status: "SCHEDULED",
        isBye: false,
      };

      matches.push(bracketMatch);
    }

    rounds.push({
      roundNumber: r,
      name: roundName,
      matches,
    });
  }

  // Connect DAG nodes (nextMatchId, nextMatchSlot, sourceMatchAId, sourceMatchBId)
  for (let r = 1; r < totalRounds; r++) {
    const currentRound = rounds[r - 1];
    const nextRound = rounds[r];

    for (let m = 0; m < currentRound.matches.length; m++) {
      const currentMatch = currentRound.matches[m];
      const targetMatchIndex = Math.floor(m / 2);
      const targetMatch = nextRound.matches[targetMatchIndex];
      const targetSlot: MatchSlot = m % 2 === 0 ? "TEAM_A" : "TEAM_B";

      currentMatch.nextMatchId = targetMatch.id;
      currentMatch.nextMatchSlot = targetSlot;

      if (targetSlot === "TEAM_A") {
        targetMatch.sourceMatchAId = currentMatch.id;
      } else {
        targetMatch.sourceMatchBId = currentMatch.id;
      }
    }
  }

  // Populate Round 1 participants from seeded slots
  const round1 = rounds[0];
  for (let m = 0; m < round1.matches.length; m++) {
    const match = round1.matches[m];
    const teamA = seededParticipants[m * 2] || undefined;
    const teamB = seededParticipants[m * 2 + 1] || undefined;

    match.teamA = teamA;
    match.teamB = teamB;

    // Check for BYE
    if (teamA && !teamB) {
      match.isBye = true;
      match.status = "VERIFIED";
      match.winnerId = teamA.id;
      // Auto-advance to Round 2
      if (match.nextMatchId && match.nextMatchSlot) {
        const nextMatch = rounds[1].matches.find((nm) => nm.id === match.nextMatchId);
        if (nextMatch) {
          if (match.nextMatchSlot === "TEAM_A") {
            nextMatch.teamA = teamA;
          } else {
            nextMatch.teamB = teamA;
          }
        }
      }
    } else if (!teamA && teamB) {
      match.isBye = true;
      match.status = "VERIFIED";
      match.winnerId = teamB.id;
      if (match.nextMatchId && match.nextMatchSlot) {
        const nextMatch = rounds[1].matches.find((nm) => nm.id === match.nextMatchId);
        if (nextMatch) {
          if (match.nextMatchSlot === "TEAM_A") {
            nextMatch.teamA = teamB;
          } else {
            nextMatch.teamB = teamB;
          }
        }
      }
    }
  }

  return {
    bracketSize,
    totalRounds,
    totalBYEs,
    rounds,
  };
}

/**
 * Pure function to calculate bracket winner advancement when a match result is verified.
 */
export function advanceBracketWinner(
  bracket: BracketStructure,
  matchId: string,
  winnerId: string
): BracketStructure {
  // Deep clone to avoid mutating input
  const updatedRounds: BracketRound[] = JSON.parse(JSON.stringify(bracket.rounds));

  let targetMatch: BracketMatch | undefined;
  for (const r of updatedRounds) {
    const found = r.matches.find((m) => m.id === matchId);
    if (found) {
      targetMatch = found;
      break;
    }
  }

  if (!targetMatch) {
    throw new Error(`Match ${matchId} not found in bracket`);
  }

  targetMatch.status = "VERIFIED";
  targetMatch.winnerId = winnerId;
  const winner =
    targetMatch.teamA?.id === winnerId
      ? targetMatch.teamA
      : targetMatch.teamB?.id === winnerId
      ? targetMatch.teamB
      : undefined;

  if (!winner) {
    throw new Error(`Winner ${winnerId} is not a participant in match ${matchId}`);
  }

  if (targetMatch.nextMatchId && targetMatch.nextMatchSlot) {
    for (const r of updatedRounds) {
      const nextMatch = r.matches.find((m) => m.id === targetMatch!.nextMatchId);
      if (nextMatch) {
        if (targetMatch.nextMatchSlot === "TEAM_A") {
          nextMatch.teamA = winner;
        } else {
          nextMatch.teamB = winner;
        }
        break;
      }
    }
  }

  return {
    ...bracket,
    rounds: updatedRounds,
  };
}
