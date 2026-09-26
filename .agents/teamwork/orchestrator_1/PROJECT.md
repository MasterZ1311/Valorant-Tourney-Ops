# Project: VALORANT Tournament Operations System (VTO)

## Architecture
- **Layer 1: Domain/Engine Layer** (`src/lib/tournament/`, `src/lib/scheduling/`): Pure deterministic TypeScript logic, zero React, zero direct DB dependencies. Covers Single Elimination, Round Robin, Group Stage, DAG advancement, state machines, pre-flight validator, capacity evaluator, heuristic fixture scheduler.
- **Layer 2: Service Layer** (`src/services/`): Orchestration, Prisma queries with `$transaction`, state transitions, audit logging, soft deletion, and seed data.
- **Layer 3: Security & API Layer** (`src/lib/auth/`, `src/middleware.ts`, `src/app/api/`): RBAC session handling, role enforcement (SUPER_ADMIN, TOURNAMENT_ADMIN, COORDINATOR, VOLUNTEER, RESULTS_OFFICIAL, VIEWER), Zod schema payload validation.
- **Layer 4: UI & Operations Layer** (`src/app/`, `src/components/`): Admin setup wizard, KPI metrics, attendance desk, bracket/fixture viewer, live match control, mobile-first volunteer interface (>=48px touch targets), confirmation modals.
- **Layer 5: Verification & Simulation** (`tests/`, `scripts/simulate-tournament.ts`): Unit tests, database tests, integration tests, E2E tests, tournament simulation.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Prisma Schema Enhancements | Compound unique constraints on Team, PC, Round, Match, Player, Lab, Station; UserRole enum; soft-delete deletedAt | M1 | Task 1 & docs/DATABASE.md |
| 2 | Seed Script | Seed 13 teams (65 players), 40 PCs across 2 labs (Lab 1: 30 PCs/3 st, Lab 2: 10 PCs/1 st), Admin user, Settings | M1 | Task 1 & ORIGINAL_REQUEST.md |
| 3 | Database Utilities & Soft Delete | Prisma transaction helpers, audit logger, soft-delete helpers and queries | M1 | Task 1 & GEMINI.md |
| 4 | Database Test Suite | Tests for relational cascading, compound uniqueness, soft-deletion | M1 | Task 1 & GEMINI.md |
| 5 | Round Robin Engine | Berger Cyclic Pairing Algorithm, odd/even BYEs, standings (Points > H2H > Diff > Won), tiebreakers | M2 | Task 2 & docs/TOURNAMENT_ENGINE.md |
| 6 | Group Stage + Knockout Engine | Snake seeding from pots, multi-group round-robin fixtures, standings, crossover knockout advancement | M2 | Task 2 & docs/TOURNAMENT_ENGINE.md |
| 7 | Single Elimination Edge Cases & 10th Check | Test N=1 team error; implement 10th pre-flight check (conflict-free schedule verification) | M2 | Task 2 & docs/ARCHITECTURE.md |
| 8 | Tournament Domain Unit Tests | Unit tests for 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 teams, Round Robin, Group Stage, validator | M2 | Task 2 & ORIGINAL_REQUEST.md |
| 9 | Scheduling Soft Heuristics | Lab Locality (minimize team lab switching) and Station Wear Leveling (balance station load) | M3 | Task 3 & docs/SCHEDULING.md |
| 10 | Dynamic Station Failure Reallocation | Reassign pending fixtures when station/PC fails mid-tournament | M3 | Task 3 & docs/SCHEDULING.md |
| 11 | Multi-Format Scheduling | Enable scheduling of Round Robin and Group Stage fixtures onto stations | M3 | Task 3 & docs/SCHEDULING.md |
| 12 | Scheduling Engine Edge-Case Tests | Buffer compliance tests, zero capacity error tests, asymmetric lab failure tests | M3 | Task 3 & ORIGINAL_REQUEST.md |
| 13 | Authentication & Session Management | Lightweight session handler, login route, credential hashing | M4 | Task 6 & docs/ARCHITECTURE.md |
| 14 | Next.js Middleware & RBAC Protection | Route and API protection enforcing permissions across all 6 roles | M4 | Task 6 & GEMINI.md |
| 15 | Zod Request Validation | Runtime schema validation for all API route payloads | M4 | Task 6 & GEMINI.md |
| 16 | Database Service Layer | Transition API routes from in-memory store to Prisma services with transaction and audit logging | M4 | Task 6 & GEMINI.md |
| 17 | Tournament Creation Wizard | Multi-step tournament setup at /admin/tournaments/new | M5 | Task 4 & docs/USER_GUIDE.md |
| 18 | Admin Management & CSV Import | Team & player management with CSV roster import, Lab & PC hardware management | M5 | Task 4 & docs/OPERATIONS.md |
| 19 | UI Confirmation Modals | Custom accessible confirmation dialogs replacing forbidden window.confirm | M5 | Task 4 & GEMINI.md |
| 20 | Attendance Desk Interface | Dedicated team check-in and roster verification interface at /admin/attendance | M6 | Task 5 & docs/OPERATIONS.md |
| 21 | State Machine Invariant UI Enforcement | Match transitions strictly enforce LOBBY_READY and RESULT_PENDING; prevent volunteer auto-advance | M6 | Task 5 & GEMINI.md |
| 22 | Official Result Verification Workflow | 2-phase result entry: volunteer submits RESULT_PENDING; Results Official verifies and advances winner | M6 | Task 5 & GEMINI.md |
| 23 | Mobile-First Volunteer UI (>=48px) | High-contrast, large touch button interface for station marshals, incident logging | M6 | Task 5 & GEMINI.md |
| 24 | QA Test Infrastructure & Lint Configuration | Configure .eslintrc.json for clean npm run lint; install @vitest/coverage-v8 for coverage reporting | M7 | Task 7 & docs/TESTING.md |
| 25 | Comprehensive Test Suites | Integration tests, API tests, Playwright E2E tests, security RBAC tests, defect remediation | M7 | Task 7 & ORIGINAL_REQUEST.md |
| 26 | Production Hardening & Clean Simulation | Verify scripts/simulate-tournament.ts runs cleanly from 13 teams to champion; clean tsc, test, lint, build | M8 | Task 8 & GEMINI.md |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Database Architecture & Dev Tournament Seed | Features 1, 2, 3, 4 (Prisma schema, unique constraints, soft delete, seed.ts, db-utils, db tests) | none | PLANNED |
| M2 | Tournament Domain Engine | Features 5, 6, 7, 8 (Round Robin, Group Stage, 10th validator check, 1-team test, format unit tests) | none | PLANNED |
| M3 | Physical Tournament Scheduling Engine | Features 9, 10, 11, 12 (Soft heuristics, dynamic station reallocation, multi-format scheduling, tests) | M2 | PLANNED |
| M4 | Authentication, RBAC & Service Layer | Features 13, 14, 15, 16 (Auth, session, middleware, Zod schemas, Prisma services, audit logging) | M1 | PLANNED |
| M5 | Admin Dashboard & Tournament Setup Experience | Features 17, 18, 19 (Wizard /admin/tournaments/new, CSV import, custom confirmation modals, dynamic routing) | M4 | PLANNED |
| M6 | Tournament-Day Operational Interface | Features 20, 21, 22, 23 (Attendance desk, 2-phase result verification, state invariant UI, mobile volunteer UI >=48px) | M4, M5 | PLANNED |
| M7 | Independent QA Engineering & Defect Remediation | Features 24, 25 (Lint config, coverage, integration tests, API tests, Playwright tests, defect fixes) | M3, M6 | PLANNED |
| M8 | End-to-End Simulation & Production Hardening | Feature 26 (scripts/simulate-tournament.ts, full verification: tsc, test, lint, build) | M7 | PLANNED |

