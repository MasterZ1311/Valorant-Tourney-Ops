import { describe, it, expect } from "vitest";
import { UserRole } from "@prisma/client";
import {
  hasPermission,
  assertPermission,
  AuthorizationError,
  PermissionAction,
  ROLE_PERMISSIONS,
} from "../../src/lib/auth/rbac";

describe("Security & RBAC Enforcement — Role Permissions Matrix", () => {
  const allRoles: UserRole[] = [
    "SUPER_ADMIN",
    "TOURNAMENT_ADMIN",
    "COORDINATOR",
    "RESULTS_OFFICIAL",
    "VOLUNTEER",
    "VIEWER",
  ];

  it("verifies SUPER_ADMIN possesses all system permissions", () => {
    const superAdminPermissions = ROLE_PERMISSIONS.SUPER_ADMIN;
    expect(superAdminPermissions.size).toBeGreaterThanOrEqual(20);
    expect(hasPermission("SUPER_ADMIN", "TOURNAMENT_UNLOCK")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "FIXTURE_OVERWRITE")).toBe(true);
    expect(hasPermission("SUPER_ADMIN", "MATCH_VERIFY_RESULT")).toBe(true);
  });

  it("restricts tournament unlock exclusively to SUPER_ADMIN", () => {
    expect(hasPermission("SUPER_ADMIN", "TOURNAMENT_UNLOCK")).toBe(true);
    expect(hasPermission("TOURNAMENT_ADMIN", "TOURNAMENT_UNLOCK")).toBe(false);
    expect(hasPermission("COORDINATOR", "TOURNAMENT_UNLOCK")).toBe(false);
    expect(hasPermission("RESULTS_OFFICIAL", "TOURNAMENT_UNLOCK")).toBe(false);
    expect(hasPermission("VOLUNTEER", "TOURNAMENT_UNLOCK")).toBe(false);
    expect(hasPermission("VIEWER", "TOURNAMENT_UNLOCK")).toBe(false);

    expect(() => assertPermission("TOURNAMENT_ADMIN", "TOURNAMENT_UNLOCK")).toThrow(
      AuthorizationError
    );
  });

  it("permits RESULTS_OFFICIAL to verify results but blocks them from starting matches or creating tournaments", () => {
    expect(hasPermission("RESULTS_OFFICIAL", "MATCH_VERIFY_RESULT")).toBe(true);
    expect(hasPermission("RESULTS_OFFICIAL", "MATCH_SUBMIT_RESULT")).toBe(true);
    expect(hasPermission("RESULTS_OFFICIAL", "MATCH_START")).toBe(false);
    expect(hasPermission("RESULTS_OFFICIAL", "TOURNAMENT_CREATE")).toBe(false);
    expect(hasPermission("RESULTS_OFFICIAL", "VENUE_CONFIG")).toBe(false);
  });

  it("allows VOLUNTEER to check-in teams and operate match states but forbids result verification", () => {
    expect(hasPermission("VOLUNTEER", "TEAM_CHECKIN")).toBe(true);
    expect(hasPermission("VOLUNTEER", "MATCH_CALL")).toBe(true);
    expect(hasPermission("VOLUNTEER", "MATCH_START")).toBe(true);
    expect(hasPermission("VOLUNTEER", "MATCH_PAUSE")).toBe(true);
    expect(hasPermission("VOLUNTEER", "MATCH_SUBMIT_RESULT")).toBe(true);
    expect(hasPermission("VOLUNTEER", "INCIDENT_REPORT")).toBe(true);

    // Invariant: Volunteer cannot independently verify score or advance bracket
    expect(hasPermission("VOLUNTEER", "MATCH_VERIFY_RESULT")).toBe(false);
    expect(hasPermission("VOLUNTEER", "TOURNAMENT_FINALIZE")).toBe(false);
    expect(hasPermission("VOLUNTEER", "BRACKET_GENERATE")).toBe(false);
  });

  it("confines VIEWER strictly to read-only public access", () => {
    expect(hasPermission("VIEWER", "VIEW_PUBLIC")).toBe(true);

    const restrictedActions: PermissionAction[] = [
      "MATCH_CALL",
      "MATCH_START",
      "MATCH_PAUSE",
      "MATCH_SUBMIT_RESULT",
      "MATCH_VERIFY_RESULT",
      "TEAM_CHECKIN",
      "INCIDENT_REPORT",
      "TOURNAMENT_CREATE",
      "VENUE_CONFIG",
    ];

    restrictedActions.forEach((action) => {
      expect(hasPermission("VIEWER", action)).toBe(false);
      expect(() => assertPermission("VIEWER", action)).toThrow(AuthorizationError);
    });
  });

  it("allows COORDINATOR to manage venue hardware and report/resolve incidents", () => {
    expect(hasPermission("COORDINATOR", "VENUE_CONFIG")).toBe(true);
    expect(hasPermission("COORDINATOR", "PC_STATUS_TOGGLE")).toBe(true);
    expect(hasPermission("COORDINATOR", "INCIDENT_RESOLVE")).toBe(true);
    expect(hasPermission("COORDINATOR", "TOURNAMENT_FINALIZE")).toBe(false);
  });
});
