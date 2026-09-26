# Specification Mining & Architecture Survey Report: Tasks 1, 2, and 3
**VALORANT Tournament Operations System (VTO)**
**Investigator**: Survey Explorer 1 (Spec Miner)
**Date**: 2026-09-26
**Target Workstreams**: WS2 (Database & Models), WS3 (Tournament Engine), WS4 (Scheduling Engine), WS5 (State & Validation)
**Authoritative Sources Inspected**:
- `GEMINI.md` (System Principles, Invariants, Operational Rules)
- `.agents/teamwork/ORIGINAL_REQUEST.md` (Tasks 1, 2, 3 User Requirements)
- `docs/DATABASE.md` (Entity Relational Design & Data Dictionary)
- `docs/TOURNAMENT_ENGINE.md` (Tournament Formats & State Machine Invariants)
- `docs/BRACKET.md` (Bracket Math, Seeding, BYEs, and DAG Architecture)
- `docs/SCHEDULING.md` (Hardware Modeling, Capacity Recalculation, Fixture Rules)
- `docs/ARCHITECTURE.md` (Layering & Subagent Boundaries)
- `docs/ROADMAP.md` (Workstream Definitions & Verification Criteria)
- `docs/TESTING.md` & `docs/OPERATIONS.md` (Standard Operating Procedures & Test Strategy)
- Live Codebase: `prisma/schema.prisma`, `src/lib/db.ts`, `src/lib/tournament/*`, `src/lib/scheduling/*`, `src/lib/store/tournament-store.ts`, `tests/unit/*`, `scripts/simulate-tournament.ts`

---

## Executive Summary

A comprehensive investigation into the authoritative documentation and the existing VTO codebase was conducted for **Task 1 (Database Architecture)**, **Task 2 (Tournament Domain Engine)**, and **Task 3 (Physical Tournament Scheduling Engine)**.

### High-Level Status:
1. **Task 1 (Database Architecture)**:
   - `prisma/schema.prisma` is present and compiles cleanly with `npx prisma generate` (22 models, 12 enums).
   - **Gaps**: `prisma/seed.ts` is **completely missing**. `prisma/migrations` does not exist. Critical compound unique constraints (such as `[tournamentId, name]` on `Team`, `[labId, pcNumber]` on `PC`, `[tournamentId, roundNumber]` on `Round`, `[teamId, riotId, riotTag]` on `Player`) are missing in `schema.prisma`. Soft-deletion fields (`deletedAt`) are absent across models despite explicit requirements in `GEMINI.md` and `ORIGINAL_REQUEST.md`. No database test suite exists.
2. **Task 2 (Tournament Domain Engine)**:
   - Single Elimination bracket generation (`src/lib/tournament/bracket.ts`), state machine transitions (`state-machine.ts`), and pre-finalization validation (`validator.ts`) are implemented and covered by unit tests.
   - **Gaps**: **Round Robin** (Berger Cyclic Pairing Algorithm, tie-breaking rules) and **Group Stage + Knockout** (Snake seeding, pot distribution, crossover knockout) are **completely missing** from `src/lib/tournament/` (no `round-robin.ts` or `group-stage.ts`). Unit tests do not test edge case $N = 1$ team (which throws an unhandled error). The pre-flight validator implements 9 checkpoints rather than the 10 checkpoints documented in `ROADMAP.md` and `ARCHITECTURE.md`.
3. **Task 3 (Physical Tournament Scheduling Engine)**:
   - Dynamic PC capacity evaluation (`src/lib/scheduling/capacity.ts`) and conflict-free fixture scheduling (`src/lib/scheduling/scheduler.ts`) are implemented for Single Elimination brackets and pass tests for 13 teams / 40 PCs across 2 labs.
   - **Gaps**: Soft heuristic constraints (Lab Locality to reduce player migration and Station Wear Leveling) are not implemented. Mid-tournament station failure handling (dynamic rescheduling/reallocation) is absent. Scheduling only supports Single Elimination brackets; it cannot schedule Round Robin or Group Stage matches. Test suite lacks explicit checks for predecessor buffer compliance and zero-operational-station error handling.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Database | Schema Relational Definition | 22 Prisma models modeling entire LAN tournament lifecycle (Tournament, Teams, Players, Venues, Labs, Stations, PCs, Rounds, Matches, Results, Incidents, Penalties, AuditLog) | `prisma/schema.prisma` | Generated Prisma Client | Type error on invalid relation/syntax | `prisma/schema.prisma`, `docs/DATABASE.md` |