## E2E Testing Track
- **Scope**: Parallel requirement-driven test suite creation covering Tiers 1-4.
- **Milestone E2E**: Published upon `TEST_READY.md`.

## Interface Contracts
### Database ↔ Service Layer
- `prisma/schema.prisma` provides models: `Tournament`, `Team`, `Player`, `Venue`, `Building`, `Lab`, `Station`, `PC`, `Round`, `Match`, `MatchResult`, `AuditLog`.
- `src/services/tournament.service.ts`: `createTournament`, `finalizeTournament`, `unlockTournament`, `startLive`.
- `src/services/match.service.ts`: `transitionMatchStatus`, `submitResult`, `verifyResult`.
- `src/services/scheduling.service.ts`: `generateTournamentSchedule`, `reallocateStation`.

### Domain Engine ↔ Scheduling Engine
- `BracketStructure`: `{ rounds: RoundData[] }` with DAG nodes (`matchId`, `nextMatchId`, `nextMatchSlot`).
- `RoundRobinStructure`: `{ rounds: { roundNumber: number, matches: MatchData[] }[], standings: TeamStanding[] }`.
- `SchedulingOptions`: `{ matchDurationMinutes: number, bufferDurationMinutes: number, startTime: Date, operationalStations: DomainStation[] }`.
- `SchedulingResult`: `{ fixtures: ScheduledFixture[], estimatedEndTime: Date, conflicts: SchedulingConflict[] }`.

### Auth & Security ↔ API Routes
- `UserRole`: enum `['SUPER_ADMIN', 'TOURNAMENT_ADMIN', 'COORDINATOR', 'VOLUNTEER', 'RESULTS_OFFICIAL', 'VIEWER']`.
- `requireRole(req, roles: UserRole[])`: Throws 401/403 or redirects.
- `validateBody(schema: ZodSchema)`: Returns validated payload or 400 Bad Request.

## Code Layout
- `prisma/schema.prisma`: Database schema, enums, indexes, constraints.
- `prisma/seed.ts`: Seed script (13 teams, 65 players, 40 PCs in 2 labs).
- `src/lib/tournament/`: Domain engine algorithms (`bracket.ts`, `round-robin.ts`, `group-stage.ts`, `state-machine.ts`, `validator.ts`, `types.ts`).
- `src/lib/scheduling/`: Scheduling engine algorithms (`capacity.ts`, `scheduler.ts`, `types.ts`).
- `src/lib/auth/`: Session, password hashing, RBAC definitions.
- `src/lib/validations/`: Zod schemas for all tournament, match, team, venue payloads.
- `src/services/`: Database business service layer using Prisma transactions and audit logging.
- `src/middleware.ts`: Next.js edge route protection.
- `src/app/admin/`: Admin desktop dashboard, wizard, attendance, fixtures, bracket.
- `src/app/volunteer/`: Mobile-first volunteer operations.
- `src/components/ui/modal.tsx`: Custom accessible confirmation dialogs.
- `tests/unit/`: Domain and scheduling unit tests.
- `tests/db/`: Database integration and constraint tests.
- `tests/security/`: Role-based access control and API protection tests.
- `tests/integration/`: Service and state transition integration tests.
- `tests/e2e/`: End-to-end user journey tests.
- `scripts/simulate-tournament.ts`: 13-team end-to-end tournament lifecycle simulation script.
