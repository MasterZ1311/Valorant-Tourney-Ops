# Testing Rules — VTO

### Test Suite Structure
- **Unit Tests** (`tests/unit/`): Run via Vitest.
  - Bracket generation across all team sizes (1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32).
  - BYE assignment invariants.
  - Seeding distribution and non-collision of top seeds.
  - Match state machine transitions (valid vs illegal transitions).
  - PC allocation and lab capacity formulas with offline/broken PCs.
  - Schedule conflict detection (team overlap, station overlap, predecessor time violations).
- **Integration Tests** (`tests/integration/`):
  - End-to-end tournament workflow: Tournament creation → Team registration → Lab station setup → Bracket & fixture generation → Match execution → Result verification → Winner advancement.
  - Validation pipeline tests before tournament finalization.
- **Simulation Script** (`scripts/simulate-tournament.ts`):
  - Runs full tournament simulation with 13 teams, 40 PCs (Lab 1: 30 PCs/3 stations, Lab 2: 10 PCs/1 station).
  - Exercises random scores, technical pauses, incident reporting, and verifies the final champion is crowned cleanly.
- **Zero Broken Tests**: CI/build must never succeed if any test fails.