| 2 | Database | Dev Tournament Seeding | Seed script providing realistic development LAN tournament: 13 teams, 5 players each (65 players), 40 PCs in 2 labs (Lab 1: 30 PCs/3 stations, Lab 2: 10 PCs/1 station) | `npx tsx prisma/seed.ts` | Populated PostgreSQL database | Script exit code != 0 on failure | `ORIGINAL_REQUEST.md` Task 1, `package.json` |
| 3 | Database | Relational Integrity & Cascades | Cascading delete on parent-child entities (Tournament -> Teams -> Players; Venue -> Building -> Lab -> Station -> PC), SetNull on non-destructive references (Match -> Teams, Winner, Station) | Prisma schema definitions | Foreign key constraints enforced by DB | Foreign key constraint violation error | `docs/DATABASE.md`, `prisma/schema.prisma` |
| 4 | Database | Compound Uniqueness Constraints | Compound unique indexes preventing duplicate team names, duplicate PC numbers per lab, duplicate round numbers, duplicate roster entries | `@@unique` directives | Database unique constraint enforcement | P2002 Unique constraint failure | `GEMINI.md`, `docs/DATABASE.md` |
| 5 | Database | Soft Deletion Guarantee | Entities (Teams, Matches, Tournaments, PCs) are never permanently deleted during active operations; preserved with timestamp or status flags | `deletedAt DateTime?` or status enum | Filtered queries excluding soft-deleted records | Throws if attempting to mutate deleted entities | `GEMINI.md` § 3.4, `ORIGINAL_REQUEST.md` |
| 6 | Database | Immutable Audit Logging | Every state change, bracket edit, match result verification, or incident resolution writes an immutable record with actor, entity, diff, and timestamp | Actor ID, role, action, entity, beforeState, afterState | `AuditLog` row in database | Throws if transaction fails | `GEMINI.md` § 4, `docs/DATABASE.md` |
| 7 | Tournament | Single Elimination Bracket Gen | Smallest power-of-two sizing ($B = 2^{\lceil \log_2 N \rceil}$), recursive deterministic seed distribution, BYE placement to top seeds | `Participant[]` ($N \ge 2$) | `BracketStructure` (DAG rounds & matches) | Throws `Error` if $N < 2$ | `src/lib/tournament/bracket.ts`, `docs/BRACKET.md` |
| 8 | Tournament | Winner Advancement DAG | Propagates verified match winner into next round match node (`nextMatchId` and `nextMatchSlot`) | `BracketStructure`, `matchId`, `winnerId` | Updated `BracketStructure` | Throws if match or winner invalid | `src/lib/tournament/bracket.ts` |
| 9 | Tournament | Round Robin (Berger Cyclic Pairing) | Standard Berger rotation fixing Team 1 and rotating remaining $N-1$ teams. Supports even and odd teams (via dummy BYE). Alternating home/away. | `Participant[]` ($N \ge 2$) | `RoundRobinStructure` (rounds, matches, pairings) | Throws if $N < 2$ | `docs/TOURNAMENT_ENGINE.md` § 2.2 |
| 10 | Tournament | Round Robin Standings & Tiebreakers | Calculates points (3 win, 1 OT win, 0 loss), Head-to-Head, Round Differential, Total Rounds Won | Completed match results | Sorted standings table with tiebreaker rank | Throws if unresolvable tie requires playoff | `docs/TOURNAMENT_ENGINE.md` § 2.2 |
| 11 | Tournament | Group Stage + Knockout | Multi-group snake seeding from pots, internal round robin per group, top 2 advance to 8-team crossover knockout bracket | `Participant[]` (e.g. 16 teams), group count | Group stages fixtures + Knockout bracket DAG | Throws if team count incompatible | `docs/TOURNAMENT_ENGINE.md` § 2.3 |
| 12 | Tournament | Tournament State Machine | Enforces linear progression: `DRAFT` -> `READY` -> `FINALIZED` -> `LIVE` -> `COMPLETED` -> `ARCHIVED`. Admin unlock back to `READY`. | `current`, `target` `TournamentStatus` | `boolean` or void | Throws `Error` on illegal transition | `src/lib/tournament/state-machine.ts` |
| 13 | Tournament | Match State Machine | Enforces match lifecycle: `SCHEDULED` -> `CALLED` -> `READY` -> `LOBBY_READY` -> `LIVE` -> `PAUSED` -> `FINISHED` -> `RESULT_PENDING` -> `VERIFIED`. | `current`, `target` `MatchStatus` | `boolean` or void | Throws `Error` on illegal transition | `src/lib/tournament/state-machine.ts` |
| 14 | Tournament | 10-Point Pre-Flight Validator | Comprehensive 10-checkpoint validation before locking tournament into `FINALIZED` | `FinalizationData` | `ValidationReport` (`canFinalize`, checks) | Blocks finalization if critical checks fail | `docs/ARCHITECTURE.md`, `src/lib/tournament/validator.ts` |
| 15 | Scheduling | Physical Hardware Modeling | Models 1 VALORANT match = 2 teams = 10 players; 1 station = at least 10 working PCs. Working: AVAILABLE, ASSIGNED, IN_USE. Broken: OFFLINE, MAINTENANCE, TECHNICAL_ISSUE, RESERVED. | Lab and station hardware arrays | Operational station health flag | Station marked non-operational if working PCs < 10 | `src/lib/scheduling/capacity.ts`, `docs/SCHEDULING.md` |
| 16 | Scheduling | Dynamic Lab Capacity Evaluator | Recalculates working PCs and operational stations dynamically. Supports explicit station PC mapping and aggregate lab pool mode. | `DomainLab` definition | `DomainLab` with operational metrics | Capacity reduced if working PCs drop | `src/lib/scheduling/capacity.ts` |
| 17 | Scheduling | Venue Capacity Aggregator | Aggregates all labs into venue-wide metrics: total PCs, working PCs, offline PCs, operational stations, max simultaneous matches. | `DomainLab[]` | `VenueCapacityMetrics` | 0 simultaneous matches if no operational station | `src/lib/scheduling/capacity.ts` |
| 18 | Scheduling | Conflict-Free Fixture Scheduler | Generates time-slotted fixtures ensuring Station Exclusivity, Team Exclusivity, Predecessor Dependencies, and Hardware Integrity. | `BracketStructure`, `DomainStation[]`, `SchedulingOptions` | `SchedulingResult` (fixtures, end time, conflicts) | Throws if 0 operational stations available | `src/lib/scheduling/scheduler.ts` |
| 19 | Scheduling | Soft Heuristics (Locality & Wear) | Optimizes match assignments for Lab Locality (consecutive rounds in same lab) and Station Wear Leveling (balanced station usage). | Pending matches, operational stations | Optimized station assignments | Fallback to any operational station | `docs/SCHEDULING.md` § 3 |
| 20 | Scheduling | Mid-Tournament Station Reallocation | Dynamically reassigns pending fixtures when a PC fails mid-match or station becomes non-operational. | Broken station, pending fixtures, operational stations | Rescheduled fixtures with updated station/time | Throws or warns if capacity insufficient | `docs/SCHEDULING.md` § 2 |

