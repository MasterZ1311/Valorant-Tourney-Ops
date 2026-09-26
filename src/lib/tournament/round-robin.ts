import {
  Participant,
  RoundRobinMatch,
  RoundRobinRound,
  RoundRobinStructure,
  TeamStanding,
} from "./types";

/**
 * Generates round robin fixtures for any number of participants (even or odd)
 * using the Berger Cyclic Pairing Algorithm with balanced home and away sides.
 */
export function generateRoundRobinFixtures(
  participants: Participant[]
): RoundRobinStructure {
  const n = participants.length;
  if (n < 2) {
    throw new Error("Round Robin requires at least 2 participants.");
  }

  // Clone participants and preserve seeds or assign sequential seed numbers
  const list: Participant[] = participants.map((p, idx) => ({
    ...p,
    seed: p.seed ?? idx + 1,
  }));

  // If odd number of teams, introduce a dummy BYE participant at index 0
  const isOdd = list.length % 2 !== 0;
  if (isOdd) {
    list.unshift({
      id: "__BYE__",
      name: "BYE",
      isBye: true,
    });
  }

  const numTeams = list.length; // Always even now
  const totalRounds = numTeams - 1;
  const matchesPerRound = numTeams / 2;
  const totalPlayableMatches = (n * (n - 1)) / 2;

  const rounds: RoundRobinRound[] = [];
  const currentList = [...list];
  let globalMatchCounter = 1;

  for (let r = 0; r < totalRounds; r++) {
    const roundNumber = r + 1;
    const roundName = `Round ${roundNumber}`;
    const matches: RoundRobinMatch[] = [];

    for (let i = 0; i < matchesPerRound; i++) {
      const team1 = currentList[i];
      const team2 = currentList[numTeams - 1 - i];

      // Balanced home/away assignment:
      // For fixed pivot team (i === 0):
      // Even rounds: pivot is home. Odd rounds: rotating team is home.
      // For other pairs (i > 0):
      // Odd pair indices: team1 is home. Even pair indices: team2 is home.
      let home: Participant;
      let away: Participant;

      if (i === 0) {
        if (r % 2 === 0) {
          home = team1;
          away = team2;
        } else {
          home = team2;
          away = team1;
        }
      } else {
        if (i % 2 === 1) {
          home = team1;
          away = team2;
        } else {
          home = team2;
          away = team1;
        }
      }

      const matchId = `match-rr-r${roundNumber}-m${i + 1}`;
      const code = `RR-R${roundNumber}-M${i + 1}`;

      // Check if one participant is the dummy BYE
      if (home.isBye || away.isBye) {
        const activeTeam = home.isBye ? away : home;
        matches.push({
          id: matchId,
          roundNumber,
          roundName,
          matchNumber: i + 1,
          code,
          teamA: activeTeam,
          teamB: undefined,
          winnerId: activeTeam.id,
          isBye: true,
          status: "VERIFIED",
        });
      } else {
        matches.push({
          id: matchId,
          roundNumber,
          roundName,
          matchNumber: i + 1,
          code,
          teamA: home,
          teamB: away,
          isBye: false,
          status: "SCHEDULED",
        });
        globalMatchCounter++;
      }
    }

    rounds.push({
      roundNumber,
      name: roundName,
      matches,
    });

    // Berger cyclic rotation: fix element 0, rotate elements 1..numTeams-1 clockwise
    const last = currentList.pop()!;
    currentList.splice(1, 0, last);
  }

  return {
    totalRounds,
    totalMatches: totalPlayableMatches,
    rounds,
  };
}

/**
 * Resolves ties between teams using:
 * 1. Head-to-Head match result / mini-league
 * 2. Round differential (roundsWon - roundsLost)
 * 3. Total rounds won
 * 4. Lower seed number
 */
