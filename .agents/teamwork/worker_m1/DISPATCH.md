## 2026-09-25T23:38:30Z
You are Worker M1 for the VALORANT Tournament Operations System (VTO).
Your working directory is: e:/Github/Valorant Brackets/.agents/teamwork/worker_m1/
The project root is: e:/Github/Valorant Brackets
Authoritative user request: e:/Github/Valorant Brackets/.agents/teamwork/ORIGINAL_REQUEST.md
System rules & invariants: e:/Github/Valorant Brackets/GEMINI.md
Project specification: e:/Github/Valorant Brackets/.agents/teamwork/orchestrator_1/PROJECT.md
Survey & Gap Report: e:/Github/Valorant Brackets/.agents/teamwork/survey_explorer_1/report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement Milestone 1 — Database Architecture & Dev Tournament Seed:
1. Update `prisma/schema.prisma`:
   - Define `UserRole` enum (`SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `COORDINATOR`, `VOLUNTEER`, `RESULTS_OFFICIAL`, `VIEWER`) and update `User.role` to use `UserRole` with default `VOLUNTEER`.
   - Add compound unique constraints:
     - `Team`: `@@unique([tournamentId, name])`
     - `Lab`: `@@unique([buildingId, name])`
     - `Station`: `@@unique([labId, name])`
     - `PC`: `@@unique([labId, pcNumber])`
     - `Round`: `@@unique([tournamentId, roundNumber])`
     - `Match`: `@@unique([roundId, matchNumber])`
     - `Player`: `@@unique([teamId, riotId, riotTag])`
   - Add soft deletion `deletedAt DateTime?` to `Tournament`, `Team`, `Player`, `Match`, `PC`.
   - Run `npx prisma generate` to recompile client.
2. Implement `prisma/seed.ts`:
   - Standalone executable script matching `package.json` command `"prisma:seed": "npx tsx prisma/seed.ts"`.
   - Seed Super Admin user (`admin@vto.gg` with secure password hash).
   - Seed Tournament: "VALORANT Campus Championship 2026", status `READY`, format `SINGLE_ELIMINATION`.
   - Seed TournamentSettings (5 players/team, 2 substitutes, 45m match, 15m buffer, check-in required).
   - Seed Physical Venue: 1 Venue ("University Esports Complex"), 1 Building ("Engineering North"), 2 Labs:
     - Lab 1: 30 PCs, 3 Stations (10 PCs each).
     - Lab 2: 10 PCs, 1 Station (10 PCs).
     - All 40 PCs status `AVAILABLE`.
   - Seed 13 Teams with 5 starting players each (65 players total) with realistic names, Riot IDs (`Player#TAG`), and college IDs.
   - Seed Volunteer staff (Lead Coordinator, Match Marshals, Results Officials).
3. Implement Database Utilities in `src/lib/db-utils.ts`:
   - `runInTransaction`: helper for executing operations in `prisma.$transaction`.
   - `createAuditLogEntry`: helper function for recording immutable `AuditLog` records.
   - Soft deletion helpers (`softDeleteTeam`, `softDeleteTournament`, `restoreTeam`).
4. Implement Database Tests in `tests/db/database.test.ts`:
   - Test relational cascades and foreign keys.
   - Test compound unique constraints (reject duplicate team names, duplicate PC numbers in same lab).
   - Test soft-deletion behavior.
5. Verification:
   - Run `npx prisma generate`, `npx tsc --noEmit`, and `npx vitest run tests/db/`.
   - Run `npx tsx prisma/seed.ts` (test dry-run or mock if no live DB, or test against SQLite/mock client/validation).

Write Ownership:
You exclusively own:
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `src/lib/db-utils.ts`
- `tests/db/database.test.ts`
Do NOT edit files in `src/lib/tournament/`, `src/lib/scheduling/`, or `src/app/`.

Output Requirements:
Write a comprehensive completion report to `e:/Github/Valorant Brackets/.agents/teamwork/worker_m1/handoff.md` and send a completion message to the parent orchestrator.
