import { Prisma, PrismaClient, AuditLog, Tournament, Team, Player, Match, PC } from "@prisma/client";
import { prisma as defaultPrisma } from "./db";

export type PrismaTransactionClient = Prisma.TransactionClient;
export type DbClient = PrismaClient | PrismaTransactionClient;

/**
 * Standard query filter for active (non-soft-deleted) records.
 */
export const notDeleted = { deletedAt: null } as const;

/**
 * Standard query filter for soft-deleted records.
 */
export const isDeleted = { deletedAt: { not: null } } as const;

/**
 * Checks whether an entity has been soft deleted.
 */
export function isSoftDeleted(entity: { deletedAt?: Date | null } | null | undefined): boolean {
  return entity?.deletedAt != null;
}

/**
 * Helper to execute an operation inside a Prisma transaction.
 * Supports configurable timeouts and isolation levels.
 */
export async function runInTransaction<T>(
  callback: (tx: PrismaTransactionClient) => Promise<T>,
  options?: {
    maxWait?: number;
    timeout?: number;
    isolationLevel?: Prisma.TransactionIsolationLevel;
    client?: PrismaClient;
  }
): Promise<T> {
  const client = options?.client ?? defaultPrisma;
  return client.$transaction(
    async (tx) => {
      return await callback(tx);
    },
    {
      maxWait: options?.maxWait,
      timeout: options?.timeout,
      isolationLevel: options?.isolationLevel,
    }
  );
}

/**
 * Parameter interface for recording an immutable AuditLog entry.
 */
export interface CreateAuditLogParams {
  tournamentId?: string | null;
  actorId: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  beforeState?: unknown;
  afterState?: unknown;
  ipAddress?: string | null;
}

/**
 * Creates an immutable AuditLog record.
 * Serializes beforeState and afterState to JSON strings if provided as objects.
 * Can execute within an active transaction or standalone Prisma client.
 */
export async function createAuditLogEntry(
  params: CreateAuditLogParams,
  client: DbClient = defaultPrisma
): Promise<AuditLog> {
  const beforeState =
    params.beforeState !== undefined && params.beforeState !== null
      ? typeof params.beforeState === "string"
        ? params.beforeState
        : JSON.stringify(params.beforeState)
      : null;

  const afterState =
    params.afterState !== undefined && params.afterState !== null
      ? typeof params.afterState === "string"
        ? params.afterState
        : JSON.stringify(params.afterState)
      : null;

  return (client as PrismaClient).auditLog.create({
    data: {
      tournamentId: params.tournamentId ?? null,
      actorId: params.actorId,
      actorRole: params.actorRole,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      beforeState,
      afterState,
      ipAddress: params.ipAddress ?? null,
    },
  });
}

/**
 * Soft deletes a tournament by setting deletedAt to current timestamp.
 */
export async function softDeleteTournament(
  tournamentId: string,
  client: DbClient = defaultPrisma
): Promise<Tournament> {
  return (client as PrismaClient).tournament.update({
    where: { id: tournamentId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restores a soft-deleted tournament by resetting deletedAt to null.
 */
export async function restoreTournament(
  tournamentId: string,
  client: DbClient = defaultPrisma
): Promise<Tournament> {
  return (client as PrismaClient).tournament.update({
    where: { id: tournamentId },
    data: { deletedAt: null },
  });
}

/**
 * Soft deletes a team by setting deletedAt to current timestamp.
 */
export async function softDeleteTeam(
  teamId: string,
  client: DbClient = defaultPrisma
): Promise<Team> {
  return (client as PrismaClient).team.update({
    where: { id: teamId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restores a soft-deleted team by resetting deletedAt to null.
 */
export async function restoreTeam(
  teamId: string,
  client: DbClient = defaultPrisma
): Promise<Team> {
  return (client as PrismaClient).team.update({
    where: { id: teamId },
    data: { deletedAt: null },
  });
}

/**
 * Soft deletes a player by setting deletedAt to current timestamp.
 */
export async function softDeletePlayer(
  playerId: string,
  client: DbClient = defaultPrisma
): Promise<Player> {
  return (client as PrismaClient).player.update({
    where: { id: playerId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restores a soft-deleted player by resetting deletedAt to null.
 */
export async function restorePlayer(
  playerId: string,
  client: DbClient = defaultPrisma
): Promise<Player> {
  return (client as PrismaClient).player.update({
    where: { id: playerId },
    data: { deletedAt: null },
  });
}

/**
 * Soft deletes a match by setting deletedAt to current timestamp.
 */
export async function softDeleteMatch(
  matchId: string,
  client: DbClient = defaultPrisma
): Promise<Match> {
  return (client as PrismaClient).match.update({
    where: { id: matchId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restores a soft-deleted match by resetting deletedAt to null.
 */
export async function restoreMatch(
  matchId: string,
  client: DbClient = defaultPrisma
): Promise<Match> {
  return (client as PrismaClient).match.update({
    where: { id: matchId },
    data: { deletedAt: null },
  });
}

/**
 * Soft deletes a PC by setting deletedAt to current timestamp.
 */
export async function softDeletePC(
  pcId: string,
  client: DbClient = defaultPrisma
): Promise<PC> {
  return (client as PrismaClient).pC.update({
    where: { id: pcId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Restores a soft-deleted PC by resetting deletedAt to null.
 */
export async function restorePC(
  pcId: string,
  client: DbClient = defaultPrisma
): Promise<PC> {
  return (client as PrismaClient).pC.update({
    where: { id: pcId },
    data: { deletedAt: null },
  });
}
