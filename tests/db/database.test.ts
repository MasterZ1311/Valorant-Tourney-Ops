import { describe, it, expect, vi } from "vitest";
import {
  Prisma,
  PrismaClient,
  UserRole,
  TournamentStatus,
  TournamentFormat,
  TeamStatus,
  PlayerRole,
  PCStatus,
  VolunteerRole,
} from "@prisma/client";
import {
  runInTransaction,
  createAuditLogEntry,
  softDeleteTournament,
  restoreTournament,
  softDeleteTeam,
  restoreTeam,
  softDeletePlayer,
  restorePlayer,
  softDeleteMatch,
  restoreMatch,
  softDeletePC,
  restorePC,
  notDeleted,
  isDeleted,
  isSoftDeleted,
} from "../../src/lib/db-utils";
import { generateSeedData, verifyPassword } from "../../prisma/seed";

describe("Database Architecture & Schema Integrity (Milestone 1)", () => {
  describe("1. UserRole Enum & User Model", () => {
    it("should define all 6 required roles in UserRole enum", () => {
      const userRoleEnum = Prisma.dmmf.datamodel.enums.find(
        (e) => e.name === "UserRole"
      );
      expect(userRoleEnum).toBeDefined();

      const roleNames = userRoleEnum!.values.map((v) => v.name);
      expect(roleNames).toContain("SUPER_ADMIN");
      expect(roleNames).toContain("TOURNAMENT_ADMIN");
      expect(roleNames).toContain("COORDINATOR");
      expect(roleNames).toContain("VOLUNTEER");
      expect(roleNames).toContain("RESULTS_OFFICIAL");
      expect(roleNames).toContain("VIEWER");
      expect(roleNames).toHaveLength(6);
    });

    it("should configure User.role to use UserRole enum with default VOLUNTEER", () => {
      const userModel = Prisma.dmmf.datamodel.models.find(
        (m) => m.name === "User"
      );
      expect(userModel).toBeDefined();

      const roleField = userModel!.fields.find((f) => f.name === "role");
      expect(roleField).toBeDefined();
      expect(roleField!.type).toBe("UserRole");
      expect(roleField!.default).toBe("VOLUNTEER");
    });
  });

  describe("2. Compound Unique Constraints", () => {
    it("should define @@unique([tournamentId, name]) on Team", () => {
      const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "Team");
      expect(model).toBeDefined();
      expect(model!.uniqueFields).toContainEqual(["tournamentId", "name"]);
    });

    it("should define @@unique([buildingId, name]) on Lab", () => {
      const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "Lab");
      expect(model).toBeDefined();
      expect(model!.uniqueFields).toContainEqual(["buildingId", "name"]);
    });

    it("should define @@unique([labId, name]) on Station", () => {
      const model = Prisma.dmmf.datamodel.models.find(
        (m) => m.name === "Station"
      );
      expect(model).toBeDefined();
      expect(model!.uniqueFields).toContainEqual(["labId", "name"]);
    });

    it("should define @@unique([labId, pcNumber]) on PC", () => {
      const model = Prisma.dmmf.datamodel.models.find((m) => m.name === "PC");
      expect(model).toBeDefined();
      expect(model!.uniqueFields).toContainEqual(["labId", "pcNumber"]);
    });

    it("should define @@unique([tournamentId, roundNumber]) on Round", () => {
      const model = Prisma.dmmf.datamodel.models.find(
        (m) => m.name === "Round"
      );
      expect(model).toBeDefined();
      expect(model!.uniqueFields).toContainEqual(["tournamentId", "roundNumber"]);
    });

    it("should define @@unique([roundId, matchNumber]) on Match", () => {
      const model = Prisma.dmmf.datamodel.models.find(
        (m) => m.name === "Match"
      );
      expect(model).toBeDefined();
      expect(model!.uniqueFields).toContainEqual(["roundId", "matchNumber"]);
    });

    it("should define @@unique([teamId, riotId, riotTag]) on Player", () => {
      const model = Prisma.dmmf.datamodel.models.find(
        (m) => m.name === "Player"
      );
      expect(model).toBeDefined();
      expect(model!.uniqueFields).toContainEqual(["teamId", "riotId", "riotTag"]);
    });
  });

  describe("3. Soft Deletion (deletedAt) Support", () => {
    it.each(["Tournament", "Team", "Player", "Match", "PC"])(
      "should define deletedAt DateTime? on %s model",
      (modelName) => {
        const model = Prisma.dmmf.datamodel.models.find(
          (m) => m.name === modelName
        );
        expect(model).toBeDefined();

        const deletedAtField = model!.fields.find((f) => f.name === "deletedAt");
        expect(deletedAtField).toBeDefined();
        expect(deletedAtField!.type).toBe("DateTime");
        expect(deletedAtField!.isRequired).toBe(false);
      }
    );

    it("should correctly identify soft-deleted entities with isSoftDeleted", () => {
      expect(isSoftDeleted(null)).toBe(false);
      expect(isSoftDeleted(undefined)).toBe(false);
      expect(isSoftDeleted({ deletedAt: null })).toBe(false);
      expect(isSoftDeleted({ deletedAt: new Date() })).toBe(true);
    });

    it("should provide notDeleted and isDeleted query clauses", () => {
      expect(notDeleted).toEqual({ deletedAt: null });
      expect(isDeleted).toEqual({ deletedAt: { not: null } });
    });
  });

  describe("4. Relational Cascades & Foreign Key Invariants", () => {
    it("should configure Cascade on parent-child containment relationships", () => {
      const containmentRelations = [
        { model: "TournamentSettings", field: "tournament", expectedOnDelete: "Cascade" },
        { model: "Team", field: "tournament", expectedOnDelete: "Cascade" },
        { model: "Player", field: "team", expectedOnDelete: "Cascade" },
        { model: "Building", field: "venue", expectedOnDelete: "Cascade" },
        { model: "Lab", field: "building", expectedOnDelete: "Cascade" },
        { model: "Station", field: "lab", expectedOnDelete: "Cascade" },
        { model: "PC", field: "lab", expectedOnDelete: "Cascade" },
        { model: "Round", field: "tournament", expectedOnDelete: "Cascade" },
        { model: "Match", field: "round", expectedOnDelete: "Cascade" },
      ];

      for (const rel of containmentRelations) {
        const model = Prisma.dmmf.datamodel.models.find((m) => m.name === rel.model);
        expect(model).toBeDefined();
        const field = model!.fields.find((f) => f.name === rel.field);
        expect(field).toBeDefined();
        expect(
          field!.relationOnDelete,
          `Expected ${rel.model}.${rel.field} to have onDelete: ${rel.expectedOnDelete}`
        ).toBe(rel.expectedOnDelete);
      }
    });

    it("should configure SetNull on non-destructive entity associations", () => {
      const nonDestructiveRelations = [
        { model: "Match", field: "station" },
        { model: "Match", field: "teamA" },
        { model: "Match", field: "teamB" },
        { model: "Match", field: "winner" },
        { model: "Match", field: "loser" },
        { model: "PC", field: "station" },
        { model: "VolunteerAssignment", field: "station" },
      ];

      for (const rel of nonDestructiveRelations) {
        const model = Prisma.dmmf.datamodel.models.find((m) => m.name === rel.model);
        expect(model).toBeDefined();
        const field = model!.fields.find((f) => f.name === rel.field);
        expect(field).toBeDefined();
        expect(
          field!.relationOnDelete,
          `Expected ${rel.model}.${rel.field} to have onDelete: SetNull`
        ).toBe("SetNull");
      }
    });
  });

  describe("5. Database Utilities (db-utils.ts)", () => {
    describe("runInTransaction", () => {
      it("should execute operations within transaction and return result", async () => {
        const mockTx = {
          team: { findMany: vi.fn().mockResolvedValue([{ id: "team-1" }]) },
        } as unknown as Prisma.TransactionClient;

        const mockClient = {
          $transaction: vi.fn().mockImplementation(async (callback) => {
            return await callback(mockTx);
          }),
        } as unknown as PrismaClient;

        const result = await runInTransaction(
          async (tx) => {
            return await (tx as unknown as typeof mockTx).team.findMany();
          },
          { client: mockClient }
        );

        expect(result).toEqual([{ id: "team-1" }]);
        expect(mockClient.$transaction).toHaveBeenCalledOnce();
      });

      it("should propagate errors and trigger transaction rollback when an operation fails", async () => {
        const mockError = new Error("Unique constraint violation or foreign key failure");
        const mockClient = {
          $transaction: vi.fn().mockImplementation(async (callback) => {
            return await callback({} as Prisma.TransactionClient);
          }),
        } as unknown as PrismaClient;

        await expect(
          runInTransaction(
            async () => {
              throw mockError;
            },
            { client: mockClient }
          )
        ).rejects.toThrow("Unique constraint violation or foreign key failure");
      });
    });

    describe("createAuditLogEntry", () => {
      it("should serialize state objects to JSON strings and record audit log", async () => {
        const mockCreate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "audit-1",
          createdAt: new Date(),
          ...data,
        }));

        const mockClient = {
          auditLog: { create: mockCreate },
        } as unknown as PrismaClient;

        const beforeState = { status: "DRAFT", teamsCount: 0 };
        const afterState = { status: "READY", teamsCount: 13 };

        const entry = await createAuditLogEntry(
          {
            tournamentId: "t-1",
            actorId: "admin-1",
            actorRole: "SUPER_ADMIN",
            action: "UPDATE_STATUS",
            entity: "Tournament",
            entityId: "t-1",
            beforeState,
            afterState,
            ipAddress: "127.0.0.1",
          },
          mockClient
        );

        expect(mockCreate).toHaveBeenCalledOnce();
        expect(entry.action).toBe("UPDATE_STATUS");
        expect(entry.beforeState).toBe(JSON.stringify(beforeState));
        expect(entry.afterState).toBe(JSON.stringify(afterState));
        expect(entry.actorRole).toBe("SUPER_ADMIN");
        expect(entry.ipAddress).toBe("127.0.0.1");
      });

      it("should handle raw string states and null states without double-stringifying", async () => {
        const mockCreate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "audit-2",
          createdAt: new Date(),
          ...data,
        }));

        const mockClient = {
          auditLog: { create: mockCreate },
        } as unknown as PrismaClient;

        const entry = await createAuditLogEntry(
          {
            actorId: "admin-1",
            actorRole: "SUPER_ADMIN",
            action: "DELETE_PC",
            entity: "PC",
            entityId: "pc-10",
            beforeState: "ALIVE",
            afterState: null,
          },
          mockClient
        );

        expect(entry.beforeState).toBe("ALIVE");
        expect(entry.afterState).toBeNull();
        expect(entry.tournamentId).toBeNull();
      });
    });

    describe("Soft Delete & Restore Helpers", () => {
      it("softDeleteTeam should set deletedAt to a timestamp", async () => {
        const mockUpdate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "team-1",
          name: "Apex Predators",
          deletedAt: data.deletedAt,
        }));

        const mockClient = {
          team: { update: mockUpdate },
        } as unknown as PrismaClient;

        const res = await softDeleteTeam("team-1", mockClient);
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "team-1" },
            data: { deletedAt: expect.any(Date) },
          })
        );
        expect(res.deletedAt).toBeInstanceOf(Date);
      });

      it("restoreTeam should reset deletedAt to null", async () => {
        const mockUpdate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "team-1",
          name: "Apex Predators",
          deletedAt: data.deletedAt,
        }));

        const mockClient = {
          team: { update: mockUpdate },
        } as unknown as PrismaClient;

        const res = await restoreTeam("team-1", mockClient);
        expect(mockUpdate).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { id: "team-1" },
            data: { deletedAt: null },
          })
        );
        expect(res.deletedAt).toBeNull();
      });

      it("softDeleteTournament and restoreTournament should toggle deletedAt", async () => {
        const mockUpdate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "tourney-1",
          deletedAt: data.deletedAt,
        }));

        const mockClient = {
          tournament: { update: mockUpdate },
        } as unknown as PrismaClient;

        const deleted = await softDeleteTournament("tourney-1", mockClient);
        expect(deleted.deletedAt).toBeInstanceOf(Date);

        const restored = await restoreTournament("tourney-1", mockClient);
        expect(restored.deletedAt).toBeNull();
      });

      it("softDeletePlayer and restorePlayer should toggle deletedAt", async () => {
        const mockUpdate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "p-1",
          deletedAt: data.deletedAt,
        }));

        const mockClient = {
          player: { update: mockUpdate },
        } as unknown as PrismaClient;

        const deleted = await softDeletePlayer("p-1", mockClient);
        expect(deleted.deletedAt).toBeInstanceOf(Date);

        const restored = await restorePlayer("p-1", mockClient);
        expect(restored.deletedAt).toBeNull();
      });

      it("softDeleteMatch and restoreMatch should toggle deletedAt", async () => {
        const mockUpdate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "m-1",
          deletedAt: data.deletedAt,
        }));

        const mockClient = {
          match: { update: mockUpdate },
        } as unknown as PrismaClient;

        const deleted = await softDeleteMatch("m-1", mockClient);
        expect(deleted.deletedAt).toBeInstanceOf(Date);

        const restored = await restoreMatch("m-1", mockClient);
        expect(restored.deletedAt).toBeNull();
      });

      it("softDeletePC and restorePC should toggle deletedAt", async () => {
        const mockUpdate = vi.fn().mockImplementation(async ({ data }) => ({
          id: "pc-1",
          deletedAt: data.deletedAt,
        }));

        const mockClient = {
          pC: { update: mockUpdate },
        } as unknown as PrismaClient;

        const deleted = await softDeletePC("pc-1", mockClient);
        expect(deleted.deletedAt).toBeInstanceOf(Date);

        const restored = await restorePC("pc-1", mockClient);
        expect(restored.deletedAt).toBeNull();
      });
    });
  });

  describe("6. Dev Tournament Seed Data Invariants (prisma/seed.ts)", () => {
    const seedData = generateSeedData();

    it("should seed Super Admin with valid password hash", () => {
      expect(seedData.superAdmin.email).toBe("admin@vto.gg");
      expect(seedData.superAdmin.role).toBe(UserRole.SUPER_ADMIN);
      expect(seedData.superAdmin.name).toBeTruthy();
      expect(verifyPassword("AdminVTO2026!", seedData.superAdmin.passwordHash)).toBe(true);
      expect(verifyPassword("WrongPassword", seedData.superAdmin.passwordHash)).toBe(false);
    });

    it("should seed Tournament with status READY and format SINGLE_ELIMINATION", () => {
      expect(seedData.tournament.name).toBe("VALORANT Campus Championship 2026");
      expect(seedData.tournament.status).toBe(TournamentStatus.READY);
      expect(seedData.tournament.format).toBe(TournamentFormat.SINGLE_ELIMINATION);
      expect(seedData.tournament.currentRound).toBe(1);
    });

    it("should seed TournamentSettings matching VTO LAN specifications", () => {
      expect(seedData.settings.playersPerTeam).toBe(5);
      expect(seedData.settings.maxSubstitutes).toBe(2);
      expect(seedData.settings.matchDurationMinutes).toBe(45);
      expect(seedData.settings.bufferDurationMinutes).toBe(15);
      expect(seedData.settings.requireCheckIn).toBe(true);
      expect(seedData.settings.autoAdvanceBYEs).toBe(true);
    });

    it("should seed Physical Venue with 2 Labs and exactly 40 AVAILABLE PCs across 4 Stations", () => {
      const venue = seedData.venue;
      expect(venue.name).toBe("University Esports Complex");
      expect(venue.building.name).toBe("Engineering North");

      const labs = venue.building.labs;
      expect(labs).toHaveLength(2);

      // Lab 1: 30 PCs, 3 Stations (10 PCs each)
      const lab1 = labs[0];
      expect(lab1.totalPcs).toBe(30);
      expect(lab1.stations).toHaveLength(3);
      for (const st of lab1.stations) {
        expect(st.pcCount).toBe(10);
        expect(st.pcs).toHaveLength(10);
        for (const pc of st.pcs) {
          expect(pc.status).toBe(PCStatus.AVAILABLE);
        }
      }

      // Lab 2: 10 PCs, 1 Station (10 PCs)
      const lab2 = labs[1];
      expect(lab2.totalPcs).toBe(10);
      expect(lab2.stations).toHaveLength(1);
      const lab2Station = lab2.stations[0];
      expect(lab2Station.pcCount).toBe(10);
      expect(lab2Station.pcs).toHaveLength(10);
      for (const pc of lab2Station.pcs) {
        expect(pc.status).toBe(PCStatus.AVAILABLE);
      }

      // Total PCs across venue must equal exactly 40
      const totalPCs = labs.reduce(
        (sum, lab) => sum + lab.stations.reduce((stSum, st) => stSum + st.pcs.length, 0),
        0
      );
      expect(totalPCs).toBe(40);
    });

    it("should satisfy Physical Resource Invariant: exactly 10 PCs per station", () => {
      for (const lab of seedData.venue.building.labs) {
        for (const station of lab.stations) {
          expect(station.pcs).toHaveLength(10);
        }
      }
    });

    it("should seed exactly 13 Teams with 5 starting players each (65 players total)", () => {
      expect(seedData.teams).toHaveLength(13);

      let totalPlayers = 0;
      for (const team of seedData.teams) {
        expect(team.name).toBeTruthy();
        expect(team.institution).toBeTruthy();
        expect(team.captain).toBeTruthy();
        expect(team.captainContact).toBeTruthy();
        expect(team.seed).toBeGreaterThanOrEqual(1);
        expect(team.seed).toBeLessThanOrEqual(13);
        expect(team.status).toBe(TeamStatus.CHECKED_IN);

        expect(team.players).toHaveLength(5);
        totalPlayers += team.players.length;

        // Exactly 1 captain and 4 starters
        const captains = team.players.filter((p) => p.role === PlayerRole.CAPTAIN);
        const starters = team.players.filter((p) => p.role === PlayerRole.STARTER);
        expect(captains).toHaveLength(1);
        expect(starters).toHaveLength(4);

        for (const p of team.players) {
          expect(p.name).toBeTruthy();
          expect(p.collegeId).toMatch(/^COL-2026-\d{3}$/);
          expect(p.riotId).toBeTruthy();
          expect(p.riotTag).toBeTruthy();
          expect(p.verified).toBe(true);
          expect(p.present).toBe(true);
        }
      }

      expect(totalPlayers).toBe(65);
    });

    it("should seed volunteer staff covering Coordinator, Match Marshal, and Results Official", () => {
      const roles = seedData.volunteers.map((v) => v.volunteer.role);
      expect(roles).toContain(VolunteerRole.LEAD_COORDINATOR);
      expect(roles).toContain(VolunteerRole.MATCH_MARSHAL);
      expect(roles).toContain(VolunteerRole.RESULTS);
      expect(seedData.volunteers.length).toBeGreaterThanOrEqual(3);
    });

    describe("Compound Uniqueness Invariants in Seed Data", () => {
      it("should have zero duplicate team names", () => {
        const teamNames = seedData.teams.map((t) => t.name.toLowerCase());
        const uniqueNames = new Set(teamNames);
        expect(uniqueNames.size).toBe(teamNames.length);
      });

      it("should have zero duplicate PC numbers within each lab", () => {
        for (const lab of seedData.venue.building.labs) {
          const pcNumbers = lab.stations.flatMap((st) => st.pcs.map((pc) => pc.pcNumber));
          const uniquePCNumbers = new Set(pcNumbers);
          expect(uniquePCNumbers.size).toBe(pcNumbers.length);
        }
      });

      it("should have zero duplicate station names within each lab", () => {
        for (const lab of seedData.venue.building.labs) {
          const stationNames = lab.stations.map((st) => st.name.toLowerCase());
          const uniqueStationNames = new Set(stationNames);
          expect(uniqueStationNames.size).toBe(stationNames.length);
        }
      });

      it("should have zero duplicate player Riot tags within each team", () => {
        for (const team of seedData.teams) {
          const playerTags = team.players.map((p) => `${p.riotId}#${p.riotTag}`.toLowerCase());
          const uniqueTags = new Set(playerTags);
          expect(uniqueTags.size).toBe(playerTags.length);
        }
      });
    });
  });
});
