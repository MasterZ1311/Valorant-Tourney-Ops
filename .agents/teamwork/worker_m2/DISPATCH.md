## 2026-09-26T05:08:30Z
You are Worker M2 for the VALORANT Tournament Operations System (VTO).
Your working directory is: e:/Github/Valorant Brackets/.agents/teamwork/worker_m2/
The project root is: e:/Github/Valorant Brackets
Authoritative user request: e:/Github/Valorant Brackets/.agents/teamwork/ORIGINAL_REQUEST.md
System rules & invariants: e:/Github/Valorant Brackets/GEMINI.md
Project specification: e:/Github/Valorant Brackets/.agents/teamwork/orchestrator_1/PROJECT.md
Survey & Gap Report: e:/Github/Valorant Brackets/.agents/teamwork/survey_explorer_1/report.md

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Objective:
Implement Milestone 2 — Tournament Domain Engine:
1. Update `src/lib/tournament/types.ts`:
   - Add types for Round Robin: `RoundRobinMatch`, `RoundRobinRound`, `RoundRobinStructure`, `TeamStanding`, `TiebreakerRule`.
   - Add types for Group Stage: `TournamentGroup`, `GroupStageStructure`, `KnockoutAdvancement`.
2. Implement `src/lib/tournament/round-robin.ts`:
   - Pure TypeScript, zero React or DB dependencies.
   - `generateRoundRobinFixtures(participants: Participant[])`:
     - Berger Cyclic Pairing Algorithm for both even and odd team counts (using dummy BYE).
     - Balanced home/away sides.
   - `calculateRoundRobinStandings(matches: RoundRobinMatch[], participants: Participant[])`:
     - Points: 3 points for standard win, 1 point for OT win, 0 for loss.
     - Head-to-Head tiebreaker.
     - Round differential ($\text{roundsWon} - \text{roundsLost}$).
     - Total rounds won.
3. Implement `src/lib/tournament/group-stage.ts`:
   - Pure TypeScript, zero React or DB dependencies.
   - `generateGroupStage(participants: Participant[], groupCount: number)`:
     - Snake seeding across pots (e.g. 16 teams into 4 groups).
     - Internal group round-robin fixture generation.
   - `calculateGroupStandings(groups: TournamentGroup[])`.
   - `generateKnockoutAdvancement(groupStandings)`: Crossover pairing (Group A 1st vs Group B 2nd, etc.) into an 8-team Single Elimination bracket.
4. Update `src/lib/tournament/validator.ts`:
   - Implement Check #10: "Conflict-Free Fixture Schedule" (validates schedule conflict list is empty and start time is valid).
5. Update `tests/unit/bracket-engine.test.ts`:
   - Add test case verifying that $N = 1$ team throws the expected Error cleanly.
6. Create `tests/unit/round-robin.test.ts`:
   - Comprehensive unit tests: even/odd teams (2, 3, 4, 5, 8 teams), Berger table pairings, BYE handling, points calculation, tiebreakers.
7. Create `tests/unit/group-stage.test.ts`:
   - Comprehensive unit tests: 16 teams into 4 groups, snake seeding, group standings, crossover knockout advancement.
8. Verification:
   - Run `npx tsc --noEmit` and `npm test` verifying all unit tests pass (100%).

Write Ownership:
You exclusively own:
- `src/lib/tournament/types.ts`
- `src/lib/tournament/round-robin.ts`
- `src/lib/tournament/group-stage.ts`
- `src/lib/tournament/validator.ts`
- `tests/unit/bracket-engine.test.ts`
- `tests/unit/round-robin.test.ts`
- `tests/unit/group-stage.test.ts`
Do NOT edit files in `prisma/`, `src/lib/scheduling/`, or `src/app/`.

Output Requirements:
Write a comprehensive completion report to `e:/Github/Valorant Brackets/.agents/teamwork/worker_m2/handoff.md` and send a completion message to the parent orchestrator.
