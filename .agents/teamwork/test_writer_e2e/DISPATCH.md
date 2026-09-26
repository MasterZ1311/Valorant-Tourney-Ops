## 2026-09-25T23:38:30Z
You are the E2E Test Writer for the VALORANT Tournament Operations System (VTO).
Your working directory is: e:/Github/Valorant Brackets/.agents/teamwork/test_writer_e2e/
The project root is: e:/Github/Valorant Brackets
Authoritative user request: e:/Github/Valorant Brackets/.agents/teamwork/ORIGINAL_REQUEST.md
System rules & invariants: e:/Github/Valorant Brackets/GEMINI.md
Project specification: e:/Github/Valorant Brackets/.agents/teamwork/orchestrator_1/PROJECT.md
Survey report: e:/Github/Valorant Brackets/.agents/teamwork/survey_explorer_3/report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All test implementations must be genuine, opaque-box, and derived from user requirements. A teamwork_preview_auditor will independently verify your work.

Objective:
Design and implement the complete E2E Testing Track (Tiers 1-4):
1. Create `TEST_INFRA.md` at project root `e:/Github/Valorant Brackets/TEST_INFRA.md` following the template in Project Pattern.
2. Design and implement opaque-box test suites covering:
   - Tier 1: Feature Coverage (>=5 test cases per feature across all inventoried features).
   - Tier 2: Boundary & Corner Cases (>=5 test cases per feature: 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 teams; 0, 1, 4, 10, 30, 40 PCs; 0 buffer; offline PCs; illegal transitions).
   - Tier 3: Cross-Feature Combinations (pairwise interactions: registration + seeding, hardware failure + scheduling, check-in + forfeit, state transitions + winner advancement).
   - Tier 4: Real-World Application Scenarios (realistic tournament workloads: 13-team college LAN tournament with technical pause, 16-team group stage + knockout with PC breakdown).
3. Place test suites in `tests/integration/e2e-requirements.test.ts` or `tests/e2e/` using Vitest test runner.
4. Publish `TEST_READY.md` at project root `e:/Github/Valorant Brackets/TEST_READY.md` summarizing:
   - Test Runner command (e.g. `npx vitest run tests/integration/e2e-requirements.test.ts` or `npm test`)
   - Complete Coverage Summary table (Counts for Tiers 1-4)
   - Feature Checklist mapping every inventoried feature.
5. Verify: Run the test suite and ensure tests pass.

Write Ownership:
You exclusively own:
- `TEST_INFRA.md`
- `TEST_READY.md`
- `tests/integration/e2e-requirements.test.ts` (or `tests/e2e/**`)
Do NOT edit implementation source code files in `src/` or `prisma/`.

Output Requirements:
Write a comprehensive completion report to `e:/Github/Valorant Brackets/.agents/teamwork/test_writer_e2e/handoff.md` and send a completion message to the parent orchestrator.
