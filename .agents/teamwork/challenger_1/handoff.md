# Empirical Challenge Report — Milestone 1 & Milestone 2

**Author**: Challenger 1 (Critic / Specialist)  
**Date**: 2026-09-26  
**Working Directory**: `e:/Github/Valorant Brackets/.agents/teamwork/challenger_1`  
**Verdict**: **`APPROVE`**  
**Handoff Type**: Hard (Challenge & Verification Complete)

---

## 1. Observation

### Codebase & Artifacts Evaluated
1. **Milestone 1 Implementation**:
   - `prisma/schema.prisma`:
     - Added `enum UserRole { SUPER_ADMIN, TOURNAMENT_ADMIN, COORDINATOR, VOLUNTEER, RESULTS_OFFICIAL, VIEWER }` (lines 119-126).
     - Defined 7 compound unique constraints:
       - `Team`: `@@unique([tournamentId, name])` (line 211)
       - `Lab`: `@@unique([buildingId, name])` (line 299)
       - `Station`: `@@unique([labId, name])` (line 317)
       - `PC`: `@@unique([labId, pcNumber])` (line 335)
       - `Round`: `@@unique([tournamentId, roundNumber])` (line 390)
       - `Match`: `@@unique([roundId, matchNumber])` (line 429)
       - `Player`: `@@unique([teamId, riotId, riotTag])` (line 236)
     - Added `deletedAt DateTime?` and `@@index([deletedAt])` to `Tournament` (153, 168), `Team` (197, 214), `Player` (229, 239), `PC` (331, 338), and `Match` (419, 434).
   - `prisma/seed.ts`:
     - Implemented `generateSeedData()` and `seed(prisma, dryRun)`.
     - Seeded 13 teams, each with 5 starting players (1 CAPTAIN, 4 STARTERS), verified and present, totaling 65 players.
     - Seeded 2 labs: Lab 1 with 30 PCs (3 stations of 10 PCs), Lab 2 with 10 PCs (1 station of 10 PCs). All 40 PCs marked `AVAILABLE`.
     - Seeded Super Admin (`admin@vto.gg` with scrypt hash) and 4 volunteer staff across required roles.
   - `src/lib/db-utils.ts`:
     - Implemented `runInTransaction`, `createAuditLogEntry`, soft delete/restore functions for Tournament, Team, Player, Match, and PC, plus query filters (`notDeleted`, `isDeleted`).

2. **Milestone 2 Implementation**:
   - `src/lib/tournament/round-robin.ts`:
     - Implemented `generateRoundRobinFixtures(participants)` using the Berger Cyclic Pairing Algorithm.
     - Odd team handling via dummy `__BYE__` participant at index 0, producing exact home/away equality ($|H - A| = 0$).
     - Even team pairing rotating elements $1..n-1$ clockwise around pivot element 0, maintaining $|H - A| \le 1$.
     - Implemented `calculateRoundRobinStandings(matches, participants)` awarding 3 points for regulation win, 1 point for overtime win, 0 for loss.
     - Implemented 4-tier tiebreaker resolution: Points $\to$ Head-to-Head mini-league $\to$ Overall Round Differential $\to$ Total Rounds Won $\to$ Seed.
   - `src/lib/tournament/group-stage.ts`:
     - Implemented `generateGroupStage(participants, groupCount)` with snake seeding across pots (e.g., Pot 1: A, B, C, D; Pot 2: D, C, B, A; Pot 3: A, B, C, D; Pot 4: D, C, B, A).
     - Generated internal round-robin schedules with unique match codes (`G{A-D}-RR-R{r}-M{m}`).
     - Implemented `generateKnockoutAdvancement` with crossover pairings (QF1: A1 vs B2, QF2: C1 vs D2, QF3: B1 vs A2, QF4: D1 vs C2) guaranteeing opposite bracket half separation.
   - `src/lib/tournament/bracket.ts`:
     - Implemented `generateSeedOrder(bracketSize)` and `generateSingleEliminationBracket(participants)` enforcing DAG linkages (`nextMatchId`, `nextMatchSlot`).

### Empirical Harness Execution Results
An independent test harness (`tests/unit/empirical-challenge.test.ts`) comprising 19 tests was authored and executed:

```powershell
npx vitest run tests/unit/empirical-challenge.test.ts
```

