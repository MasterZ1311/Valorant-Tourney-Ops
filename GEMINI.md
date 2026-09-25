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

### 2. Coding Standards & Naming Conventions
- **TypeScript**: Strict mode enabled (`strict: true`, `noImplicitAny: true`). No `any` types; use precise discriminated unions for statuses and state transitions.
- **Naming**:
  - Files: `kebab-case.ts` / `kebab-case.tsx` (e.g. `bracket-generator.ts`, `match-card.tsx`).
  - React Components: `PascalCase` (e.g. `MatchCard`, `LabConfigGrid`).
  - Functions & Variables: `camelCase` (e.g. `generateSingleEliminationBracket`, `availablePcs`).
  - Constants & Enums: `UPPER_SNAKE_CASE` (e.g. `MATCH_STATES`, `PC_STATUS`).
  - Interfaces/Types: `PascalCase` (e.g. `TournamentFixture`, `BracketNode`).
- **File Structure**:
  ```
  src/
  ├── app/                  # Next.js App Router (pages, layouts, route handlers)
  │   ├── (admin)/          # Admin operations dashboard & configuration
  │   ├── volunteer/        # Mobile-first match marshal / volunteer routes
  │   ├── display/          # Read-only public TV / projector screen
  │   └── api/              # RESTful API endpoints for external or decoupled services
  ├── components/           # UI components (shadcn/ui + custom tournament widgets)
  │   ├── ui/               # Base primitives (button, dialog, card, badge, table)
  │   ├── tournament/       # Brackets, match boards, fixture tables
  │   ├── venue/            # Lab, station, and PC management grids
  │   └── operations/       # Live match controls, incidents, penalties, announcements
  ├── lib/                  # Pure domain engines & utilities
  │   ├── tournament/       # Bracket algorithms, formats, BYE placement, advancement
  │   ├── scheduling/       # Resource allocation, PC constraints, conflict detection
  │   ├── validation/       # Zod schemas (tournament, match, team, venue, incident)
  │   └── db.ts             # Prisma client singleton
  ├── services/             # Application services (DB transactions, audit logging)
  └── types/                # Core domain types & Prisma re-exports
  ```

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
- ❌ NO hardcoding lab count, PC count, or station sizes.
- ❌ NO hardcoding tournament brackets or team slots in React JSX.
- ❌ NO dividing total PC count by 10 without checking station and lab boundaries.
- ❌ NO advancing brackets on unverified scores.
- ❌ NO client-only permission checks.
- ❌ NO raw SQL or unvalidated JSON input.
- ❌ NO placeholder "TODO" in critical paths.
