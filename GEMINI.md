# GEMINI.md — VALORANT Tournament Operations System (VTO)
## System Principles, Coding Standards, Invariants, and Operational Rules

This document governs the engineering standards, architecture, and operational rules for the VALORANT Tournament Operations System (VTO). All developers, agents, and contributors must adhere strictly to these principles.

---

### 1. Core Architecture Principles
1. **Separation of Concerns**:
   - **Domain/Engine Layer** (`src/lib/tournament`, `src/lib/scheduling`): Pure TypeScript business logic, deterministic, unit-tested, zero React or direct DB dependencies.
   - **Service Layer** (`src/services/`): Orchestration, database queries via Prisma, transaction management, state transition enforcement, audit logging.
   - **API / Action Layer** (`src/app/api/`, `src/actions/`): HTTP routing, session authentication, request validation (Zod), status mapping.
   - **UI Layer** (`src/components/`, `src/app/`): Presentational components, client state, forms, responsive layouts. Never embed tournament or scheduling rules into UI components.
2. **Deterministic & Reversible**:
   - Tournament bracket generation and fixture scheduling must produce deterministic, auditable outputs.
   - Dangerous/destructive actions (bracket unlock, team DQ, fixture regeneration) must require explicit confirmations, create immutable audit logs, and never execute silently.
3. **Defense-in-Depth Security**:
   - Never trust frontend authorization alone. Validate permissions on every server route and server action.
   - Validate every payload using Zod schemas matching DB constraints.

---

### 2. Multi-Agent Workstream Invariants
1. **Strict File Ownership**:
   - Parallel subagents must operate strictly within their assigned workstream files (see `docs/ROADMAP.md`).
   - Shared contract files (`src/lib/tournament/types.ts`, `prisma/schema.prisma`) must only be modified by the Principal Architect / Database lead.
2. **Non-Destructive Operations**:
   - Never delete or overwrite working domain engine algorithms or test suites.
   - Extend functionality via modular files (e.g. `round-robin.ts`, `group-stage.ts`) rather than mutating existing tested implementations.
3. **Verification Before PR Merge**:
   - Any workstream completion requires: `npx tsc --noEmit` (0 errors), `npm test` (all tests pass), and `npm run build` (clean compilation).

---

### 3. Tournament Invariants (Non-Negotiable)
1. **Physical Resource Integrity**:
   - 1 VALORANT match requires exactly 2 teams and 10 active players (5 players per team).
   - 1 match requires 1 station with 10 working, AVAILABLE PCs.
   - An unavailable PC (`OFFLINE`, `MAINTENANCE`, `TECHNICAL_ISSUE`, `RESERVED`) must **never** be assigned to a station for active match play.
   - Effective match capacity for a lab = `floor(available_working_PCs / 10)` up to the number of configured stations.
2. **Scheduling Conflicts**:
   - A team must **never** be scheduled in two places simultaneously.
   - A station must **never** host two matches simultaneously.
   - A match can only start if all predecessor matches (dependencies) have completed with verified results.
   - Buffer duration between consecutive matches on the same station must be honored.
3. **State Machine Invariants**:
   - **Tournament Status**: `DRAFT` → `READY` → `FINALIZED` → `LIVE` → `COMPLETED` (or `ARCHIVED`).
   - No arbitrary jumps. `FINALIZED` locks fixtures, brackets, labs, and formats.
   - Admin unlock requires explicit confirmation, reason, and an immutable audit log.
   - **Match Status**: `SCHEDULED` → `CALLED` → `READY` → `LOBBY_READY` → `LIVE` → `FINISHED` (or `PAUSED`) → `RESULT_PENDING` → `VERIFIED` (or `FORFEIT` / `CANCELLED`).
   - Only `VERIFIED` results trigger winner advancement in the bracket.
4. **Data Integrity & Immutability**:
   - Never permanently delete teams, matches, or audit records during active operations. Use soft-deletion or status flags (`DISQUALIFIED`, `CANCELLED`).
   - Fixture regeneration is strictly prohibited once a tournament is `FINALIZED` or `LIVE` unless unlocked by a SUPER_ADMIN with recorded audit rationale.

---

### 4. Database Rules
- Use PostgreSQL via Prisma ORM.
- Enforce relational integrity with foreign keys, compound unique constraints, and indexes on critical query paths (e.g., `tournamentId + status`, `matchId + stationId`, `teamId + tournamentId`).
- Use database transactions (`prisma.$transaction`) for all multi-step state mutations (e.g., result verification + winner bracket advancement + station release).
- Every state change or admin mutation must write an entry to `AuditLog`.

---

### 5. UI & UX Conventions
- **Operator Usability Over Flashy Visuals**: High contrast, dense information display, responsive, zero distracting animations.
- **Fast 1-2 Click Operations**: Match status toggles, call teams, pause match, submit score, check-in player.
- **Confirmation Modals**: Required for destructive or irreversible actions (Unlock Tournament, Disqualify Team, Forfeit Match, Overwrite Result).
- **Clear Error Messaging**: Always provide (1) what went wrong, (2) the root cause, and (3) actionable recovery advice.
- **Dedicated Interfaces**:
  - `/admin/*`: Comprehensive multi-column desktop control center.
  - `/volunteer/*`: Mobile-first, large touch buttons (≥48px), high legibility in dim LAN environments.
  - `/display/:tournamentId`: Read-only, auto-updating, dark-mode projector board without admin controls.

---

### 6. Testing Requirements
- **Domain Engine Unit Tests**: 100% coverage of bracket generation, BYE placement, seeder algorithms, fixture conflict detection, and state machine transitions.
- **Edge Cases**: Brackets with 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 teams; asymmetric labs, unavailable PCs, sudden PC failures during live matches.
- **Integration Tests**: End-to-end tournament lifecycle simulation (`scripts/simulate-tournament.ts` and automated test suite).

---

### 7. Forbidden Shortcuts
- [PROHIBITED] Hardcoding lab count, PC count, or station sizes.
- [PROHIBITED] Hardcoding tournament brackets or team slots in React JSX.
- [PROHIBITED] Dividing total PC count by 10 without checking station and lab boundaries.
- [PROHIBITED] Advancing brackets on unverified scores.
- [PROHIBITED] Client-only permission checks.
- [PROHIBITED] Raw SQL or unvalidated JSON input.
- [PROHIBITED] Placeholder "TODO" in critical paths.
