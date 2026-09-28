# Comprehensive Investigation Report: QA, Test Infrastructure, Simulation & System Health (Tasks 7 & 8)

**Author**: Survey Explorer 3 (QA, Testing & System Health Specialist)  
**Date**: 2026-09-26  
**Project**: VALORANT Tournament Operations System (VTO)  
**Working Directory**: `e:/Github/Valorant Brackets/.agents/teamwork/survey_explorer_3/`  
**Project Root**: `e:/Github/Valorant Brackets`  

---

## Executive Summary

A comprehensive, read-only architectural investigation was conducted across the testing infrastructure, simulation capabilities, build health, code quality, and operational invariants for **Task 7 (Independent QA Engineering Status)** and **Task 8 (End-to-End Simulation & Production Hardening)**.

### Key Headline Metrics:
- **TypeScript Compilation (`npx tsc --noEmit`)**: **PASSED (0 errors)**. Strict mode clean.
- **Unit Test Suite (`npm test` / Vitest)**: **PASSED (4 test files, 29 tests passing)**.
- **Next.js Production Build (`npm run build`)**: **PASSED (14 pages + 10 dynamic API routes compiled)**.
- **End-to-End Simulation (`npm run simulate`)**: **PASSED (13 teams to champion, 1 incident simulated)**.
- **Linter (`npm run lint`)**: **FAILED (Exit code 1 — ESLint unconfigured, no `.eslintrc.json`)**.
- **Test Coverage (`npx vitest run --coverage`)**: **FAILED (Missing dependency `@vitest/coverage-v8`)**.
- **Integration Tests**: **0% (0 test files in `tests/integration/`)**.
- **E2E / Playwright Setup**: **0% (Playwright not installed, no config, 0 tests)**.
- **Database / API Tests**: **0% (API routes use in-memory mock store; `prisma/seed.ts` missing)**.
- **Critical Defects & Invariant Violations Discovered**: **11 defects identified** (including score advancement bypassing verification, fixture regeneration on finalized tournaments, state machine bypass in API mutations, and unauthenticated endpoints).

---

## 1. Current State of Tests & Test Infrastructure

### 1.1 Unit Test Architecture (`tests/unit/`)
The existing unit tests test the domain layer in isolation with `vitest` v2.1.3:

| Test File | Test Count | Status | Execution Time | Coverage Scope |
|---|:---:|:---:|:---:|---|
| `tests/unit/bracket-engine.test.ts` | 17 | PASSED | ~50ms | Power-of-2 sizing (2, 4, 8, 16), arbitrary team counts (2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32), BYE allocation for top seeds, winner advancement. |
| `tests/unit/scheduling-engine.test.ts` | 3 | PASSED | ~28ms | 40 PC capacity (Lab 1: 30, Lab 2: 10), capacity reduction with 5 offline PCs, 13-team conflict-free fixture schedule. |
| `tests/unit/state-machine.test.ts` | 7 | PASSED | ~20ms | Legal tournament lifecycle, admin unlock, illegal DRAFT→LIVE jump, standard match lifecycle, tech pause/resume, illegal LIVE→VERIFIED jump. |
| `tests/unit/validator.test.ts` | 2 | PASSED | ~20ms | Validation rejection when teams have <5 players; validation approval with complete 13-team, 4-station setup. |
| **Total** | **29** | **ALL PASS** | **~118ms** | **Exclusively domain-level algorithms in `src/lib/`** |

### 1.2 Test Gaps in Current Unit Tests:
1. **Bracket Engine (`bracket-engine.test.ts`)**:
   - **Missing 1-team edge case test**: `bracket.ts:61` throws `Error("A tournament requires at least 2 participants.")`, but there is no unit test verifying this error handling.
   - **Missing Formats**: GEMINI.md Section 1 & Task 2 require Single Elimination, Round Robin, and Group Stage + Knockout. There are **zero tests** and **zero implementations** for Round Robin (`round-robin.ts`) or Group Stage (`group-stage.ts`).
   - **Tie Score Advancement**: Does not test that tied scores (e.g. 13-13) are rejected from advancing.
