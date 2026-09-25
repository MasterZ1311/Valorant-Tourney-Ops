# Database Engineering Rules — VTO

### ORM & Relational Schema
- Database: PostgreSQL, managed via Prisma ORM.
- All primary keys: CUID or UUID string IDs (`@default(cuid())` or `@id @default(uuid())`).
- Strict timestamping: every model includes `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
- Foreign Keys: Always declare explicit `@relation` with appropriate `onDelete` semantics (e.g. `Cascade` for sub-items like PCs under Lab, `Restrict` or `SetNull` for Matches linked to Teams or Stations).

### Soft Deletion & Data Protection
- Teams, Matches, Tournament fixtures, and Audit records must never be hard-deleted during an active tournament.
- Use explicit statuses (e.g. `DISQUALIFIED`, `CANCELLED`, `NO_SHOW`, `ARCHIVED`) or `isDeleted: Boolean` flags.

### Performance & Indexing
- Add compound indexes for frequent relational queries:
  - `@@index([tournamentId, status])` on Match, Team, Lab, Volunteer
  - `@@index([stationId, startTime, endTime])` on Match
  - `@@index([tournamentId, roundNumber])` on Match
  - `@@index([entity, entityId])` on AuditLog
  - `@@index([matchId, category])` on Incident
- Do not perform full table scans or unbounded N+1 relations. Use selective Prisma `include` / `select`.
