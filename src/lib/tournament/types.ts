export type TournamentStatus =
  | "DRAFT"
  | "READY"
  | "FINALIZED"
  | "LIVE"
  | "COMPLETED"
  | "ARCHIVED";

export type TournamentFormat =
  | "SINGLE_ELIMINATION"
  | "ROUND_ROBIN"
  | "GROUP_STAGE_KNOCKOUT";

export type MatchStatus =
  | "SCHEDULED"
  | "CALLED"
  | "READY"
  | "LOBBY_READY"
  | "LIVE"
  | "PAUSED"
  | "FINISHED"
  | "RESULT_PENDING"
  | "VERIFIED"
  | "CANCELLED"
  | "FORFEIT";

export type MatchSlot = "TEAM_A" | "TEAM_B";

export interface Participant {
  id: string;
  name: string;
  seed?: number;
  institution?: string;
  isBye?: boolean;
}

export interface BracketMatch {
  id: string;
  roundNumber: number;
  roundName: string;
  matchNumber: number;
  code: string;
  teamA?: Participant;
  teamB?: Participant;
  winnerId?: string;
  loserId?: string;
  isBye: boolean;
  nextMatchId?: string;
  nextMatchSlot?: MatchSlot;
  sourceMatchAId?: string;
  sourceMatchBId?: string;
  status: MatchStatus;
}

export interface BracketRound {
  roundNumber: number;
  name: string;
  matches: BracketMatch[];
}

export interface BracketStructure {
  bracketSize: number;
  totalRounds: number;
  totalBYEs: number;
  rounds: BracketRound[];
}
