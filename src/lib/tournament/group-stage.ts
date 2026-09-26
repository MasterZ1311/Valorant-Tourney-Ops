import {
  BracketStructure,
  GroupStageStructure,
  KnockoutAdvancement,
  MatchSlot,
  Participant,
  TeamStanding,
  TournamentGroup,
} from "./types";
import { generateRoundRobinFixtures, calculateRoundRobinStandings } from "./round-robin";
import { generateSingleEliminationBracket } from "./bracket";

export interface KnockoutAdvancementResult extends Array<KnockoutAdvancement> {
  advancement: KnockoutAdvancement[];
  bracket: BracketStructure;
}

/**
 * Generates group stage tournament structure with snake seeding across pots
 * and internal round-robin fixture generation for each group.
 */
export function generateGroupStage(
  participants: Participant[],
  groupCount: number = 4
): GroupStageStructure {
  if (groupCount < 2) {
    throw new Error("Group stage requires at least 2 groups.");
  }

  if (participants.length < groupCount * 2) {
    throw new Error(
      `Group stage requires at least 2 teams per group (${groupCount * 2} participants for ${groupCount} groups).`
    );
  }

  // Sort participants by seed (or current order)
  const sortedParticipants = [...participants].sort((a, b) => {
    const seedA = a.seed ?? 9999;
    const seedB = b.seed ?? 9999;
    return seedA - seedB;
  });

  // Assign sequential seeds 1..N if seeds are missing or duplicated
  const seededParticipants: Participant[] = sortedParticipants.map((p, idx) => ({
    ...p,
    seed: p.seed ?? idx + 1,
  }));

  // Initialize group arrays
  const groupTeams: Participant[][] = Array.from({ length: groupCount }, () => []);

  // Snake seeding distribution across pots
  for (let i = 0; i < seededParticipants.length; i++) {
    const potIndex = Math.floor(i / groupCount);
    const isReverse = potIndex % 2 === 1;
    const potOffset = i % groupCount;
    const targetGroupIndex = isReverse
      ? groupCount - 1 - potOffset
      : potOffset;

    groupTeams[targetGroupIndex].push(seededParticipants[i]);
  }

  const groups: TournamentGroup[] = [];
  let totalMatches = 0;
  let maxRoundsInAnyGroup = 0;

  for (let g = 0; g < groupCount; g++) {
    const groupLetter = String.fromCharCode(65 + g); // A, B, C, D...
    const groupId = `group-${groupLetter.toLowerCase()}`;
    const groupName = `Group ${groupLetter}`;
    const teams = groupTeams[g];

    // Generate internal round-robin fixtures
    const rrStructure = generateRoundRobinFixtures(teams);

    // Prefix match codes and IDs with group designation for global uniqueness
    const groupRounds = rrStructure.rounds.map((round) => ({
      ...round,
      name: `${groupName} - ${round.name}`,
      matches: round.matches.map((m) => ({
        ...m,
        id: `${groupId}-${m.id}`,
        code: `G${groupLetter}-${m.code}`,
        groupId,
      })),
    }));

    totalMatches += rrStructure.totalMatches;
    if (rrStructure.totalRounds > maxRoundsInAnyGroup) {
      maxRoundsInAnyGroup = rrStructure.totalRounds;
    }

    groups.push({
      id: groupId,
      name: groupName,
      teams,
      rounds: groupRounds,
    });
  }

  return {
    groupCount,
    groups,
    totalRounds: maxRoundsInAnyGroup,
    totalMatches,
    advancement: [],
  };
}

/**
 * Calculates standings for each tournament group based on completed/verified match results.
 */
export function calculateGroupStandings(
  groups: TournamentGroup[]
): TournamentGroup[] {
  // Deep clone groups to remain pure
  const updatedGroups: TournamentGroup[] = JSON.parse(JSON.stringify(groups));

  for (const group of updatedGroups) {
    const allMatches = group.rounds.flatMap((r) => r.matches);
    const standings = calculateRoundRobinStandings(allMatches, group.teams);
    group.standings = standings;
  }

  return updatedGroups;
}

interface NormalizedGroupStanding {
  groupId: string;
  groupName: string;
  standings: TeamStanding[];
}