---

## Edge Cases

| # | Feature | Input | Observed / Required Behavior |
|---|---------|-------|------------------------------|
| 1 | Single Elimination Bracket | $N = 1$ team | Code throws `Error("A tournament requires at least 2 participants.")`. Required: Must be explicitly verified in test suite. |
| 2 | Single Elimination Bracket | $N = 2$ teams | Bracket size 2, 0 BYEs, 1 round (Grand Finals), 1 match. Top seeds 1 vs 2. |
| 3 | Single Elimination Bracket | $N = 3$ teams | Bracket size 4, 1 BYE (Seed 1). Round 1 has 1 played match (Seed 2 vs 3) and 1 BYE match (Seed 1 auto-advances). |
| 4 | Single Elimination Bracket | $N = 5$ teams | Bracket size 8, 3 BYEs (Seeds 1, 2, 3). Round 1 has 1 played match (Seed 4 vs 5) and 3 BYE matches. |
| 5 | Single Elimination Bracket | $N = 7$ teams | Bracket size 8, 1 BYE (Seed 1). Round 1 has 3 played matches and 1 BYE. |
| 6 | Single Elimination Bracket | $N = 8$ teams | Bracket size 8, 0 BYEs. Exactly 4 matches in Round 1, 2 in Semis, 1 in Finals. |
| 7 | Single Elimination Bracket | $N = 9$ teams | Bracket size 16, 7 BYEs (Seeds 1-7). Round 1 has 1 played match (Seed 8 vs 9) and 7 BYEs. |
| 8 | Single Elimination Bracket | $N = 13$ teams (Dev Spec) | Bracket size 16, 3 BYEs (Seeds 1, 2, 3). Round 1: 5 played matches, 3 BYEs. Total 12 played matches. |
| 9 | Single Elimination Bracket | $N = 15$ teams | Bracket size 16, 1 BYE (Seed 1). Round 1: 7 played matches, 1 BYE. Total 14 played matches. |
| 10 | Single Elimination Bracket | $N = 16$ teams | Bracket size 16, 0 BYEs. All 8 matches played in Round 1. Total 15 played matches. |
| 11 | Single Elimination Bracket | $N = 17$ teams | Bracket size 32, 15 BYEs (Seeds 1-15). Round 1: 1 played match (Seed 16 vs 17), 15 BYEs. Total 16 played matches. |
| 12 | Single Elimination Bracket | $N = 32$ teams | Bracket size 32, 0 BYEs. 16 matches in Round 1. Total 31 played matches. |
| 13 | Single Elimination Seeding | Top seeds bracket collision | Seeds 1 and 2 are guaranteed to be placed in opposite bracket halves; they can only meet in Grand Finals. |
| 14 | Hardware Capacity | 40 PCs in 2 Labs (Lab 1: 30 PCs/3 stations, Lab 2: 10 PCs/1 station) | Operational stations = 4. Simultaneous match capacity = 4. |
| 15 | Hardware Capacity | 1 PC fails in Station 1 (9 working PCs) | Station 1 operational status becomes `false`. Working PCs = 39. Operational stations drops to 3. Simultaneous match capacity drops to 3. |
| 16 | Hardware Capacity | 1 PC fails in Lab 2 (9 working PCs) | Lab 2 Station 4 becomes non-operational. Total venue capacity drops from 4 to 3. |
| 17 | Hardware Capacity | 1 PC fails in each of all 4 stations (9 working PCs each) | All stations become non-operational. Operational stations = 0. Scheduler must throw error blocking fixture generation. |
| 18 | Fixture Scheduling | Consecutive matches on same station | Start time of Match $K+1$ must be $\ge$ End time of Match $K$ + `bufferDurationMinutes` (default 15m). |
| 19 | Fixture Scheduling | Predecessor match dependency | Match in Round $R+1$ cannot start until both feeder matches in Round $R$ are completed + buffer duration. |
| 20 | Fixture Scheduling | Team double-booking | No team can be assigned to two stations or overlapping time slots simultaneously. |
| 21 | Fixture Scheduling | BYE matches | BYE matches take 0 station time and do not consume physical stations. |
| 22 | State Machine | Skip from SCHEDULED or LIVE to VERIFIED | Blocked. Match must pass through `RESULT_PENDING` before verification. |
| 23 | State Machine | Technical Pause during LIVE | `LIVE` -> `PAUSED` -> `LIVE` is allowed; match retains station and score. |
| 24 | State Machine | Score dispute after submission | `RESULT_PENDING` -> `LIVE` is allowed if score is rejected/disputed by official. |
| 25 | State Machine | Overwrite verified result | `VERIFIED` -> `RESULT_PENDING` allowed only for admin override with audit log. |
| 26 | State Machine | Finalized tournament unlock | `FINALIZED` -> `READY` allowed only with explicit Super Admin reason and audit record. |
| 27 | Round Robin | Odd team count ($N = 3, 5, 7, 13$) | Dummy `BYE` team added ($N' = N + 1$). Team paired with `BYE` receives rest round. |
| 28 | Round Robin | Equal round points (Tiebreaker) | Head-to-Head comparison between tied teams; if equal, Round Differential; if equal, Total Rounds Won. |
| 29 | Group Stage | 16 teams into 4 groups | Snake seeding produces balanced groups (Group A: 1, 8, 9, 16; Group B: 2, 7, 10, 15, etc.). |
| 30 | Group Stage Crossover | Group A Winner vs Group B Runner-Up | Teams from the same group are placed in opposite halves of the knockout bracket. |

---

## Detailed Task Analysis

### Task 1: VTO Database Architecture

#### 1. What Exists:
- `prisma/schema.prisma` is fully defined with 22 models and 12 enums.
- Client generation (`npx prisma generate`) executes without errors.
- `src/lib/db.ts` provides a global singleton instance of `PrismaClient`.
- Cascading deletes are configured on core hierarchy:
  - `Tournament` $\to$ `TournamentSettings`, `Team`, `Round`, `Venue`, `VolunteerAssignment`, `Incident`, `Announcement`.
  - `Team` $\to$ `Player`, `Substitute`, `MatchParticipant`, `Attendance`.
  - `Venue` $\to$ `Building` $\to$ `Lab` $\to$ `Station` $\to$ `PC`.
  - `Round` $\to$ `Match` $\to$ `MatchResult`, `MatchParticipant`.
- `SetNull` is configured on non-destructive entity links (`Match.stationId`, `Match.teamAId`, `Match.teamBId`, `Match.winnerId`, `Match.loserId`, `PC.stationId`, `VolunteerAssignment.stationId`).

#### 2. Discrepancies & Missing Elements:
1. **`prisma/seed.ts` is Completely Missing**:
   - `package.json` defines `"prisma:seed": "npx tsx prisma/seed.ts"`, but the file does not exist on disk.
   - Required seed dataset:
     - 1 Default Super Admin / Official user (`admin@vto.gg` with hashed credentials).
     - 1 Development Tournament ("VALORANT Campus Championship 2026", status: `READY`, format: `SINGLE_ELIMINATION`).
     - Tournament Settings: 5 players/team, 2 substitutes, 45m match, 15m buffer, auto-advance BYEs, require check-in.
     - Physical Venue: 1 Venue ("University Arena"), 1 Building ("Engineering West"), 2 Labs:
       - **Lab 1**: 30 PCs, 3 Stations (Station 1: PCs 1-10, Station 2: PCs 11-20, Station 3: PCs 21-30).
       - **Lab 2**: 10 PCs, 1 Station (Station 4: PCs 31-40).
       - All 40 PCs status `AVAILABLE`.
     - **13 Teams**, each with 5 starting players (65 players total) with realistic names, Riot IDs (`Player#TAG`), and college IDs.
     - Volunteer roster: Lead Coordinator, Match Marshals, Results Officials.
2. **Missing Compound Unique Constraints**:
   - `Team`: No `@@unique([tournamentId, name])`. Currently duplicate team names can be inserted into the same tournament.
   - `Lab`: No `@@unique([buildingId, name])`.
   - `Station`: No `@@unique([labId, name])`.
   - `PC`: No `@@unique([labId, pcNumber])`. Two PCs in the same lab can have the same number.
   - `Round`: `@@index([tournamentId, roundNumber])` exists, but NOT `@@unique([tournamentId, roundNumber])`.
   - `Match`: No `@@unique([roundId, matchNumber])`.
   - `Player`: No `@@unique([teamId, riotId, riotTag])`.
3. **Missing Soft Deletion Support**:
   - `GEMINI.md` § 3.4 explicitly states: *"Never permanently delete teams, matches, or audit records during active operations. Use soft-deletion or status flags (`DISQUALIFIED`, `CANCELLED`)."*
   - `ORIGINAL_REQUEST.md` Task 1 requires: *"Comprehensive database tests verifying relational integrity, compound uniqueness, and soft deletion."*
   - Currently, models lack `deletedAt DateTime?` fields. While status flags exist (`DISQUALIFIED`, `CANCELLED`), an explicit `deletedAt` timestamp allows soft-deleting teams or fixtures while preserving complete relational history.
4. **Prisma Migrations**:
   - There is no `prisma/migrations` folder. A migration history or baseline migration is needed for PostgreSQL production setups.
5. **Database Utilities**:
   - `src/lib/db.ts` only exports `prisma`. It lacks transaction helper wrappers (`runInTransaction`), audit logging persistence helpers, or soft delete middleware/extensions.
6. **Database Test Suite**:
   - No database tests exist in `tests/`. Unit tests in `tests/unit/` only test pure domain logic in isolation. A dedicated test suite (e.g. `tests/db/database.test.ts` or integration suite) is required to verify relational integrity, cascading deletions, compound unique constraint rejections, and soft deletion.

---

### Task 2: Tournament Domain Engine

#### 1. What Exists:
- `src/lib/tournament/bracket.ts`:
  - `generateSeedOrder(bracketSize)`: Power-of-two recursive seed distributor.
  - `generateSingleEliminationBracket(participants)`: Produces DAG with rounds, match codes, BYE assignments on top seeds, and automatic Round 2 advancement for BYEs.
  - `advanceBracketWinner(bracket, matchId, winnerId)`: Pure function updating match to `VERIFIED` and propagating winner to `nextMatchId` and `nextMatchSlot`.
- `src/lib/tournament/state-machine.ts`:
  - `canTransitionTournament` and `validateTournamentTransition` for `DRAFT` $\to$ `READY` $\to$ `FINALIZED` $\to$ `LIVE` $\to$ `COMPLETED` $\to$ `ARCHIVED`.
  - `canTransitionMatch` and `validateMatchTransition` for `SCHEDULED` $\to$ `CALLED` $\to$ `READY` $\to$ `LOBBY_READY` $\to$ `LIVE` $\to$ `PAUSED` $\to$ `FINISHED` $\to$ `RESULT_PENDING` $\to$ `VERIFIED`.
- `src/lib/tournament/validator.ts`:
  - Pre-finalization validation pipeline (`runPreFinalizationValidation`).

#### 2. Discrepancies & Missing Elements:
1. **Round Robin Engine is Completely Missing**:
   - `docs/TOURNAMENT_ENGINE.md` § 2.2 and `ORIGINAL_REQUEST.md` Task 2 require Round Robin support.
   - Neither `src/lib/tournament/round-robin.ts` nor its algorithms exist.
   - Missing:
     - Berger Cyclic Pairing Algorithm for even and odd team counts.
     - Alternating home/away side balance.
     - Standings calculation: Points (3 standard win, 1 OT win, 0 loss), Head-to-Head comparison, Round Differential ($\text{roundsWon} - \text{roundsLost}$), Total Rounds Won.
     - Standings tiebreaker resolution.
2. **Group Stage + Knockout Engine is Completely Missing**:
   - `docs/TOURNAMENT_ENGINE.md` § 2.3 and `ORIGINAL_REQUEST.md` Task 2 require Group Stage + Knockout support.
   - Neither `src/lib/tournament/group-stage.ts` nor its algorithms exist.
   - Missing:
     - Snake seeding across pots (e.g. 16 teams into 4 groups).
     - Multi-group round-robin fixture generation.
     - Group standings evaluation.
     - Crossover knockout advancement: Group A Winner plays Group B Runner-Up; Group B Winner plays Group A Runner-Up.
3. **Single Elimination Edge Case $N = 1$**:
   - In `src/lib/tournament/bracket.ts` line 61: `if (n < 2) throw new Error("A tournament requires at least 2 participants.");`
   - `ORIGINAL_REQUEST.md` explicitly calls for unit tests across: `1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32` teams.
   - The test suite in `tests/unit/bracket-engine.test.ts` only tests $2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32$. Team count 1 is not tested to verify that it throws the expected error cleanly.
4. **Score Reversal / Result Invalidation**:
   - `advanceBracketWinner` only advances forward. If a verified result is disputed or overturned by an admin, there is no function to rewind or invalidate subsequent dependent matches in the bracket.
5. **Pre-Flight Validator Has 9 Checks Instead of 10**:
   - Documented as a "10-point pre-flight validator" in `docs/ARCHITECTURE.md` and `docs/ROADMAP.md`.
   - `src/lib/tournament/validator.ts` currently implements 9 checks:
     1. Minimum Team Count ($\ge 2$)
     2. Player Roster Completeness (5 players)
     3. Team Attendance Check-In
     4. Lab Configuration ($\ge 1$ lab)
     5. Station Operational Readiness
     6. PC Health Alert (Offline PC ratio)
     7. Tournament Bracket Structure
     8. Fixture Generation & Station Allocation
     9. Volunteer Staffing
   - Check #10 is missing (e.g. Conflict-Free Schedule Verification: checking that `scheduling.conflicts.length === 0`, or Tournament Start Time validity).

---

### Task 3: Physical Tournament Scheduling Engine

#### 1. What Exists:
- `src/lib/scheduling/capacity.ts`:
  - `evaluateLabCapacity`: Correctly evaluates working PCs (`AVAILABLE`, `ASSIGNED`, `IN_USE`), marks stations operational if working PCs $\ge 10$, and supports both explicit station PC assignment and aggregate lab pool mode.
  - `calculateVenueCapacity`: Correctly sums configured PCs, working PCs, offline PCs, and operational stations across labs.
- `src/lib/scheduling/scheduler.ts`:
  - `generateFixtures`: Schedules matches round by round.
  - Correctly enforces:
    - Station Exclusivity (no overlapping matches on same station).
    - Team Exclusivity (no team in two matches simultaneously).
    - Predecessor dependency ($t_{start}(M) \ge \max(t_{end}(A), t_{end}(B)) + buffer$).
    - Hardware validation (only assigns operational stations with $\ge 10$ working PCs).
    - BYE handling (0 station consumption, immediate completion).
- `tests/unit/scheduling-engine.test.ts`:
  - 3 tests: 40 PCs/4 stations capacity, Lab 1 capacity reduction when 5 PCs are offline, conflict-free scheduling for 13 teams across 4 stations.

#### 2. Discrepancies & Missing Elements:
1. **Soft Constraint Heuristics Are Not Implemented**:
   - `docs/SCHEDULING.md` § 3 defines two soft constraints:
     - **Lab Locality**: If a team plays back-to-back rounds, prioritize scheduling them in the same lab to minimize player migration.
     - **Station Wear Leveling**: Balance match allocations across stations to prevent overheating specific hardware zones.
   - Current implementation in `scheduler.ts` simply selects the first station matching the earliest start time. Stations with lower index in the array are systematically overloaded, and lab locality is completely ignored.
2. **Mid-Tournament Station Failure & Rescheduling**:
   - `docs/SCHEDULING.md` § 2 specifies that if a PC suffers hardware failure mid-tournament, the station becomes non-operational, and the scheduler must automatically reassign pending fixtures away from that station.
   - No dynamic rescheduling function (`reschedulePendingFixtures` or `reallocateStation`) exists in `src/lib/scheduling/`.
3. **Format Limitation (Single Elimination Only)**:
   - `generateFixtures` accepts `bracket: BracketStructure`.
   - There is no scheduler interface to schedule matches from Round Robin or Group Stage formats.
4. **Test Suite Coverage Gaps**:
   - `tests/unit/scheduling-engine.test.ts` only has 3 test cases.
   - Missing tests:
     - Explicit verification that Round 2 match start time is strictly $\ge$ feeder match completion time + buffer duration.
     - Buffer duration variability (testing with buffer = 0, 15, 30 minutes).
     - Error handling when 0 operational stations are available (verifying that `generateFixtures` throws the expected error).
     - Asymmetric lab failures: e.g., Lab 2 (single station) fails completely, leaving 3 stations in Lab 1; or Station 2 in Lab 1 fails.
     - Multi-round scheduling under reduced capacity (e.g. 13 teams with only 2 operational stations).

---

## Gap Analysis & Discrepancy Matrix

| Component | Authoritative Requirement (docs / ORIGINAL_REQUEST.md / GEMINI.md) | Current Codebase Implementation | Discrepancy / Severity |
|---|---|---|---|
| **Database: Seed Script** | `prisma/seed.ts` seeding 13 teams (5 players each), 40 PCs across 2 labs (Lab 1: 30 PCs/3 st, Lab 2: 10 PCs/1 st) | File does not exist | **CRITICAL**: Cannot run `npm run prisma:seed`; dev database cannot be populated from code |
| **Database: Unique Constraints** | Compound unique constraints on `[tournamentId, name]`, `[labId, pcNumber]`, `[tournamentId, roundNumber]`, `[labId, name]` | Missing in `prisma/schema.prisma` | **HIGH**: Database allows duplicate team names, duplicate PC numbers, and duplicate rounds |
| **Database: Soft Delete** | Relational integrity and soft deletion tests; no permanent deletion of teams/matches | No `deletedAt` field on any model | **MEDIUM**: Soft-delete pattern relies only on status enum; no timestamp or query filter extension |
| **Database: Tests** | Comprehensive database tests verifying relational integrity, compound uniqueness, soft deletion | No database tests in `tests/` | **CRITICAL**: Requirement 1 specifies comprehensive database tests |
| **Database: Utilities** | Database utilities, transaction management, audit log persistence | Only raw `prisma` in `src/lib/db.ts` | **MEDIUM**: No reusable transaction or audit helpers |
| **Domain: Round Robin** | Berger Cyclic Pairing Algorithm, odd/even teams, standings (Points > H2H > Diff > Won), tiebreakers | Not implemented | **CRITICAL**: Requirement 2 explicitly requires Round Robin format |
| **Domain: Group Stage** | Snake seeding pots, internal RR, group standings, crossover knockout advancement | Not implemented | **CRITICAL**: Requirement 2 explicitly requires Group Stage + Knockout format |
| **Domain: 1-Team Edge Case** | Exhaustive unit tests: 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 teams | Bracket engine throws error on 1 team, but 1 team is NOT tested in vitest | **LOW**: 1-team test missing from `bracket-engine.test.ts` |
| **Domain: Validator Checks** | 10-point pre-flight validation pipeline | Only 9 checkpoints implemented in `validator.ts` | **LOW**: Check #10 (e.g. Conflict-Free Schedule or Start Time) missing |
| **Scheduling: Heuristics** | Lab Locality (reduce team migration) and Station Wear Leveling (balance allocations) | Greedy first-fit station selection only | **MEDIUM**: Soft constraints documented in `SCHEDULING.md` not implemented |
| **Scheduling: Reallocation** | Dynamic reassignment of pending fixtures when station fails mid-tournament | Not implemented | **MEDIUM**: Inability to react dynamically to hardware failures in scheduler |
| **Scheduling: Other Formats** | Schedule matches for Round Robin and Group Stage | `scheduler.ts` only accepts `BracketStructure` (Single Elim) | **HIGH**: Cannot schedule non-elimination tournament formats |
| **Scheduling: Tests** | Predecessor buffer compliance, zero capacity error, asymmetric lab failures | Only 3 tests in `scheduling-engine.test.ts` | **MEDIUM**: Need more edge-case test coverage |

---

## Actionable Recommendations & Implementation Blueprint

### 1. For Task 1 (Database Architecture):
1. **Update `prisma/schema.prisma`**:
   - Add compound unique constraints:
     - `Team`: `@@unique([tournamentId, name])`
     - `Lab`: `@@unique([buildingId, name])`
     - `Station`: `@@unique([labId, name])`
     - `PC`: `@@unique([labId, pcNumber])`
     - `Round`: `@@unique([tournamentId, roundNumber])`
     - `Match`: `@@unique([roundId, matchNumber])`
     - `Player`: `@@unique([teamId, riotId, riotTag])`
   - Add `deletedAt DateTime?` field to `Tournament`, `Team`, `Player`, `Match`, `PC` for explicit soft deletion support.
2. **Implement `prisma/seed.ts`**:
   - Create script executable via `npx tsx prisma/seed.ts` (matching `package.json`).
   - Populate Super Admin user (`admin@vto.gg`).
   - Populate Tournament "VALORANT Campus Championship 2026" with `TournamentSettings`.
   - Populate Venue ("Main Esports Arena") $\to$ Building $\to$ 2 Labs:
     - Lab 1: 30 PCs, 3 Stations (10 PCs each).
     - Lab 2: 10 PCs, 1 Station (10 PCs).
   - Populate 13 Teams with 5 verified starting players each (65 players), realistic Riot IDs and tags.
   - Populate Volunteer staff with roles.
3. **Implement Database Utilities (`src/lib/db.ts` or `src/lib/db-utils.ts`)**:
   - Transaction wrapper helper with error handling.
   - Audit logging helper function (`logAuditEvent(prisma, { tournamentId, actorId, action, entity, entityId, before, after })`).
   - Soft-delete helper functions (`softDeleteTeam`, `softDeleteTournament`, `restoreTeam`).
4. **Create Database Test Suite (`tests/db/database.test.ts`)**:
   - Test relational cascading deletes.
   - Test compound unique constraint violations (e.g. attempting to insert duplicate team name or duplicate PC number in same lab).
   - Test soft-deletion behavior (verifying `deletedAt` is populated, record remains in DB, and active queries filter it out).

### 2. For Task 2 (Tournament Domain Engine):
1. **Expand `src/lib/tournament/types.ts`**:
   - Add types for Round Robin: `RoundRobinMatch`, `RoundRobinRound`, `RoundRobinStructure`, `TeamStanding`, `TiebreakerResult`.
   - Add types for Group Stage: `TournamentGroup`, `GroupStageStructure`, `KnockoutAdvancement`.
2. **Implement `src/lib/tournament/round-robin.ts`**:
   - `generateRoundRobinFixtures(participants)` using Berger cyclic pairing algorithm.
   - Support even and odd teams (via dummy BYE).
   - Alternating home/away sides.
   - `calculateRoundRobinStandings(matches, participants)`:
     - 3 points for regulation win, 1 point for overtime win, 0 for loss.
     - Head-to-Head tiebreaker.
     - Round differential tiebreaker ($\text{roundsWon} - \text{roundsLost}$).
     - Total rounds won.
3. **Implement `src/lib/tournament/group-stage.ts`**:
   - `generateGroupStage(participants, groupCount)`: Snake seeding across pots.
   - Internal group round-robin fixture generation.
   - `calculateGroupStandings(groupMatches, groupParticipants)`.
   - `generateKnockoutAdvancement(groupStandings)`: Crossover pairing (Group A 1st vs Group B 2nd, etc.) into an 8-team Single Elimination bracket.
4. **Update `src/lib/tournament/validator.ts`**:
   - Add Check #10: "Conflict-Free Fixture Schedule" (validates that `fixtures` have 0 detected scheduling collisions and start time is valid).
5. **Expand Unit Tests in `tests/unit/bracket-engine.test.ts` & Add New Test Files**:
   - Add test for 1 team throwing expected error.
   - Create `tests/unit/round-robin.test.ts`: test 2, 3, 4, 5, 8 teams, odd team BYEs, Berger table pairings, standings calculations, and tiebreakers.
   - Create `tests/unit/group-stage.test.ts`: test 16 teams into 4 groups, snake seeding verification, crossover knockout bracket mapping.

### 3. For Task 3 (Physical Tournament Scheduling Engine):
1. **Enhance `src/lib/scheduling/scheduler.ts`**:
   - Implement soft constraint heuristics:
     - Lab Locality: Check previous match lab for participating teams; if a candidate station is in the same lab, prioritize it.
     - Station Wear Leveling: Among stations available at the same candidate time, pick the station with the fewest cumulative matches scheduled.
   - Generic match scheduling: Allow `generateFixtures` to accept a generic array of matches/rounds (enabling scheduling of Round Robin and Group Stage fixtures alongside Single Elimination brackets).
   - Dynamic reallocation: `reallocateStationFixtures(fixtures, failedStationId, operationalStations, options)` to reassign pending fixtures when a station drops offline mid-event.
2. **Expand Unit Tests in `tests/unit/scheduling-engine.test.ts`**:
   - Add test verifying predecessor buffer compliance ($t_{start}(R2) \ge t_{end}(R1) + \text{buffer}$).
   - Add test for custom buffer durations (e.g. 0, 10, 30 minutes).
   - Add test verifying `generateFixtures` throws when 0 operational stations exist.
   - Add test for asymmetric lab failures (e.g. Lab 2 offline, leaving Lab 1's 3 stations).
   - Add test for station wear leveling and lab locality heuristics.
