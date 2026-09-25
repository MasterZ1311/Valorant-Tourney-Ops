import { MatchStatus, TournamentStatus } from "./types";

export const VALID_TOURNAMENT_TRANSITIONS: Record<TournamentStatus, TournamentStatus[]> = {
  DRAFT: ["READY", "ARCHIVED"],
  READY: ["FINALIZED", "DRAFT", "ARCHIVED"],
  FINALIZED: ["LIVE", "READY", "ARCHIVED"], // READY only via admin unlock
  LIVE: ["COMPLETED", "FINALIZED", "ARCHIVED"],
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
};

export function canTransitionTournament(
  current: TournamentStatus,
  target: TournamentStatus
): boolean {
  return VALID_TOURNAMENT_TRANSITIONS[current]?.includes(target) ?? false;
}

export function validateTournamentTransition(
  current: TournamentStatus,
  target: TournamentStatus
): void {
  if (!canTransitionTournament(current, target)) {
    throw new Error(
      `Illegal tournament status transition from ${current} to ${target}.`
    );
  }
}

export const VALID_MATCH_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  SCHEDULED: ["CALLED", "CANCELLED", "FORFEIT"],
  CALLED: ["READY", "SCHEDULED", "CANCELLED", "FORFEIT"],
  READY: ["LOBBY_READY", "CALLED", "FORFEIT"],
  LOBBY_READY: ["LIVE", "READY", "PAUSED"],
  LIVE: ["PAUSED", "FINISHED"],
  PAUSED: ["LIVE", "CANCELLED", "FORFEIT"],
  FINISHED: ["RESULT_PENDING", "LIVE"],
  RESULT_PENDING: ["VERIFIED", "FINISHED", "LIVE"], // LIVE if disputed/rejected
  VERIFIED: ["RESULT_PENDING"], // only via admin override/correction
  CANCELLED: [],
  FORFEIT: [],
};

export function canTransitionMatch(
  current: MatchStatus,
  target: MatchStatus
): boolean {
  return VALID_MATCH_TRANSITIONS[current]?.includes(target) ?? false;
}

export function validateMatchTransition(
  current: MatchStatus,
  target: MatchStatus
): void {
  if (!canTransitionMatch(current, target)) {
    throw new Error(
      `Illegal match status transition from ${current} to ${target}.`
    );
  }
}