2. **Scheduling Engine (`scheduling-engine.test.ts`)**:
   - Only 3 test cases exist.
   - Missing test for asymmetric labs with non-multiples of 10 PCs (e.g. 14 PCs = 1 station of 10 + 4 spare PCs).
   - Missing test for mid-tournament PC failures causing dynamic station evacuation.
   - Missing test for zero operational stations (e.g. all stations have <10 working PCs).
   - Missing test for invalid inputs (negative match duration or negative buffer).
3. **State Machine (`state-machine.test.ts`)**:
   - Only 7 test cases exist.
   - Missing tests for `FORFEIT` and `CANCELLED` branches.
   - Missing tests for role-based transition authorization.
   - Missing tests enforcing that admin unlock requires an audit log reason.
4. **Validator (`validator.test.ts`)**:
   - Only 2 test cases exist.
   - Pre-flight pipeline defines 10 criteria; only team count <2 and roster <5 are tested for failure.
   - No test verifies duplicate player detection across rosters.
   - No test verifies behavior when fixture schedule contains conflicts.

### 1.3 Missing Test Layers

#### Integration Tests (`tests/integration/`):
- **Current Count**: 0 files.
- **Required**:
  1. Complete multi-step lifecycle: DRAFT → READY → pre-finalization checks → FINALIZED lock → LIVE matches → Volunteer score submission → Official score verification → Winner advancement → Next round schedule activation → COMPLETED.
  2. Database relational integrity: Foreign key constraints, compound unique indexes (`matchId + slot`), cascade deletions, soft deletion (`status = DISQUALIFIED`).
  3. Concurrent match execution across shared labs.

#### API Contract & Route Tests (`tests/api/`):
- **Current Count**: 0 files.
- **Required**:
  1. Contract tests for all 10 API routes under `src/app/api/tournaments/**`.
  2. Validation error tests (Zod schema rejection returning 400 with structured issue payload).
  3. Status mutation checks (verifying 400 when invalid transition requested).
  4. Finalization lock enforcement (verifying 400 when trying to regenerate fixtures on finalized tournament).

