import { UserRole } from "@prisma/client";

export type PermissionAction =
  | "TOURNAMENT_CREATE"
  | "TOURNAMENT_FINALIZE"
  | "TOURNAMENT_UNLOCK"
  | "TOURNAMENT_ARCHIVE"
  | "VENUE_CONFIG"
  | "PC_STATUS_TOGGLE"
  | "BRACKET_GENERATE"
  | "FIXTURE_GENERATE"
  | "FIXTURE_OVERWRITE"
  | "TEAM_REGISTER"
  | "TEAM_CHECKIN"
  | "TEAM_DISQUALIFY"
  | "MATCH_CALL"
  | "MATCH_START"
  | "MATCH_PAUSE"
  | "MATCH_SUBMIT_RESULT"
  | "MATCH_VERIFY_RESULT"
  | "INCIDENT_REPORT"
  | "INCIDENT_RESOLVE"
  | "PENALTY_ISSUE"
  | "AUDIT_VIEW"
  | "EXPORT_REPORTS"
  | "VIEW_PUBLIC";

/**
 * Role-Based Access Control (RBAC) permission map.
 * Enforces least privilege across all six system roles.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Set<PermissionAction>> = {
  SUPER_ADMIN: new Set<PermissionAction>([
    "TOURNAMENT_CREATE",
    "TOURNAMENT_FINALIZE",
    "TOURNAMENT_UNLOCK",
    "TOURNAMENT_ARCHIVE",
    "VENUE_CONFIG",
    "PC_STATUS_TOGGLE",
    "BRACKET_GENERATE",
    "FIXTURE_GENERATE",
    "FIXTURE_OVERWRITE",
    "TEAM_REGISTER",
    "TEAM_CHECKIN",
    "TEAM_DISQUALIFY",
    "MATCH_CALL",
    "MATCH_START",
    "MATCH_PAUSE",
    "MATCH_SUBMIT_RESULT",
    "MATCH_VERIFY_RESULT",
    "INCIDENT_REPORT",
    "INCIDENT_RESOLVE",
    "PENALTY_ISSUE",
    "AUDIT_VIEW",
    "EXPORT_REPORTS",
    "VIEW_PUBLIC",
  ]),

  TOURNAMENT_ADMIN: new Set<PermissionAction>([
    "TOURNAMENT_CREATE",
    "TOURNAMENT_FINALIZE",
    "VENUE_CONFIG",
    "PC_STATUS_TOGGLE",
    "BRACKET_GENERATE",
    "FIXTURE_GENERATE",
    "TEAM_REGISTER",
    "TEAM_CHECKIN",
    "TEAM_DISQUALIFY",
    "MATCH_CALL",
    "MATCH_START",
    "MATCH_PAUSE",
    "MATCH_SUBMIT_RESULT",
    "MATCH_VERIFY_RESULT",
    "INCIDENT_REPORT",
    "INCIDENT_RESOLVE",
    "PENALTY_ISSUE",
    "AUDIT_VIEW",
    "EXPORT_REPORTS",
    "VIEW_PUBLIC",
  ]),

  COORDINATOR: new Set<PermissionAction>([
    "VENUE_CONFIG",
    "PC_STATUS_TOGGLE",
    "FIXTURE_GENERATE",
    "TEAM_CHECKIN",
    "MATCH_CALL",
    "MATCH_START",
    "MATCH_PAUSE",
    "MATCH_SUBMIT_RESULT",
    "INCIDENT_REPORT",
    "INCIDENT_RESOLVE",
    "AUDIT_VIEW",
    "EXPORT_REPORTS",
    "VIEW_PUBLIC",
  ]),

  RESULTS_OFFICIAL: new Set<PermissionAction>([
    "MATCH_SUBMIT_RESULT",
    "MATCH_VERIFY_RESULT",
    "INCIDENT_REPORT",
    "AUDIT_VIEW",
    "EXPORT_REPORTS",
    "VIEW_PUBLIC",
  ]),

  VOLUNTEER: new Set<PermissionAction>([
    "TEAM_CHECKIN",
    "MATCH_CALL",
    "MATCH_START",
    "MATCH_PAUSE",
    "MATCH_SUBMIT_RESULT",
    "INCIDENT_REPORT",
    "VIEW_PUBLIC",
  ]),

  VIEWER: new Set<PermissionAction>([
    "VIEW_PUBLIC",
  ]),
};

/**
 * Checks whether a given role has permission to execute an action.
 */
export function hasPermission(role: UserRole, action: PermissionAction): boolean {
  return ROLE_PERMISSIONS[role]?.has(action) ?? false;
}

/**
 * Asserts that a given role has the required permission, throwing an AuthorizationError otherwise.
 */
export function assertPermission(role: UserRole, action: PermissionAction): void {
  if (!hasPermission(role, action)) {
    throw new AuthorizationError(
      `Access denied: Role "${role}" is not authorized to perform "${action}".`
    );
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}
