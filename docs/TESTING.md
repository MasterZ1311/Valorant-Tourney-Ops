# Testing Strategy & Test Suite Documentation — VTO

## 1. Testing Philosophy
Tournament correctness takes precedence over all else. An invalid tournament state (double-booked team, duplicate player, unverified score advancement, negative scores, station collision) ruins a live LAN event. Therefore, tests are prioritized at the domain layer before UI integration.

---

## 2. Test Architecture

### 2.1 Unit Tests (`tests/unit/`)
1. **Bracket Engine Tests (`tests/unit/bracket-engine.test.ts`)**:
   - Power of two calculation for arbitrary sizes (1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32).
   - BYE count correctness (\(B - N\)).
   - Top seed BYE placement invariance.
   - Seed collision checks (Seeds 1 and 2 meet only in Grand Finals).
   - Zero duplicated team IDs across matches.
2. **Scheduling Engine Tests (`tests/unit/scheduling-engine.test.ts`)**:
   - Physical PC capacity calculations with broken/offline PCs.
   - Station exclusivity: No two matches on same station at overlapping times.
   - Team exclusivity: No team scheduled in two stations simultaneously.
   - Buffer duration enforcement.
   - Predecessor dependency compliance (Round 2 cannot start before Round 1 completes).
3. **State Machine Tests (`tests/unit/state-machine.test.ts`)**:
   - Valid match transitions: `SCHEDULED` → `CALLED` → `READY` → `LOBBY_READY` → `LIVE` → `FINISHED` → `RESULT_PENDING` → `VERIFIED`.
   - Illegal transition rejections (e.g. `SCHEDULED` directly to `VERIFIED`).
   - Winner advancement guards.

### 2.2 Integration Tests (`tests/integration/`)
- End-to-end tournament finalization validation checklist.
- Result submission by volunteer → Verification by official → Winner bracket advancement → Next round schedule activation.
- Admin unlock with mandatory audit logging.

### 2.3 Full Simulation Script (`scripts/simulate-tournament.ts`)
- Configures 13 teams, 40 PCs (Lab 1: 30 PCs/3 stations, Lab 2: 10 PCs/1 station).
- Runs complete multi-round tournament with simulated scores, technical pauses, incident tickets, and reports.
- Validates zero runtime errors or illegal states from start to champion.

---

## 3. Running the Test Suite
```bash
# Run all unit tests
npm test

# Run tests in watch mode
npm run test:watch

# Run end-to-end tournament simulation
npx tsx scripts/simulate-tournament.ts
```
