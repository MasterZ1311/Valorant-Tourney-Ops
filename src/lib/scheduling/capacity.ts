import {
  DomainLab,
  DomainPC,
  DomainStation,
  PCStatus,
  VenueCapacityMetrics,
} from "./types";

export const WORKING_PC_STATUSES: Set<PCStatus> = new Set([
  "AVAILABLE",
  "ASSIGNED",
  "IN_USE",
]);

export function isPCWorking(status: PCStatus): boolean {
  return WORKING_PC_STATUSES.has(status);
}

/**
 * Calculates operational health and capacity for a single lab.
 */
export function evaluateLabCapacity(lab: {
  id: string;
  name: string;
  totalPcs: number;
  pcs: DomainPC[];
  stations: {
    id: string;
    name: string;
    requiredPCs?: number;
    pcs?: DomainPC[];
  }[];
}): DomainLab {
  const labPcs = lab.pcs || [];
  const labWorkingPcs = labPcs.filter((p) => isPCWorking(p.status)).length;

  const evaluatedStations: DomainStation[] = lab.stations.map((station) => {
    const requiredPCs = station.requiredPCs ?? 10;
    // Station PCs may be explicitly assigned to this station, or assigned by filter
    const stationPcs =
      station.pcs || labPcs.filter((p) => p.stationId === station.id);

    let workingPcCount: number;
    let isOperational: boolean;

    if (stationPcs.length > 0) {
      // Station has explicit PC assignments
      workingPcCount = stationPcs.filter((p) => isPCWorking(p.status)).length;
      isOperational = workingPcCount >= requiredPCs;
    } else {
      // PCs are maintained at the lab pool level
      // Will be evaluated in aggregate below
      workingPcCount = 0;
      isOperational = false;
    }

    return {
      id: station.id,
      name: station.name,
      labId: lab.id,
      labName: lab.name,
      requiredPCs,
      pcs: stationPcs,
      isOperational,
      workingPcCount,
    };
  });

  // If stations had explicit PCs, count operational stations directly
  const hasExplicitStationAssignments = evaluatedStations.some(
    (s) => s.pcs.length > 0
  );

  let operationalStationsCount = 0;
  if (hasExplicitStationAssignments) {
    operationalStationsCount = evaluatedStations.filter(
      (s) => s.isOperational
    ).length;
  } else {
    // Pool calculation: max possible stations given lab working PCs
    const poolCapacity = Math.floor(labWorkingPcs / 10);
    operationalStationsCount = Math.min(evaluatedStations.length, poolCapacity);
    // Mark the first N stations as operational
    for (let i = 0; i < evaluatedStations.length; i++) {
      evaluatedStations[i].isOperational = i < operationalStationsCount;
      evaluatedStations[i].workingPcCount = i < operationalStationsCount ? 10 : 0;
    }
  }

  return {
    id: lab.id,
    name: lab.name,
    totalPcs: lab.totalPcs,
    stations: evaluatedStations,
    operationalStationsCount,
    workingPcCount: labWorkingPcs,
  };
}

/**
 * Calculates venue-wide capacity metrics across all labs.
 */
export function calculateVenueCapacity(labs: DomainLab[]): VenueCapacityMetrics {
  let totalConfiguredPCs = 0;
  let totalWorkingPCs = 0;
  let totalStations = 0;
  let operationalStations = 0;

  const details = labs.map((lab) => {
    totalConfiguredPCs += lab.totalPcs;
    totalWorkingPCs += lab.workingPcCount;
    totalStations += lab.stations.length;
    operationalStations += lab.operationalStationsCount;

    return {
      labId: lab.id,
      labName: lab.name,
      totalPcs: lab.totalPcs,
      workingPcs: lab.workingPcCount,
      operationalStations: lab.operationalStationsCount,
      configuredStations: lab.stations.length,
    };
  });

  return {
    totalLabs: labs.length,
    totalConfiguredPCs,
    totalWorkingPCs,
    totalOfflinePCs: totalConfiguredPCs - totalWorkingPCs,
    totalStations,
    operationalStations,
    maxSimultaneousMatches: operationalStations,
    details,
  };
}