function resolveTies(
  tiedTeams: TeamStanding[],
  matches: RoundRobinMatch[]
): TeamStanding[] {
  if (tiedTeams.length <= 1) return tiedTeams;

  // 2-team tie resolution
  if (tiedTeams.length === 2) {
    const [teamA, teamB] = tiedTeams;

    // Find direct head-to-head match
    const h2hMatch = matches.find(
      (m) =>
        !m.isBye &&
        ((m.teamA?.id === teamA.teamId && m.teamB?.id === teamB.teamId) ||
          (m.teamA?.id === teamB.teamId && m.teamB?.id === teamA.teamId))
    );

    if (h2hMatch) {
      let winnerId = h2hMatch.winnerId;
      if (!winnerId && h2hMatch.scoreA !== undefined && h2hMatch.scoreB !== undefined) {
        if (h2hMatch.scoreA > h2hMatch.scoreB) {
          winnerId = h2hMatch.teamA?.id;
        } else if (h2hMatch.scoreB > h2hMatch.scoreA) {
          winnerId = h2hMatch.teamB?.id;
        }
      }

      if (winnerId === teamA.teamId) {
        teamA.headToHeadWins = (teamA.headToHeadWins ?? 0) + 1;
        teamA.tiebreakerReason = `Head-to-head win over ${teamB.teamName}`;
        teamB.tiebreakerReason = `Head-to-head loss to ${teamA.teamName}`;
        return [teamA, teamB];
      } else if (winnerId === teamB.teamId) {
        teamB.headToHeadWins = (teamB.headToHeadWins ?? 0) + 1;
        teamB.tiebreakerReason = `Head-to-head win over ${teamA.teamName}`;
        teamA.tiebreakerReason = `Head-to-head loss to ${teamB.teamName}`;
        return [teamB, teamA];
      }
    }

    // Tiebreaker 2: Round Differential
    if (teamA.roundDifferential !== teamB.roundDifferential) {
      if (teamA.roundDifferential > teamB.roundDifferential) {
        teamA.tiebreakerReason = `Round differential (${teamA.roundDifferential > 0 ? "+" : ""}${teamA.roundDifferential} vs ${teamB.roundDifferential > 0 ? "+" : ""}${teamB.roundDifferential})`;
        return [teamA, teamB];
      } else {
        teamB.tiebreakerReason = `Round differential (${teamB.roundDifferential > 0 ? "+" : ""}${teamB.roundDifferential} vs ${teamA.roundDifferential > 0 ? "+" : ""}${teamA.roundDifferential})`;
        return [teamB, teamA];
      }
    }

    // Tiebreaker 3: Total Rounds Won
    if (teamA.roundsWon !== teamB.roundsWon) {
      if (teamA.roundsWon > teamB.roundsWon) {
        teamA.tiebreakerReason = `Total rounds won (${teamA.roundsWon} vs ${teamB.roundsWon})`;
        return [teamA, teamB];
      } else {
        teamB.tiebreakerReason = `Total rounds won (${teamB.roundsWon} vs ${teamA.roundsWon})`;
        return [teamB, teamA];
      }
    }

    // Tiebreaker 4: Seed
    const seedA = teamA.team?.seed ?? 999;
    const seedB = teamB.team?.seed ?? 999;
    if (seedA !== seedB) {
      return seedA < seedB ? [teamA, teamB] : [teamB, teamA];
    }

    return teamA.teamId.localeCompare(teamB.teamId) < 0 ? [teamA, teamB] : [teamB, teamA];
  }

  // 3+ teams tied on points: Mini-league comparison
  const tiedIds = new Set(tiedTeams.map((t) => t.teamId));
  const miniLeaguePoints = new Map<string, number>();

  for (const t of tiedTeams) {
    miniLeaguePoints.set(t.teamId, 0);
  }

  for (const m of matches) {
    if (
      !m.isBye &&
      m.teamA &&
      m.teamB &&
      tiedIds.has(m.teamA.id) &&
      tiedIds.has(m.teamB.id)
    ) {
      let winnerId = m.winnerId;
      if (!winnerId && m.scoreA !== undefined && m.scoreB !== undefined) {
        if (m.scoreA > m.scoreB) winnerId = m.teamA.id;
        else if (m.scoreB > m.scoreA) winnerId = m.teamB.id;
      }
      const isOT =
        Boolean(m.isOvertime) ||
        (m.scoreA !== undefined &&
          m.scoreB !== undefined &&
          (m.scoreA > 13 || m.scoreB > 13 || (m.scoreA >= 13 && m.scoreB >= 12)));
      const winPoints = isOT ? 1 : 3;

      if (winnerId) {
        miniLeaguePoints.set(
          winnerId,
          (miniLeaguePoints.get(winnerId) ?? 0) + winPoints
        );
      }
    }
  }

  // Check if mini-league points split the tie
  const ptsValues = tiedTeams.map((t) => miniLeaguePoints.get(t.teamId) ?? 0);
  const minPts = Math.min(...ptsValues);
  const maxPts = Math.max(...ptsValues);

  if (minPts !== maxPts) {
    const groupsByPts = new Map<number, TeamStanding[]>();
    for (const t of tiedTeams) {
      const pts = miniLeaguePoints.get(t.teamId) ?? 0;
      if (!groupsByPts.has(pts)) groupsByPts.set(pts, []);
      groupsByPts.get(pts)!.push(t);
    }
    const sortedPts = Array.from(groupsByPts.keys()).sort((a, b) => b - a);
    const result: TeamStanding[] = [];
    for (const pts of sortedPts) {
      const group = groupsByPts.get(pts)!;
      for (const t of group) {
        t.tiebreakerReason = `Head-to-head mini-league (${pts} pts)`;
      }
      result.push(...resolveTies(group, matches));
    }
    return result;
  }

  // If mini-league points are all equal, compare overall round differential
  const diffValues = tiedTeams.map((t) => t.roundDifferential);
  if (Math.min(...diffValues) !== Math.max(...diffValues)) {
    const groupsByDiff = new Map<number, TeamStanding[]>();
    for (const t of tiedTeams) {
      if (!groupsByDiff.has(t.roundDifferential)) {
        groupsByDiff.set(t.roundDifferential, []);
      }
      groupsByDiff.get(t.roundDifferential)!.push(t);
    }
    const sortedDiffs = Array.from(groupsByDiff.keys()).sort((a, b) => b - a);
    const result: TeamStanding[] = [];
    for (const diff of sortedDiffs) {
      const group = groupsByDiff.get(diff)!;
      for (const t of group) {
        t.tiebreakerReason = `Round differential (${diff > 0 ? "+" : ""}${diff})`;
      }
      result.push(...resolveTies(group, matches));
    }
    return result;
  }

  // If round differentials are equal, compare total rounds won
  const wonValues = tiedTeams.map((t) => t.roundsWon);
  if (Math.min(...wonValues) !== Math.max(...wonValues)) {
    const groupsByWon = new Map<number, TeamStanding[]>();
    for (const t of tiedTeams) {
      if (!groupsByWon.has(t.roundsWon)) {
        groupsByWon.set(t.roundsWon, []);
      }
      groupsByWon.get(t.roundsWon)!.push(t);
    }
    const sortedWons = Array.from(groupsByWon.keys()).sort((a, b) => b - a);
    const result: TeamStanding[] = [];
    for (const won of sortedWons) {
      const group = groupsByWon.get(won)!;
      for (const t of group) {
        t.tiebreakerReason = `Total rounds won (${won})`;
      }
      result.push(...resolveTies(group, matches));
    }
    return result;
  }

  // Fallback to seed
  return [...tiedTeams].sort((a, b) => {
    const seedA = a.team?.seed ?? 999;
    const seedB = b.team?.seed ?? 999;
    if (seedA !== seedB) return seedA - seedB;
    return a.teamId.localeCompare(b.teamId);
  });
}

