export type PCStatus =
  | "AVAILABLE"
  | "ASSIGNED"
  | "IN_USE"
  | "OFFLINE"
  | "MAINTENANCE"
  | "TECHNICAL_ISSUE"
  | "RESERVED";

export interface DomainPC {
  id: string;
  pcNumber: string;
  labId: string;
  stationId?: string | null;
  status: PCStatus;
  notes?: string;
}

export interface DomainStation {
  id: string;
  name: string;
  labId: string;
  labName?: string;
  requiredPCs: number; // default: 10 for standard VALORANT 5v5
  pcs: DomainPC[];
  isOperational: boolean;
  workingPcCount: number;
}

export interface DomainLab {
  id: string;
  name: string;
  totalPcs: number;
  stations: DomainStation[];
  operationalStationsCount: number;
  workingPcCount: number;
}

export interface VenueCapacityMetrics {
  totalLabs: number;
  totalConfiguredPCs: number;
  totalWorkingPCs: number;
  totalOfflinePCs: number;
  totalStations: number;
  operationalStations: number;
  maxSimultaneousMatches: number;
  details: {
    labId: string;
    labName: string;
    totalPcs: number;
    workingPcs: number;
    operationalStations: number;
    configuredStations: number;
  }[];
}

export interface ScheduledFixture {
  matchId: string;
  roundNumber: number;
  roundName: string;
  matchCode: string;
  teamAId?: string;
  teamAName: string;
  teamBId?: string;
  teamBName: string;
  isBye: boolean;
  stationId?: string;
  stationName?: string;
  labId?: string;
  labName?: string;
  startTime: string; // ISO
  estimatedEndTime: string; // ISO
  status: string;
}

export interface SchedulingOptions {
  tournamentStartTime: Date | string;
  matchDurationMinutes?: number; // default: 45
  bufferDurationMinutes?: number; // default: 15
}

export interface SchedulingResult {
  fixtures: ScheduledFixture[];
  totalMatchesScheduled: number;
  simultaneousStationCapacity: number;
  estimatedTournamentEndTime: string;
  conflicts: string[];
}