/**
 * Generates crossover knockout advancement from group standings into a Single Elimination bracket.
 * Standard crossover ensures top seeds from the same group are placed in opposite bracket halves:
 * - 4 Groups (8-team Knockout):
 *   Match 1: Group A 1st vs Group B 2nd
 *   Match 2: Group C 1st vs Group D 2nd
 *   Match 3: Group B 1st vs Group A 2nd
 *   Match 4: Group D 1st vs Group C 2nd
 * - 2 Groups (4-team Knockout):
 *   Match 1: Group A 1st vs Group B 2nd
 *   Match 2: Group B 1st vs Group A 2nd
 */
export function generateKnockoutAdvancement(
  input:
    | TournamentGroup[]
    | Record<string, TeamStanding[]>
    | Map<string, TeamStanding[]>
    | TeamStanding[][]
): KnockoutAdvancementResult {
  const normalized: NormalizedGroupStanding[] = [];

  if (Array.isArray(input)) {
    if (input.length > 0 && "teams" in input[0]) {
      // Input is TournamentGroup[]
      const groups = input as TournamentGroup[];
      for (let i = 0; i < groups.length; i++) {
        const g = groups[i];
        const groupLetter = String.fromCharCode(65 + i);
        const standings =
          g.standings && g.standings.length > 0
            ? g.standings
            : calculateRoundRobinStandings(
                g.rounds.flatMap((r) => r.matches),
                g.teams
              );
        normalized.push({
          groupId: g.id || `group-${groupLetter.toLowerCase()}`,
          groupName: g.name || `Group ${groupLetter}`,
          standings,
        });
      }
    } else {
      // Input is TeamStanding[][]
      const standingArrays = input as TeamStanding[][];
      for (let i = 0; i < standingArrays.length; i++) {
        const groupLetter = String.fromCharCode(65 + i);
        normalized.push({
          groupId: `group-${groupLetter.toLowerCase()}`,
          groupName: `Group ${groupLetter}`,
          standings: standingArrays[i],
        });
      }
    }
  } else if (input instanceof Map) {
    let i = 0;
    for (const [key, standings] of Array.from(input.entries())) {
      const groupLetter = String.fromCharCode(65 + i);
      normalized.push({
        groupId: key,
        groupName: `Group ${groupLetter}`,
        standings,
      });
      i++;
    }
  } else {
    // Record<string, TeamStanding[]>
    let i = 0;
    for (const [key, standings] of Object.entries(input)) {
      const groupLetter = String.fromCharCode(65 + i);
      normalized.push({
        groupId: key,
        groupName: `Group ${groupLetter}`,
        standings,
      });
      i++;
    }
  }

  if (normalized.length < 2) {
    throw new Error("Knockout advancement requires at least 2 groups.");
  }

  // Ensure each group has at least 2 teams to advance
  for (const group of normalized) {
    if (group.standings.length < 2) {
      throw new Error(
        `Group ${group.groupName} does not have at least 2 teams for knockout advancement.`
      );
    }
  }

  let knockoutParticipants: Participant[] = [];
  const advancements: KnockoutAdvancement[] = [];

  if (normalized.length === 4) {
    // 4 Groups -> 8 teams crossover
    const gA = normalized[0];
    const gB = normalized[1];
    const gC = normalized[2];
    const gD = normalized[3];

    const a1 = gA.standings[0].team || { id: gA.standings[0].teamId, name: gA.standings[0].teamName };
    const a2 = gA.standings[1].team || { id: gA.standings[1].teamId, name: gA.standings[1].teamName };

    const b1 = gB.standings[0].team || { id: gB.standings[0].teamId, name: gB.standings[0].teamName };
    const b2 = gB.standings[1].team || { id: gB.standings[1].teamId, name: gB.standings[1].teamName };

    const c1 = gC.standings[0].team || { id: gC.standings[0].teamId, name: gC.standings[0].teamName };
    const c2 = gC.standings[1].team || { id: gC.standings[1].teamId, name: gC.standings[1].teamName };

    const d1 = gD.standings[0].team || { id: gD.standings[0].teamId, name: gD.standings[0].teamName };
    const d2 = gD.standings[1].team || { id: gD.standings[1].teamId, name: gD.standings[1].teamName };

    // Standard crossover seed assignment into 8-team bracket
    // Seed order for 8 teams: [1, 8, 4, 5, 2, 7, 3, 6]
    // QF 1: Seed 1 (A1) vs Seed 8 (B2)
    // QF 2: Seed 4 (C1) vs Seed 5 (D2)
    // QF 3: Seed 2 (B1) vs Seed 7 (A2)
    // QF 4: Seed 3 (D1) vs Seed 6 (C2)
    knockoutParticipants = [
      { ...a1, seed: 1 },
      { ...b1, seed: 2 },
      { ...d1, seed: 3 },
      { ...c1, seed: 4 },
      { ...d2, seed: 5 },
      { ...c2, seed: 6 },
      { ...a2, seed: 7 },
      { ...b2, seed: 8 },
    ];

    advancements.push(
      { groupId: gA.groupId, groupName: gA.groupName, groupRank: 1, team: a1, knockoutSeed: 1 },
      { groupId: gB.groupId, groupName: gB.groupName, groupRank: 2, team: b2, knockoutSeed: 8 },
      { groupId: gC.groupId, groupName: gC.groupName, groupRank: 1, team: c1, knockoutSeed: 4 },
      { groupId: gD.groupId, groupName: gD.groupName, groupRank: 2, team: d2, knockoutSeed: 5 },
      { groupId: gB.groupId, groupName: gB.groupName, groupRank: 1, team: b1, knockoutSeed: 2 },
      { groupId: gA.groupId, groupName: gA.groupName, groupRank: 2, team: a2, knockoutSeed: 7 },
      { groupId: gD.groupId, groupName: gD.groupName, groupRank: 1, team: d1, knockoutSeed: 3 },
      { groupId: gC.groupId, groupName: gC.groupName, groupRank: 2, team: c2, knockoutSeed: 6 }
    );
  } else if (normalized.length === 2) {
    // 2 Groups -> 4 teams crossover
    const gA = normalized[0];
    const gB = normalized[1];

    const a1 = gA.standings[0].team || { id: gA.standings[0].teamId, name: gA.standings[0].teamName };
    const a2 = gA.standings[1].team || { id: gA.standings[1].teamId, name: gA.standings[1].teamName };

    const b1 = gB.standings[0].team || { id: gB.standings[0].teamId, name: gB.standings[0].teamName };
    const b2 = gB.standings[1].team || { id: gB.standings[1].teamId, name: gB.standings[1].teamName };

    // Seed order for 4 teams: [1, 4, 2, 3]
    // SF 1: Seed 1 (A1) vs Seed 4 (B2)
    // SF 2: Seed 2 (B1) vs Seed 3 (A2)
    knockoutParticipants = [
      { ...a1, seed: 1 },
      { ...b1, seed: 2 },
      { ...a2, seed: 3 },
      { ...b2, seed: 4 },
    ];

    advancements.push(
      { groupId: gA.groupId, groupName: gA.groupName, groupRank: 1, team: a1, knockoutSeed: 1 },
      { groupId: gB.groupId, groupName: gB.groupName, groupRank: 2, team: b2, knockoutSeed: 4 },
      { groupId: gB.groupId, groupName: gB.groupName, groupRank: 1, team: b1, knockoutSeed: 2 },
      { groupId: gA.groupId, groupName: gA.groupName, groupRank: 2, team: a2, knockoutSeed: 3 }
    );
  } else {
    // General N groups (top 2 from each group)
    let currentSeed = 1;
    for (let i = 0; i < normalized.length; i++) {
      const g = normalized[i];
      const t1 = g.standings[0].team || { id: g.standings[0].teamId, name: g.standings[0].teamName };
      const t2 = g.standings[1].team || { id: g.standings[1].teamId, name: g.standings[1].teamName };

      knockoutParticipants.push(
        { ...t1, seed: currentSeed },
        { ...t2, seed: currentSeed + 1 }
      );
      advancements.push(
        { groupId: g.groupId, groupName: g.groupName, groupRank: 1, team: t1, knockoutSeed: currentSeed },
        { groupId: g.groupId, groupName: g.groupName, groupRank: 2, team: t2, knockoutSeed: currentSeed + 1 }
      );
      currentSeed += 2;
    }
  }

  // Generate Single Elimination Bracket DAG
  const bracket = generateSingleEliminationBracket(knockoutParticipants);

  // Map targetMatchId and targetMatchSlot to each advancement entry
  const round1 = bracket.rounds[0];
  for (const adv of advancements) {
    for (const match of round1.matches) {
      if (match.teamA?.id === adv.team.id) {
        adv.targetMatchId = match.id;
        adv.targetMatchSlot = "TEAM_A";
        break;
      } else if (match.teamB?.id === adv.team.id) {
        adv.targetMatchId = match.id;
        adv.targetMatchSlot = "TEAM_B";
        break;
      }
    }
  }

  // Create dual array/object result
  const result = [...advancements] as KnockoutAdvancementResult;
  result.advancement = advancements;
  result.bracket = bracket;

  return result;
}