/**
 * Calculates complete Round Robin standings from played/verified matches.
 * Points:
 * - 3 points for regulation win (e.g. 13-0 to 13-11)
 * - 1 point for overtime win (e.g. 14-12, 15-13)
 * - 0 points for loss
 *
 * Tiebreaker sequence:
 * 1. Points
 * 2. Head-to-Head
 * 3. Round Differential (roundsWon - roundsLost)
 * 4. Total Rounds Won
 * 5. Tournament Seed
 */
export function calculateRoundRobinStandings(
  matches: RoundRobinMatch[],
  participants: Participant[]
): TeamStanding[] {
  // Exclude dummy BYE team from standings
  const realParticipants = participants.filter(
    (p) => !p.isBye && p.id !== "__BYE__"
  );

  const standingsMap = new Map<string, TeamStanding>();
  for (const p of realParticipants) {
    standingsMap.set(p.id, {
      rank: 0,
      teamId: p.id,
      teamName: p.name,
      played: 0,
      wins: 0,
      regulationWins: 0,
      otWins: 0,
      losses: 0,
      points: 0,
      roundsWon: 0,
      roundsLost: 0,
      roundDifferential: 0,
      team: p,
    });
  }

  // Process all played matches
  for (const match of matches) {
    if (match.isBye || !match.teamA || !match.teamB) {
      continue;
    }

    const isPlayed =
      match.status === "VERIFIED" ||
      match.status === "FINISHED" ||
      match.winnerId !== undefined ||
      (match.scoreA !== undefined && match.scoreB !== undefined);

    if (!isPlayed) continue;

    const teamAStanding = match.teamA ? standingsMap.get(match.teamA.id) : undefined;
    const teamBStanding = match.teamB ? standingsMap.get(match.teamB.id) : undefined;

    if (!teamAStanding && !teamBStanding) continue;

    const scoreA = match.scoreA ?? 0;
    const scoreB = match.scoreB ?? 0;

    let winnerId = match.winnerId;
    if (!winnerId) {
      if (scoreA > scoreB) winnerId = match.teamA?.id;
      else if (scoreB > scoreA) winnerId = match.teamB?.id;
    }

    const isOT =
      Boolean(match.isOvertime) ||
      (match.scoreA !== undefined &&
        match.scoreB !== undefined &&
        (match.scoreA > 13 ||
          match.scoreB > 13 ||
          (match.scoreA >= 13 && match.scoreB >= 12)));

    const winPoints = isOT ? 1 : 3;

    if (teamAStanding) {
      teamAStanding.played += 1;
      teamAStanding.roundsWon += scoreA;
      teamAStanding.roundsLost += scoreB;
      if (winnerId === match.teamA?.id) {
        teamAStanding.wins += 1;
        teamAStanding.points += winPoints;
        if (isOT) teamAStanding.otWins += 1;
        else teamAStanding.regulationWins += 1;
      } else if (winnerId) {
        teamAStanding.losses += 1;
      }
    }

    if (teamBStanding) {
      teamBStanding.played += 1;
      teamBStanding.roundsWon += scoreB;
      teamBStanding.roundsLost += scoreA;
      if (winnerId === match.teamB?.id) {
        teamBStanding.wins += 1;
        teamBStanding.points += winPoints;
        if (isOT) teamBStanding.otWins += 1;
        else teamBStanding.regulationWins += 1;
      } else if (winnerId) {
        teamBStanding.losses += 1;
      }
    }
  }

  // Update round differential
  for (const standing of Array.from(standingsMap.values())) {
    standing.roundDifferential = standing.roundsWon - standing.roundsLost;
  }

  // Group standings by points
  const pointsGroups = new Map<number, TeamStanding[]>();
  for (const standing of Array.from(standingsMap.values())) {
    if (!pointsGroups.has(standing.points)) {
      pointsGroups.set(standing.points, []);
    }
    pointsGroups.get(standing.points)!.push(standing);
  }

  // Sort point groups descending
  const sortedPoints = Array.from(pointsGroups.keys()).sort((a, b) => b - a);
  const orderedStandings: TeamStanding[] = [];

  for (const pts of sortedPoints) {
    const group = pointsGroups.get(pts)!;
    const resolvedGroup = resolveTies(group, matches);
    orderedStandings.push(...resolvedGroup);
  }

  // Assign ranks 1..N
  return orderedStandings.map((s, idx) => ({
    ...s,
    rank: idx + 1,
  }));
}