#### Security & Role-Based Access Control Tests (`tests/security/`):
- **Current Count**: 0 files.
- **Required**:
  1. Role permissions matrix testing across `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `COORDINATOR`, `VOLUNTEER`, `RESULTS_OFFICIAL`, `VIEWER`.
  2. Route protection tests (preventing unauthenticated or unauthorized role access to `/admin/*`, `/api/tournaments/*/validate`).
  3. Audit log immutability and actor attribution.

#### End-to-End (E2E) Browser Tests (`tests/e2e/`):
- **Current Count**: 0 files.
- **Framework Status**: `@playwright/test` is **not installed** in `package.json`. No `playwright.config.ts`.
- **Required Workflows**:
  1. Desktop Admin setup wizard: Create tournament, add teams, configure labs/stations, generate bracket, run pre-finalization validation, lock tournament.
  2. Mobile Volunteer flow (`/volunteer`): View assigned station, Call Teams (≥48px button), Confirm Seated, Start Match, Technical Pause, Resume, Submit Score.
  3. TV Display board (`/display/[id]`): View-only scoreboard, 8-second polling without layout shift, zero admin controls exposed.
  4. Cross-viewport testing: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667, 390x844).

---

## 2. Current Build, Lint & Test Health

Commands were executed synchronously on the workspace to verify health:

| Command | Status | Output / Findings |
|---|:---:|---|
| `npx tsc --noEmit` | **PASS (Exit 0)** | Zero TypeScript compiler errors. Strict mode is clean across all 78 source files. |
| `npm test` (`vitest run`) | **PASS (Exit 0)** | 4 test files, 29 tests passed in 2.96s. |
| `npm run simulate` | **PASS (Exit 0)** | Successfully executes full 13-team single elimination simulation, resolves 1 incident, crowns Sentinels Academy champion. |
| `npm run build` (`next build`) | **PASS (Exit 0)** | Successfully created production build for 14 static pages and 10 dynamic API routes. |
| `npm run lint` (`next lint`) | **FAIL (Exit 1)** | Fails with prompt `? How would you like to configure ESLint?`. ESLint configuration file (`.eslintrc.json`) is completely missing from repo. |
| `npx vitest run --coverage` | **FAIL (Exit 1)** | Fails with `MISSING DEPENDENCY: Cannot find dependency '@vitest/coverage-v8'`. |
| `npm run prisma:seed` | **FAIL** | Targets `prisma/seed.ts` which does not exist. |

---

## 3. End-to-End Simulation Script Analysis (`scripts/simulate-tournament.ts`)

The simulation script is well-structured and executes a complete tournament lifecycle at the domain engine level:

### Strengths:
1. **Realistic 13-Team, 40-PC Setup**:
   - 13 registered teams with 5 players each (65 total players).
   - Lab 1: 30 PCs (3 stations of 10).
   - Lab 2: 10 PCs (1 station of 10).
   - Accurately asserts 4 simultaneous match capacity (`line 125`).
2. **Proper Power-of-2 Bracket & Seeding**:
   - Bracket size: 16 slots, 4 rounds, 3 BYEs.
   - Top 3 seeds (Sentinels Academy, Fnatic Rising, Paper Rex Youth) awarded BYEs into Quarterfinals (`lines 135-139`).
3. **Fixture Generation with Zero Conflicts**:
   - 12 playable matches + 3 BYE matches scheduled across 4 stations (`line 152`).
   - Asserts 0 schedule conflicts (`line 154`).
4. **Pre-Finalization Validation**:
   - Executes 8 distinct checks (`line 160-178`) and asserts `canFinalize === true`.
5. **Simulated Hardware Incident**:
   - Simulates technical pause on Round 1 Match 2 (Audio headset disconnect on PC-14).
   - Transitions match `LIVE` → `PAUSED` → `LIVE` with resolution log (`lines 208-220`).
6. **Round-by-Round Advancement to Grand Finals**:
   - R1 (Round of 16) → R2 (Quarterfinals) → R3 (Semifinals) → R4 (Grand Finals).
   - Crowns Seed #1 Sentinels Academy champion over Seed #2 Fnatic Rising.

### Gaps & Production Hardening Needed for Task 8:
1. **Domain Engine Only**: The script invokes pure functions (`generateSingleEliminationBracket`, `evaluateLabCapacity`, `generateFixtures`) directly in memory. It **never exercises the Next.js API endpoints, HTTP layer, or Prisma database**.
2. **No Forfeit / DQ Simulation**: Does not simulate a team no-show, disqualification, or match forfeit.
3. **No Dynamic PC Breakdown Mid-Match**: Does not test a station failing during live play and reallocating remaining matches to alternate stations.
4. **No Alternate Formats**: Round Robin and Group Stage are not exercised.
5. **No Verification Role Segregation**: In the script, the simulation code directly mutates `match.status = "VERIFIED"` and calls `advanceBracketWinner`, simulating the official rather than testing that unauthorized actors cannot advance.

---

## 4. Full Defect & Invariant Violation Inventory

The following 11 defects were identified during the codebase inspection:

### [DEFECT-01] Critical Invariant Violation: Volunteer UI Bypasses Score Verification
- **Severity**: CRITICAL
- **Location**: `src/app/volunteer/page.tsx:65-82` & `src/app/api/tournaments/[id]/bracket/route.ts:18-28`
- **Violated Rule**: GEMINI.md Rule 3 ("Match Status: ... LIVE -> FINISHED -> RESULT_PENDING -> VERIFIED... Only VERIFIED results trigger winner advancement in the bracket") & Rule 7 (" NO advancing brackets on unverified scores").
- **Current Behavior**: When a volunteer clicks "Submit Score" on mobile, the frontend directly calls `POST /api/tournaments/[id]/bracket` with `{ action: "ADVANCE", matchId, winnerId, scoreA, scoreB }`, which immediately advances the bracket.
- **Expected Behavior**: Volunteer submission must set status to `RESULT_PENDING`. Only a user with role `RESULTS_OFFICIAL` or `SUPER_ADMIN` reviewing the result can verify and trigger `advanceBracketWinner`.

### [DEFECT-02] High Severity: Fixtures & Brackets Regenerable on Locked/Live Tournaments
- **Severity**: HIGH
- **Location**: `src/app/api/tournaments/[id]/bracket/route.ts:31` & `src/app/api/tournaments/[id]/fixtures/route.ts:17`
- **Violated Rule**: GEMINI.md Rule 3 ("Fixture regeneration is strictly prohibited once a tournament is `FINALIZED` or `LIVE` unless unlocked by a SUPER_ADMIN with recorded audit rationale").
- **Current Behavior**: Any POST to `/api/tournaments/[id]/fixtures` or `/api/tournaments/[id]/bracket` regenerates fixtures/brackets immediately without checking if tournament status is `FINALIZED` or `LIVE`.
- **Expected Behavior**: Return HTTP 400/403 with error `"Cannot regenerate fixtures on a FINALIZED or LIVE tournament without explicit admin unlock"`.

### [DEFECT-03] High Severity: State Machine Invariants Bypassed in Store Mutations
- **Severity**: HIGH
- **Location**: `src/lib/store/tournament-store.ts:275-286, 401-417` & `src/app/api/tournaments/[id]/matches/[matchId]/route.ts`
- **Violated Rule**: GEMINI.md Rule 3 ("No arbitrary jumps").
- **Current Behavior**: `store.updateMatchStatus` and `store.updateTournamentStatus` assign new status directly to the match/tournament object without calling `canTransitionMatch` or `canTransitionTournament`. An API caller can jump directly from `SCHEDULED` to `VERIFIED` or `DRAFT` to `LIVE`.
- **Expected Behavior**: Methods must call `validateMatchTransition` and `validateTournamentTransition` and throw if the transition is illegal.

### [DEFECT-04] High Severity: ESLint Missing Configuration Breaking CI/CLI
- **Severity**: HIGH
- **Location**: Root directory (missing `.eslintrc.json`) & `package.json:9`
- **Current Behavior**: Running `npm run lint` halts with an interactive prompt asking how to configure ESLint, exiting with code 1 in non-interactive CI environments.
- **Expected Behavior**: `.eslintrc.json` extending `"next/core-web-vitals"` must exist, allowing `npm run lint` to execute cleanly with 0 errors.

### [DEFECT-05] High Severity: Missing Prisma Seed Script
- **Severity**: HIGH
- **Location**: `prisma/seed.ts` (referenced in `package.json:15`)
- **Current Behavior**: `npm run prisma:seed` fails because `prisma/seed.ts` does not exist.
- **Expected Behavior**: A complete Prisma seed script that populates the PostgreSQL database with the standard 13-team, 40-PC tournament as specified in Task 1.

### [DEFECT-06] Medium Severity: Architectural Disconnect Between Prisma DB and Next.js Store
- **Severity**: MEDIUM
- **Location**: `src/lib/store/tournament-store.ts` vs `prisma/schema.prisma`
- **Current Behavior**: The Next.js API routes and UI components interact exclusively with an in-memory `TournamentStore` singleton. The Prisma schema (`prisma/schema.prisma`, 536 lines) and database models are not connected to the API layer (`src/services/` does not exist).
- **Impact**: All tournament data resets when the server process restarts. Relational database constraints and Prisma transaction integrity (`prisma.$transaction`) are never exercised during application execution.

### [DEFECT-07] Medium Severity: Missing Test Coverage Dependency
- **Severity**: MEDIUM
- **Location**: `package.json` devDependencies
- **Current Behavior**: `npx vitest run --coverage` fails with `Cannot find dependency '@vitest/coverage-v8'`.
- **Expected Behavior**: `@vitest/coverage-v8` should be installed and configured in `vitest.config.ts`, with a `"test:coverage": "vitest run --coverage"` script in `package.json`.

### [DEFECT-08] Medium Severity: Missing Tournament Formats
- **Severity**: MEDIUM
- **Location**: `src/lib/tournament/bracket.ts`, `ORIGINAL_REQUEST.md` Task 2, `docs/ROADMAP.md` WS3
- **Current Behavior**: Only Single Elimination is implemented. Round Robin (`round-robin.ts`) and Group Stage + Knockout (`group-stage.ts`) are completely absent from both source code and unit tests.
- **Expected Behavior**: Implement Berger cyclic tables for Round Robin and group standing calculators (Points > H2H > Round Diff), with comprehensive unit tests.

### [DEFECT-09] Medium Severity: Unchecked Durations in Fixture Scheduler
- **Severity**: MEDIUM
- **Location**: `src/lib/scheduling/scheduler.ts:37-38`
- **Current Behavior**: No validation checks if `matchDurationMinutes <= 0` or `bufferDurationMinutes < 0`. If 0 or negative values are supplied, `chosenStartTime + matchDurationMs` creates backwards or collapsed fixture timelines.
- **Expected Behavior**: Throw an error if `matchDurationMinutes < 15` or `bufferDurationMinutes < 0`.

### [DEFECT-10] Medium Severity: Duplicate Player Cross-Team Check Missing from Pre-Finalization Validator
- **Severity**: MEDIUM
- **Location**: `src/lib/tournament/validator.ts`
- **Current Behavior**: `validator.ts` checks minimum team count, 5 players per team, venue capacity, etc., but does not check if the same player (by `riotId` or `collegeId`) is registered on multiple teams.
- **Expected Behavior**: Pre-flight validation should verify that every player ID/Riot ID is unique across all tournament rosters.

### [DEFECT-11] High Severity: Zero Authentication / Authorization on API Endpoints
- **Severity**: HIGH
- **Location**: All routes in `src/app/api/tournaments/**`
- **Violated Rule**: GEMINI.md Section 1 ("Defense-in-Depth Security: Never trust frontend authorization alone. Validate permissions on every server route") & Task 6.
- **Current Behavior**: Every API route is unauthenticated. Any client can trigger state changes, submit results, or update PC statuses without session or role validation.
- **Expected Behavior**: Implement session authentication and role validation checking for `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `COORDINATOR`, `VOLUNTEER`, `RESULTS_OFFICIAL`, `VIEWER`.

---

## 5. Concrete Roadmap & Actionable Recommendations

### 5.1 Recommendations for Task 7: Independent QA Engineering

#### Phase 1: Test Infrastructure Completion
1. **Install Missing Testing Dependencies**:
   - `npm install -D @vitest/coverage-v8 @playwright/test @testing-library/react @testing-library/jest-dom`
2. **Configure Vitest Coverage**:
   - Update `vitest.config.ts` to include:
     ```ts
     test: {
       coverage: {
         provider: "v8",
         reporter: ["text", "json", "html"],
         include: ["src/lib/**/*.ts"],
         exclude: ["src/lib/**/*.d.ts"],
         thresholds: {
           lines: 95,
           functions: 95,
           branches: 90,
           statements: 95,
         },
       },
     }
     ```
3. **Configure ESLint**:
   - Add `.eslintrc.json`:
     ```json
     {
       "extends": "next/core-web-vitals"
     }
     ```

#### Phase 2: Domain Engine & Edge Case Unit Tests
Add the following test suites to `tests/unit/`:
1. `tests/unit/bracket-engine-edge.test.ts`:
   - 1-team tournament throws descriptive error.
   - Tied scores rejection during score advancement.
   - Non-existent matchId throws error in `advanceBracketWinner`.
   - Seed collision verification (Seed 1 and Seed 2 meet only in Grand Finals).
2. `tests/unit/round-robin.test.ts` (when WS3 implements `round-robin.ts`):
   - Odd vs even team cyclic pairings.
   - Standings calculation: match wins, round differential, head-to-head tiebreakers.
3. `tests/unit/scheduling-engine-edge.test.ts`:
   - Asymmetric lab sizing (e.g. 14 PCs, 25 PCs).
   - Zero operational station failure handling.
   - Negative and zero duration rejection.
   - Buffer duration boundary enforcement.
4. `tests/unit/validator-edge.test.ts`:
   - Duplicate player registration across Team A and Team B.
   - Station with 9 working PCs marked non-operational.
   - Fixture schedule with missing stations.

#### Phase 3: Integration & API Test Suites
Add the following integration test suites to `tests/integration/`:
1. `tests/integration/tournament-lifecycle.test.ts`:
   - Simulates complete flow via API routes:
     - Create tournament (`POST /api/tournaments`)
     - Add 13 teams (`POST /api/tournaments/[id]/teams`)
     - Check in teams (`PATCH /api/tournaments/[id]/teams`)
     - Generate bracket and fixtures
     - Run pre-finalization validation (`GET /api/tournaments/[id]/validate`)
     - Finalize tournament (`POST /api/tournaments/[id]/validate` with `action: "FINALIZE"`)
     - Verify bracket and fixtures cannot be regenerated once FINALIZED
     - Transition match through lifecycle (`SCHEDULED` → `CALLED` → `READY` → `LIVE` → `FINISHED` → `RESULT_PENDING`)
     - Official verifies score → triggers `VERIFIED` and advances bracket
     - Admin unlock requires audit reason
2. `tests/integration/api-validation.test.ts`:
   - Input validation on all endpoints: missing required fields, invalid status strings, negative scores.
3. `tests/integration/security-rbac.test.ts`:
   - Test each of the 6 roles against protected endpoints.
   - Ensure VIEWER cannot mutate match status (HTTP 403).
   - Ensure VOLUNTEER cannot finalize tournament or unlock brackets (HTTP 403).

#### Phase 4: Playwright End-to-End Test Suite
Set up `playwright.config.ts` with webServer pointing to `npm run start` (port 3000):
1. `tests/e2e/admin-workflow.spec.ts`:
   - Admin logs in, reviews dashboard KPI cards.
   - Inspects bracket visualizer, toggles PC status in PC grid, runs validation modal, locks tournament.
2. `tests/e2e/volunteer-mobile.spec.ts`:
   - Emulate mobile viewport (iPhone 14 / Pixel 7).
   - Verify touch targets $\ge 48\text{px}$.
   - Progress a match: Call Teams → Seated → Start → Tech Pause → Resume.
3. `tests/e2e/projector-display.spec.ts`:
   - Open `/display/[id]` in full-screen desktop viewport.
   - Verify live stations, upcoming queue, completed results.
   - Verify zero mutation controls or admin buttons exist on the page.

---

### 5.2 Recommendations for Task 8: End-to-End Simulation & Production Hardening

1. **Enhance `scripts/simulate-tournament.ts` to Support Multiple Modes**:
   - `--mode=engine` (current fast pure-domain in-memory execution).
   - `--mode=api` (executes against the running Next.js server via HTTP fetch to validate API routes, JSON contracts, and audit logging).
   - `--mode=db` (executes against PostgreSQL using Prisma client).
2. **Add Forfeit, Disqualification & PC Failure Scenarios**:
   - Add a simulation step where a team is disqualified or forfeits in Round 2, ensuring the bracket advances the opponent automatically with status `FORFEIT`.
   - Add a simulation step where a PC in Station 1 fails mid-match, the match is paused, Station 1 operational capacity drops, the match is rescheduled to Station 4, and resumed.
3. **Automate Verification Script**:
   - Create `scripts/verify-all.ts` (or npm script `"verify"`) that executes in sequence:
     ```bash
     npm run lint && npx tsc --noEmit && npm test && npm run simulate && npm run build
     ```
   - Enforce this verification gate before any pull request or deployment.
4. **Create `prisma/seed.ts`**:
   - Implement database seeding for the standard 13-team, 40-PC tournament so `npm run prisma:seed` works out-of-the-box.
5. **Bridge Service Layer (`src/services/`)**:
   - Implement `TournamentService`, `BracketService`, `SchedulingService`, `AttendanceService`, and `AuditService` that wrap Prisma transactions and domain models, ensuring persistence across restarts.

---

## 6. Verification Method

To independently reproduce and verify all findings documented in this report:

```bash
# 1. Verify TypeScript compilation (expect 0 errors):
npx tsc --noEmit

# 2. Verify current unit test execution (expect 4 files, 29 tests pass):
npm test

# 3. Verify simulation script execution (expect clean completion to champion):
npm run simulate

# 4. Verify Next.js production build (expect clean compilation):
npm run build

# 5. Verify ESLint failure due to missing config (expect exit code 1):
npm run lint

# 6. Verify missing Vitest coverage dependency (expect exit code 1):
npx vitest run --coverage

# 7. Verify missing prisma/seed.ts (expect file not found):
npm run prisma:seed
```

---
*Report completed by Survey Explorer 3. All findings are verified through direct file inspection and command execution.*
