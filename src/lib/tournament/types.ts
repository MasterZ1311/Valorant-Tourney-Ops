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

export type TiebreakerRule =
  | "POINTS"
  | "HEAD_TO_HEAD"
  | "ROUND_DIFFERENTIAL"
  | "ROUNDS_WON"
  | "SUDDEN_DEATH";

export interface TeamStanding {
  rank: number;
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  regulationWins: number;
  otWins: number;
  losses: number;
  points: number;
  roundsWon: number;
  roundsLost: number;
  roundDifferential: number;
  headToHeadWins?: number;
  tiebreakerReason?: string;
  team?: Participant;
}

export interface RoundRobinMatch {
  id: string;
  roundNumber: number;
  roundName: string;
  matchNumber: number;
  code: string;
  teamA?: Participant;
  teamB?: Participant;
  winnerId?: string;
  loserId?: string;
  scoreA?: number;
  scoreB?: number;
  isOvertime?: boolean;
  isBye: boolean;
  status: MatchStatus;
  groupId?: string;
}

export interface RoundRobinRound {
  roundNumber: number;
  name: string;
  matches: RoundRobinMatch[];
}

export interface RoundRobinStructure {
  totalRounds: number;
  totalMatches: number;
  rounds: RoundRobinRound[];
  standings?: TeamStanding[];
}

export interface TournamentGroup {
  id: string;
  name: string;
  teams: Participant[];
  rounds: RoundRobinRound[];
  standings?: TeamStanding[];
}

export interface KnockoutAdvancement {
  groupId: string;
  groupName: string;
  groupRank: number;
  team: Participant;
  knockoutSeed: number;
  targetMatchId?: string;
  targetMatchSlot?: MatchSlot;
}

export interface GroupStageStructure {
  groupCount: number;
  groups: TournamentGroup[];
  totalRounds: number;
  totalMatches: number;
  advancement: KnockoutAdvancement[];
  knockoutBracket?: BracketStructure;
}