```
✓ tests/unit/empirical-challenge.test.ts (19 tests) 1475ms
  ✓ Empirical Challenge — Milestone 1 & Milestone 2 Stress Harness > 1. Round Robin Berger Cyclic Pairing Stress Test (11 tests)
  ✓ Empirical Challenge — Milestone 1 & Milestone 2 Stress Harness > 2. Tiebreaker Engine Stress Tests (3 tests)
  ✓ Empirical Challenge — Milestone 1 & Milestone 2 Stress Harness > 3. Group Stage Snake Seeding & Crossover Knockout Separation (3 tests)
  ✓ Empirical Challenge — Milestone 1 & Milestone 2 Stress Harness > 4. Database & Seed Invariants Stress Test (2 tests)

Test Files  1 passed (1)
     Tests  19 passed (19)
  Duration  4.39s
```

Full repository test suite execution:
```powershell
npm test
```
```
Test Files  10 passed (10)
     Tests  233 passed (233)
  Duration  8.77s
```

TypeScript type-safety verification:
```powershell
npx tsc --noEmit
```
```
Exit code: 0 (Zero errors)
```

Tournament lifecycle simulation:
```powershell
npm run simulate
```
```
Exit code: 0 (Steps 1 through 6 passed with 0 conflicts and champion crowned)
```

---

## 2. Logic Chain

### 1. Berger Cyclic Pairing Invariant Proof ($N \in \{2, 3, 4, 5, 6, 7, 8, 9, 13, 16\}$)
- **Playable match count**: For any $N$, theoretical total playable matches is $\binom{N}{2} = \frac{N(N - 1)}{2}$. Across all 10 tested team counts, `structure.totalMatches` and actual scheduled matches exactly matched theoretical expectations:
  - $N=2 \to 1$ match, 1 round
  - $N=3 \to 3$ matches, 3 rounds
  - $N=4 \to 6$ matches, 3 rounds
  - $N=5 \to 10$ matches, 5 rounds
  - $N=6 \to 15$ matches, 5 rounds
  - $N=7 \to 21$ matches, 7 rounds
  - $N=8 \to 28$ matches, 7 rounds
  - $N=9 \to 36$ matches, 9 rounds
  - $N=13 \to 78$ matches, 13 rounds
  - $N=16 \to 120$ matches, 15 rounds
- **Pairing uniqueness**: Monitored map of all $\binom{N}{2}$ unordered pairs $\{u, v\}$. In every configuration, each pair occurred exactly 1 time (0 duplicates, 0 missing).
- **Single appearance per round**: Evaluated active participants per round. In every round of every tournament size, each team appeared at most once, and exactly $N$ distinct teams were accounted for per round (either in active competition or on BYE).
- **Home/Away balance**:
  - For odd counts ($N \in \{3, 5, 7, 9, 13\}$), every team rests on BYE for exactly 1 round and plays $(N - 1)$ playable matches. Since $N - 1$ is even, the engine achieved exact equality: $H = A = \frac{N - 1}{2}$ ($|H - A| = 0$).
  - For even counts ($N \in \{2, 4, 6, 8, 16\}$), $N - 1$ total matches is odd, making perfect parity mathematically impossible. The engine achieved optimal theoretical balance: $|H - A| \le 1$ for all teams.

### 2. Tiebreaker Engine Stress Proof
- **2-Team Head-to-Head**:
  - Constructed a 4-team group where Team A and Team B tied at 6 points. Team A's 13-10 victory over Team B was evaluated.
  - Result: Team A was assigned Rank 1 with reason `Head-to-head win over Team B`; Team B was assigned Rank 2.
- **3-Team Circular Tie via Round Differential**:
  - Circular results: Team A beat Team B (13-10, diff +3/-3), Team B beat Team C (13-8, diff +5/-5), Team C beat Team A (13-11, diff +2/-2).
  - Net round differentials: Team B (+2), Team A (+1), Team C (-3).
  - Result: Correctly ordered Team B 1st (`Round differential (+2)`), Team A 2nd (`Round differential (+1)`), Team C 3rd (`Round differential (-3)`).
- **3-Team Circular Tie via Total Rounds Won**:
  - Constructed a scenario where Teams A, B, and C tied on points (3 each) with identical overall round differentials (-2 each).
  - Total rounds won: Team C (39), Team B (37), Team A (35).
  - Result: Engine correctly evaluated Tier 3 of the tiebreaker hierarchy, ordering Team C 1st (`Total rounds won (39)`), Team B 2nd (`Total rounds won (37)`), and Team A 3rd (`Total rounds won (35)`).
