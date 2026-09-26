# Handoff Report: Specification Mining for Tasks 4, 5, and 6
**Agent**: Survey Explorer 2 (Specification Miner)  
**Date**: 2026-09-25T23:39:00Z  
**Target Recipient**: Principal Orchestrator (`befb317e-b934-479d-b1ff-ba849504a902`)  
**Artifacts Generated**: `e:/Github/Valorant Brackets/.agents/teamwork/survey_explorer_2/report.md`

---

### 1. Observation
1. **Domain Engine & Tests**:
   - `npm test` exited 0: 4 test files passed (`tests/unit/bracket-engine.test.ts`, `scheduling-engine.test.ts`, `state-machine.test.ts`, `validator.test.ts`), 29 tests total.
   - `npx tsc --noEmit` exited 0 with 0 errors.
   - `npm run build` exited 0, generating 14 routes.
2. **Missing Service Layer**:
   - Attempted listing `src/services/`; directory does not exist.
   - Every API route in `src/app/api/tournaments/**` imports `store` directly from `@/lib/store/tournament-store`.
   - `src/lib/store/tournament-store.ts` lines 77-85: `private tournaments = new Map(); ... private auditLogs = [];`. Data is stored in memory and reset on process restart.
   - `src/lib/db.ts` defines `prisma = global.prisma || new PrismaClient()`, but `grep_search` across `src/` reveals `prisma` is not imported or used by any API route or page component.
3. **Missing Authentication, Middleware & RBAC**:
   - `find_by_name` for `*middleware*` in `src/` returned 0 results. Next.js `middleware.ts` does not exist.
   - `grep_search` for `auth`, `session`, `jwt`, `login` in `src/` returned 0 results.
   - In `prisma/schema.prisma` lines 119-130: `User.role` is a plain string `@default("MATCH_MARSHAL") // SUPER_ADMIN, RESULT_OFFICIAL, MATCH_MARSHAL, DISPLAY`. There is no enum for the 6 required roles (`SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `COORDINATOR`, `VOLUNTEER`, `RESULTS_OFFICIAL`, `VIEWER`).
   - In `src/app/api/tournaments/[id]/validate/route.ts` lines 23-60: `POST` handler processes `FINALIZE`, `UNLOCK`, `START_LIVE` without inspecting authorization headers or session cookies.
4. **Missing Zod Validation**:
   - `grep_search` for `zod` in `src/` returned 0 results. No API route parses request bodies using Zod schemas.
5. **State Machine Bypasses in UI**:
   - In `src/lib/tournament/state-machine.ts` line 30-42: `VALID_MATCH_TRANSITIONS` defines `READY: ["LOBBY_READY", "CALLED", "FORFEIT"]` and `FINISHED: ["RESULT_PENDING", "LIVE"]`.
   - In `src/components/operations/live-match-board.tsx` lines 128-136: Button for `m.status === "READY"` triggers `updateStatus(m.matchId, "LIVE")`, bypassing `LOBBY_READY`.
   - In `src/components/operations/live-match-board.tsx` lines 171-180: Button for `m.status === "FINISHED"` triggers `updateStatus(m.matchId, "VERIFIED")`, bypassing `RESULT_PENDING` and omitting scores.
   - In `src/app/volunteer/page.tsx` lines 65-83: Volunteer entering score calls `POST /api/tournaments/[id]/bracket` with action `ADVANCE`, immediately verifying the result and advancing the bracket winner without Results Official approval.
6. **Destructive Actions Using Browser Prompt**:
   - `src/components/tournament/bracket-viewer.tsx` line 22: `if (!confirm("Are you sure you want to regenerate the bracket? ...")) return;`
   - `src/components/tournament/fixture-table.tsx` line 21: `if (!confirm("Regenerate fixtures? ...")) return;`
   - `src/components/tournament/validation-modal.tsx` line 45: `if (!confirm("Are you sure you want to FINALIZE this tournament? ...")) return;`
   - `GEMINI.md` §5 explicitly mandates custom confirmation modals and forbids browser `confirm()`.
7. **Missing Routes & Features**:
   - Route `/admin/tournaments/new` referenced in `USER_GUIDE.md` §2.1 does not exist.
   - Route `/admin/attendance` referenced in `USER_GUIDE.md` §1 does not exist.
   - CSV roster import does not exist.
   - Announcements interface does not exist.
   - Volunteer assignment UI does not exist.

---

### 2. Logic Chain
1. Observations 1 & 2 establish that while the core domain math engines and TypeScript compilation are solid, the application is decoupled from the PostgreSQL database and relies entirely on an in-memory singleton.
2. Observation 3 establishes that any user or script can execute privileged actions (locking, unlocking, advancing brackets, toggling hardware) because there is no route protection or API authentication.
3. Observation 4 establishes that API payloads are not validated at runtime, creating risk of data corruption or crashes if unexpected payloads are submitted.
4. Observation 5 establishes that the UI currently violates the state machine invariants mandated in `GEMINI.md` §3.3 by skipping intermediate states (`LOBBY_READY`, `RESULT_PENDING`) and allowing volunteers to directly finalize results.
5. Observation 6 demonstrates a direct violation of the UI/UX convention in `GEMINI.md` §5 requiring confirmation modals for destructive operations.
6. Observation 7 confirms that several key operational paths described in `USER_GUIDE.md` and `ORIGINAL_REQUEST.md` (new tournament wizard, attendance route, CSV import, volunteer assignment) are entirely missing.

---

### 3. Caveats
- No changes were made to source files or tests (strictly adhered to read-only constraint).
- Database migration status against a running PostgreSQL instance was not evaluated as Docker/DB container was not started; analysis was based on `prisma/schema.prisma` and client configuration.
- UI visual fidelity on actual mobile hardware was assessed via viewport CSS styling and touch-target sizing (`h-14` = 56px, `h-12` = 48px).

---

### 4. Conclusion
The VTO system requires a focused transition from an in-memory prototype to a production-ready application. To achieve the goals of Tasks 4, 5, and 6:
1. **Task 6 must be implemented first**: Prisma `UserRole` enum, session handling, Next.js `middleware.ts`, route/API guards, and Zod schemas.
2. **Database Service Layer must replace the in-memory store**: Implement `src/services/` using `prisma.$transaction` and real audit logs.
3. **Task 4 setup wizard & modals must be added**: `/admin/tournaments/new` wizard, team/lab creation dialogs, and replacement of `window.confirm` with accessible confirmation modals.
4. **Task 5 operational flows must enforce invariants**: Enforce 2-phase result flow (`RESULT_PENDING` $\to$ `VERIFIED`), add `LOBBY_READY` check, volunteer station filtering, and mobile incident reporting.

---

### 5. Verification Method
1. **Inspect Report**:
   - View `e:/Github/Valorant Brackets/.agents/teamwork/survey_explorer_2/report.md` for full discovery tables, role matrices, and gap breakdown.
2. **Verify Codebase Invariants Independently**:
   - Check test suite: `npm test`
   - Check typecheck: `npx tsc --noEmit`
   - Verify absence of middleware: `ls src/middleware.ts`
   - Verify absence of services: `ls src/services`
   - Verify zod absence in src: `git grep "zod" src/`
