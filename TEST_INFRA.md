# TEST_INFRA.md — Testing Infrastructure & Execution Architecture
## VALORANT Tournament Operations System (VTO)

This document establishes the testing architecture, operational rules, test runner configuration, execution commands, and tier-based validation protocols for the VALORANT Tournament Operations System (VTO).

---

### 1. Testing Philosophy & Invariant Protection

Tournament operations during a live esports event are strictly time-sensitive and zero-fault tolerant. A software defect (e.g. double-booking a team, assigning a match to a broken station with <10 PCs, advancing an unverified score, or illegal state jumps) disrupts competition integrity and causes significant venue delays.

To protect system integrity, VTO enforces an **opaque-box, multi-tier testing architecture**:
- **Pure Domain Isolation**: Domain algorithms in `src/lib/tournament` and `src/lib/scheduling` have zero dependencies on React components, DOM APIs, or direct database connections. They execute deterministically.
- **GEMINI.md Invariant Verification**: All tests verify physical resource constraints (1 match = 10 working PCs), scheduling exclusivity (no station or team collisions), finite state machine legality, and 2-phase score verification.
- **Progressive Testability**: Tests validate implemented features and interface contracts without relying on unmerged or future milestones.

---

### 2. Test Infrastructure & Environment

- **Test Runner**: [Vitest](https://vitest.dev/) v2.1.3+
- **Execution Environment**: Node.js v20+, TypeScript 5.6.3 (`tsx`), ESM/CJS hybrid with `@/` path alias resolution.
- **Config File**: `vitest.config.ts`
- **Simulation Runner**: Node TSX via `scripts/simulate-tournament.ts`

#### Key Vitest Configuration (`vitest.config.ts`):
```ts
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

---

### 3. Test Suite Directory Structure

```
tests/
├── unit/                                  # Domain engine unit tests (Milestone 2 & 3)
│   ├── bracket-engine.test.ts             # Power-of-2 sizing, BYE allocation, seeding order
│   ├── scheduling-engine.test.ts          # Physical PC capacity, conflict-free scheduling
│   ├── state-machine.test.ts              # Legal/illegal tournament and match transitions
│   └── validator.test.ts                  # 10-point pre-finalization pipeline checks
├── db/                                    # Relational database & schema constraint tests (Milestone 1)
│   └── database.test.ts                   # Compound unique keys, cascading, soft delete
└── integration/                           # End-to-end requirement & lifecycle integration tests
    └── e2e-requirements.test.ts           # Comprehensive Tiers 1-4 opaque-box test suite
```

---

### 4. Test Tiers & Coverage Matrix

| Tier | Name | Target Scope | Criteria | Test Count |
|:---:|---|---|---|:---:|
| **Tier 1** | **Feature Coverage** | All core inventoried domain features (Bracket, State Machine, Capacity, Scheduler, Pre-Finalization Validator, Operations Store) | $\ge 5$ test cases per feature | **35 tests** |
| **Tier 2** | **Boundary & Corner Cases** | Edge inputs: 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 teams; 0, 1, 4, 10, 30, 40 PCs; 0 buffer; offline PCs; illegal state jumps | $\ge 5$ test cases per boundary condition | **32 tests** |
| **Tier 3** | **Cross-Feature Combinations** | Pairwise subsystem interactions (Registration + Seeding, Hardware Failure + Rescheduling, Check-In + Forfeit, State Transitions + DAG Chain, Admin Unlock + Re-Lock) | Deep multi-module workflows | **6 tests** |
| **Tier 4** | **Real-World Scenarios** | Full tournament workloads under real conditions: 13-team college LAN tournament with tech pause; 16-team tournament with station breakdown; 8-team rapid 0-buffer tournament | Realistic tournament lifecycle | **3 tests** |
| **Total** | **All Tiers Combined** | `tests/integration/e2e-requirements.test.ts` | Complete system verification | **76 tests** |

---

### 5. How to Run the Tests

#### 5.1 Run the Full Test Suite
Executes all unit tests and integration tests across the repository:
```bash
npm test
```
*Equivalent command:*
```bash
npx vitest run
```

#### 5.2 Run the E2E Requirement Test Suite (Tiers 1-4)
Executes the dedicated 76-test requirement-driven integration suite:
```bash
npx vitest run tests/integration/e2e-requirements.test.ts
```

#### 5.3 Run Unit Tests in Watch Mode
Executes tests interactively during active development:
```bash
npm run test:watch
```

#### 5.4 Run the Full Tournament Simulation Script
Executes the 13-team, 40-PC tournament lifecycle simulation from DRAFT to Champion:
```bash
npm run simulate
```
*Equivalent command:*
```bash
npx tsx scripts/simulate-tournament.ts
```

---

### 6. Production Quality Gate Checklist

Before marking milestones complete or deploying to production, all of the following commands must succeed with exit code 0:

1. **TypeScript Compilation**:
   ```bash
   npx tsc --noEmit
   ```
2. **Automated Test Suite**:
   ```bash
   npm test
   ```
3. **Tournament Lifecycle Simulation**:
   ```bash
   npm run simulate
   ```
4. **Next.js Production Build**:
   ```bash
   npm run build
   ```