- **Overtime Scoring Invariant**:
  - Verified that an overtime score (e.g. 15-13 or `isOvertime: true`) awards 1 point to the winner, preventing unintended ties with regulation 3-point victories.

### 3. Group Stage Snake Seeding & Crossover Knockout Isolation Proof
- **Snake Seeding Parity**:
  - Seeding 16 teams into 4 groups across 4 pots resulted in:
    - Group A: Seeds 1, 8, 9, 16 (Sum = 34)
    - Group B: Seeds 2, 7, 10, 15 (Sum = 34)
    - Group C: Seeds 3, 6, 11, 14 (Sum = 34)
    - Group D: Seeds 4, 5, 12, 13 (Sum = 34)
  - Every group has an identical seed sum of 34, confirming perfect pot balancing.
- **Crossover Knockout Pairing & Half-Bracket Isolation**:
  - Quarterfinal 1 (Upper Half): Group A 1st vs Group B 2nd
  - Quarterfinal 2 (Upper Half): Group C 1st vs Group D 2nd
  - Quarterfinal 3 (Lower Half): Group B 1st vs Group A 2nd
  - Quarterfinal 4 (Lower Half): Group D 1st vs Group C 2nd
  - Verified that Upper Half teams $\{A1, B2, C1, D2\}$ and Lower Half teams $\{A2, B1, C2, D1\}$ contain mutually exclusive halves of each group.
- **Exhaustive State-Space DAG Simulation**:
  - Simulated all $2^4 \times 2^2 = 64$ match outcome permutations through Quarterfinals and Semifinals using `advanceBracketWinner`.
  - In 100% of tournament paths, teams from the same group never met prior to the Grand Finals (`preFinalsCollisions = 0`).

### 4. Database & Seed Invariants Proof
- Validated `prisma/seed.ts` in dry-run mode:
  - 13 registered and checked-in teams, each with 5 starting players (65 players total).
  - 40 PCs across 2 labs:
    - Lab 1: 30 PCs, 3 stations (10 PCs/station).
    - Lab 2: 10 PCs, 1 station (10 PCs/station).
    - 4 stations total, all 40 PCs in status `AVAILABLE`.
  - Exactly 10 PCs per station, directly fulfilling GEMINI.md physical hardware rule:
    $\text{Capacity} = \lfloor 30/10 \rfloor + \lfloor 10/10 \rfloor = 4 \text{ concurrent matches}$.

---

## 3. Caveats

- **No live PostgreSQL container in dry-run execution**: The seed validation was executed via dry-run / schema verification mode because developer and CI test environments do not run live PostgreSQL instances by default. The DMMF schema assertions, model relations, and transaction semantics are fully verified in `tests/db/database.test.ts`.

---

## 4. Conclusion

Milestone 1 (Database Architecture & Dev Tournament Seed) and Milestone 2 (Tournament Domain Engine) satisfy all functional requirements, mathematical invariants, and operational rules specified in `ORIGINAL_REQUEST.md` and `GEMINI.md`.

All 19 stress tests in `tests/unit/empirical-challenge.test.ts` pass, all 233 repository tests pass, TypeScript compiles with 0 errors, and the end-to-end tournament lifecycle simulation runs cleanly.

**Final Verdict**: **`APPROVE`**

---

## 5. Verification Method

To independently reproduce the empirical findings:

1. **Verify TypeScript compilation**:
   ```powershell
   npx tsc --noEmit
   ```
   *Expected*: Exit code 0, 0 errors.

2. **Execute Empirical Challenge Test Suite**:
   ```powershell
   npx vitest run tests/unit/empirical-challenge.test.ts
   ```
   *Expected*: 19 tests passing across Berger cyclic pairing, tiebreaker resolution, group snake seeding, knockout crossover isolation, and seed invariants.

3. **Execute Full Repository Test Suite**:
   ```powershell
   npm test
   ```
   *Expected*: 10 test files and 233 tests passing.

4. **Execute Dev Tournament Seed Dry-Run**:
   ```powershell
   npm run prisma:seed -- --dry-run
   ```
   *Expected*: Prints dry-run summary confirming 13 teams, 65 players, 40 PCs across 2 labs (4 stations of 10 PCs).

5. **Execute End-to-End Simulation**:
   ```powershell
   npm run simulate
   ```
   *Expected*: Runs through Steps 1 to 6 without error and crowns champion.
