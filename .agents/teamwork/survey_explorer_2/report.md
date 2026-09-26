# Specification Mining & Architecture Gap Report: Tasks 4, 5, and 6
**VALORANT Tournament Operations System (VTO)**  
**Author**: Survey Explorer 2 (Specification Miner)  
**Date**: 2026-09-25T23:38:00Z  
**Target Scope**: 
- **Task 4**: Admin Dashboard & Tournament Setup Experience
- **Task 5**: Tournament-Day Operational Interface
- **Task 6**: Authentication, Authorization, RBAC & Audit Logging

---

## 1. Executive Summary

An exhaustive investigation was conducted across authoritative specification sources (`ORIGINAL_REQUEST.md`, `GEMINI.md`, `docs/ARCHITECTURE.md`, `docs/OPERATIONS.md`, `docs/USER_GUIDE.md`, `docs/ROADMAP.md`, `docs/DATABASE.md`) and the existing codebase (`prisma/schema.prisma`, `src/app/`, `src/components/`, `src/lib/`, `tests/`, `scripts/`).

### Overall System Health
- **Engine Layer**: `vitest` passes 29 unit tests (`bracket-engine.test.ts`, `scheduling-engine.test.ts`, `state-machine.test.ts`, `validator.test.ts`).
- **Compilation & Type Safety**: `npx tsc --noEmit` succeeds with 0 errors; `npm run build` generates 14 static/dynamic Next.js routes successfully.
- **Architectural Disconnect**: 
  - **No Service Layer**: `src/services/` does not exist. All routes interface directly with an in-memory mock store (`src/lib/store/tournament-store.ts`).
  - **Prisma Schema Disconnect**: `prisma/schema.prisma` defines 17 models (`Tournament`, `Team`, `Player`, `Lab`, `Station`, `PC`, `Match`, `MatchResult`, `Incident`, `Penalty`, `AuditLog`, `User`, `Volunteer`, etc.), but **zero** application API routes or server components perform Prisma DB queries.
  - **Zero Authentication & Authorization**: There is no session management, no password verification, no cookie/JWT handler, no Next.js `middleware.ts`, and no RBAC permission checks on any API route or page. Every administrative mutation (bracket regeneration, tournament unlock, match override) can be invoked anonymously by any HTTP caller.
  - **No Zod Input Validation**: While `zod` is installed in `package.json`, it is imported in 0 files in `src/`. All route handlers read unvalidated JSON directly.

---

## 2. Features Discovered

The following tables document all required and discovered features across Tasks 4, 5, and 6 based on authoritative specifications, documentation, and the current codebase.

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Task 4: Setup | Tournament Creation Wizard | Multi-step setup for new tournament (info, format, rules, labs, teams) | Name, date, time, venue, format, rules config | New `Tournament` + `TournamentSettings` record | 400 Bad Request on invalid fields | `ORIGINAL_REQUEST.md` §4, `USER_GUIDE.md` §2.1 |
| 2 | Task 4: Setup | Multi-Tournament Switching | Manage and switch between active, draft, and completed tournaments | Tournament ID selector / list | Selected tournament context | 404 if tournament not found | `docs/DATABASE.md`, `docs/ARCHITECTURE.md` |
| 3 | Task 4: Setup | Format Selection & Rules Config | Configure format (Single Elim, Round Robin, Group Stage) and match parameters | Format enum, match/buffer minutes, BYE advance toggle | Updated `TournamentSettings` | Blocked if tournament `FINALIZED` | `ORIGINAL_REQUEST.md` §2/§4, `GEMINI.md` §3 |
| 4 | Task 4: Setup | Team & Roster Registration | Register teams with 5 starters + up to 2 subs, Riot IDs, student IDs | Team name, institution, captain info, player roster array | Created `Team` and `Player` records | 400 if duplicate Riot ID or team name | `ORIGINAL_REQUEST.md` §4, `DATABASE.md` §3.3 |
| 5 | Task 4: Setup | Roster CSV / Bulk Import | Bulk import teams and player rosters from CSV file | Multipart form / CSV string | Array of imported teams and validation summary | Detailed line-by-line syntax / duplicate error report | `USER_GUIDE.md` §2.3, `ROADMAP.md` WS10 |
| 6 | Task 4: Setup | Seed Assignment & Reseed | Assign manual competitive seed numbers (1..N) to teams | Team ID, seed integer | Updated seeds with unique constraint | Conflict warning on duplicate seed numbers | `ROADMAP.md` WS3, `DATABASE.md` §3.3 |
| 7 | Task 4: Setup | Lab & Computing Hall Setup | Create/configure labs, total PC capacity, building, and active status | Lab name, building ID, total PCs | Created `Lab` record | Capacity mismatch warning | `USER_GUIDE.md` §2.2, `DATABASE.md` §3.5 |
| 8 | Task 4: Setup | Station Configuration | Group PCs into 10-PC stations with required PC count check | Station name, lab ID, PC count (standard: 10) | Created `Station` record | Error if station PC count != 10 | `GEMINI.md` §3.1, `DATABASE.md` §3.5 |
| 9 | Task 4: Setup | PC Hardware Provisioning | Register PC numbers, IP addresses, station mappings, hardware notes | PC number, IP address, labId, stationId, status | Created `PC` records | Uniqueness error on PC number per lab | `DATABASE.md` §3.5, `ROADMAP.md` WS8 |
| 10 | Task 4: Setup | Dynamic Capacity Evaluation | Re-evaluates station operational status: Station operational iff $\ge 10$ working PCs | List of PCs and statuses | Working PC counts, operational station count, max matches | None (pure deterministic calculation) | `GEMINI.md` §3.1, `capacity.ts` |
| 11 | Task 4: Setup | Interactive Bracket Visualizer | Visual tree view with seed pairings, BYE badges, score modal, round progress | Tournament bracket data | Interactive SVG/DOM bracket tree | Render error on cyclic or malformed DAG | `ROADMAP.md` WS7, `bracket-viewer.tsx` |
| 12 | Task 4: Setup | Round Robin & Group Visualizer | Standings table (Pts, W-L, RD, H2H) and group match schedule views | Group stage standings data | Group tables + knockout bracket tree | Sorting tie-breaker notice | `ORIGINAL_REQUEST.md` §2, `ROADMAP.md` WS3 |
| 13 | Task 4: Setup | Fixture Generation & Timeline | Generate hardware-constrained schedule with station windows & buffers | Bracket DAG, operational stations, start time | Array of scheduled fixtures | Error if insufficient stations or DAG cycle | `ORIGINAL_REQUEST.md` §3, `SCHEDULING.md` |
| 14 | Task 4: Setup | Fixture Conflict Detector | Guard against team double-booking, station overlap, or time collisions | Scheduled fixtures array | Conflict report (zero conflicts required) | Hard failure in validator | `GEMINI.md` §3.2, `SCHEDULING.md` |
| 15 | Task 4: Setup | Pre-Flight 10-Point Validator | Comprehensive diagnostic checklist before tournament locking | All tournament configuration entities | `ValidationReport` with critical/warning counts | Blocks `FINALIZED` if critical errors $> 0$ | `GEMINI.md` §3.3, `validator.ts` |
| 16 | Task 4: Setup | Finalization & Lock Control | Lock bracket, fixtures, and rosters when pre-flight passes | Action `FINALIZE`, user session | Tournament status $\to$ `FINALIZED`, `finalizedAt` | 400 if validation fails or unauthorized | `GEMINI.md` §3.3, `validate/route.ts` |
| 17 | Task 4: Setup | Administrative Unlock | Allow modification to locked tournament with mandatory audit rationale | Action `UNLOCK`, reason string, user session | Tournament status $\to$ `READY`, audit log | 400 if reason missing, 403 if not SUPER_ADMIN | `GEMINI.md` §3.3, `ARCHITECTURE.md` §3.3 |
| 18 | Task 4: Setup | KPI Metrics Dashboard | Real-time overview cards: Attendance, Match progress, PC capacity, Incidents | Tournament ID | KPI statistics card grid | Graceful empty states if tournament unseeded | `ORIGINAL_REQUEST.md` §4, `admin/page.tsx` |
| 19 | Task 5: Operations | Team Attendance Check-In | Mark teams as checked in, verify 5-player presence, timestamp | Team ID, checkedIn toggle, actorId | Updated `TeamStatus` (`CHECKED_IN`/`INCOMPLETE`) | Warning if roster $< 5$ players | `OPERATIONS.md` SOP 2, `USER_GUIDE.md` §2.4 |
| 20 | Task 5: Operations | Player ID Verification Desk | Check physical college ID card and Riot ID/tag per player | Player ID, verified boolean, present boolean | Updated `Player` record (`verified`, `present`) | Flag unverified players on check-in | `OPERATIONS.md` SOP 2, `DATABASE.md` §3.4 |
| 21 | Task 5: Operations | Substitute Player Swap | Swap substitute into starting lineup before match play | Team ID, starter Player ID, sub Player ID | Updated player roles (`STARTER` $\leftrightarrow$ `SUBSTITUTE`) | Blocked if match already `LIVE` | `DATABASE.md` §3.4, `ORIGINAL_REQUEST.md` §5 |
| 22 | Task 5: Operations | Match Calling | Advance match from `SCHEDULED` to `CALLED`, summon teams to station | Match ID, station ID | Match status $\to$ `CALLED`, notification/display update | 400 if illegal transition or station busy | `GEMINI.md` §3.3, `state-machine.ts` |
| 23 | Task 5: Operations | Station Seated & Ready | Confirm players are seated at PCs and peripherals verified | Match ID | Match status $\to$ `READY` | 400 if illegal transition | `OPERATIONS.md` SOP 4, `state-machine.ts` |
| 24 | Task 5: Operations | Lobby Ready Verification | Confirm custom 5v5 VALORANT lobby setup (Cheats OFF, Tournament Mode ON) | Match ID, lobby checklist | Match status $\to$ `LOBBY_READY` | 400 if lobby checklist incomplete | `OPERATIONS.md` SOP 4, `state-machine.ts` |
| 25 | Task 5: Operations | Start Live Match | Transition match to `LIVE`, record `actualStartTime` | Match ID, actorId | Match status $\to$ `LIVE`, live board indicator active | 400 if illegal transition | `OPERATIONS.md` SOP 4, `state-machine.ts` |
| 26 | Task 5: Operations | Technical Pause | Pause match during network drop, hardware issue, or client crash | Match ID, pause reason | Match status $\to$ `PAUSED`, pause timestamp | 400 if match not `LIVE` | `OPERATIONS.md` SOP 5, `GEMINI.md` §3.3 |
| 27 | Task 5: Operations | Resume Live Match | Resume match after issue resolution | Match ID | Match status $\to$ `LIVE`, pause duration logged | 400 if match not `PAUSED` | `OPERATIONS.md` SOP 5, `GEMINI.md` §3.3 |
| 28 | Task 5: Operations | Finish Match & Result Entry | Submit round scores (e.g. 13-9) and optional screenshot proof | Match ID, scoreA, scoreB, screenshotUrl, notes | Match status $\to$ `RESULT_PENDING`, `MatchResult` created | 400 if scores invalid (e.g. $< 13$ rounds, tie) | `OPERATIONS.md` SOP 6, `state-machine.ts` |
| 29 | Task 5: Operations | Result Official Verification | Official cross-checks score against lobby screenshot and verifies | Match ID, verifiedBy, verificationNotes | Match status $\to$ `VERIFIED`, winner advanced in bracket | 403 if actor not RESULTS_OFFICIAL or ADMIN | `GEMINI.md` §3.3, `OPERATIONS.md` SOP 6 |
| 30 | Task 5: Operations | Winner Bracket Advancement | Automatically populate winner into next round feeder slot | Verified match result | Next round match updated with team slot | 400 if feeder match unverified | `GEMINI.md` §3.3, `bracket.ts` |
| 31 | Task 5: Operations | Match Forfeit & DQ | Award forfeit victory or disqualify team with confirmation modal | Match ID, forfeitedTeamId, penaltyReason | Match status $\to$ `FORFEIT`, opponent advances | 400 if unconfirmed or unauthorized | `GEMINI.md` §3.3, §5 |
| 32 | Task 5: Operations | Incident Ticketing Desk | Log incident (category, severity, description, match/team/player link) | Incident details, category, severity, matchId | Created `Incident` record | 400 on missing description or invalid severity | `ROADMAP.md` WS10, `DATABASE.md` §3.8 |
| 33 | Task 5: Operations | Incident Resolution & Audit | Record resolution notes, resolve incident, hot-swap hardware | Incident ID, resolutionNotes, resolver user | Incident status $\to$ `RESOLVED`, audit log | 400 on empty resolution note | `OPERATIONS.md` SOP 5, `incident-desk.tsx` |
| 34 | Task 5: Operations | Penalty Management | Issue warning, round penalty, match forfeit, or team disqualification | Incident ID, matchId, action, reason, issuedBy | Created `Penalty` record, applied to match/team | 403 if actor lacks authority | `DATABASE.md` §3.8, `ROADMAP.md` WS10 |
| 35 | Task 5: Operations | Volunteer Assignment Manager | Assign volunteer marshals to specific labs, stations, and matches | Volunteer ID, stationId, matchId, shift | Created `VolunteerAssignment` record | Warning on overlapping volunteer shifts | `ROADMAP.md` WS9, `DATABASE.md` §3.9 |
| 36 | Task 5: Operations | Mobile Volunteer UI ($\ge 48$px) | High-contrast mobile match marshal console with touch targets $\ge 48$px | Volunteer session, station ID | Mobile view: Current match, 1-tap state buttons | 403 if unassigned or unauthorized | `GEMINI.md` §5, `ORIGINAL_REQUEST.md` §5 |
| 37 | Task 5: Operations | Broadcast Announcements | Publish announcements to target groups (All, Captains, Volunteers) | Title, content, targetGroup, templateName | Created `Announcement` record | 400 if title/content empty | `DATABASE.md` §3.9, `ORIGINAL_REQUEST.md` §5 |
| 38 | Task 5: Operations | Public TV Projector Scoreboard | Fullscreen, read-only, dark-mode auto-updating (8s) projector display | Tournament ID | Auto-updating live match board and bracket | Zero admin controls exposed | `GEMINI.md` §5, `ROADMAP.md` WS11 |
| 39 | Task 6: Auth & RBAC | Role-Based Access Control | Define 6 authoritative roles with strict permission matrices | User credentials / session token | User role & permitted actions | 401 Unauthorized / 403 Forbidden | `ORIGINAL_REQUEST.md` §6 |
| 40 | Task 6: Auth & RBAC | Secure Session Handling | Server-side secure session handling with HTTP-only cookies or signed JWTs | Login credentials (email, password) | Set-Cookie session token, user profile | 401 on invalid credentials | `ORIGINAL_REQUEST.md` §6, `ARCHITECTURE.md` |
| 41 | Task 6: Auth & RBAC | Next.js Route Protection | Middleware protecting `/admin/*`, `/volunteer/*` based on role | Incoming HTTP request URL + session cookie | Allow request or Redirect to `/login` | Redirect 307 to `/login` | `ORIGINAL_REQUEST.md` §6, `GEMINI.md` §1.3 |
| 42 | Task 6: Auth & RBAC | API Endpoint Defense | Server-side validation of session and role on every API route handler | Request headers / cookies | 200 OK with data or structured 401/403 error | Structured error JSON: `{ success: false, error }` | `GEMINI.md` §1.3, `ORIGINAL_REQUEST.md` §6 |
| 43 | Task 6: Auth & RBAC | Zod Request Validation | Validate every incoming request body against Zod schemas matching DB | Request JSON body | Parsed, typed payload or 400 Zod error array | 400 Bad Request with field-level errors | `GEMINI.md` §1.3, §7 |
| 44 | Task 6: Auth & RBAC | Immutable Audit Logging | Cryptographically track all state transitions, score entries, and overrides | Actor ID, role, action, entity, before/after state | Created `AuditLog` row in database | Failed mutations rolled back if audit fails | `GEMINI.md` §1.2, §4, `DATABASE.md` §3.9 |
| 45 | Task 6: Auth & RBAC | Audit Trail Viewer | Searchable, filterable audit log timeline for tournament compliance | Tournament ID, filters (actor, entity, action) | Audit log table with before/after state diffs | 403 if actor not SUPER_ADMIN or ADMIN | `ROADMAP.md` WS6, `audit/page.tsx` |

---

## 3. Edge Cases & Boundary Behaviors

The following edge cases were investigated against the domain engine, state machine, and UI components:

| # | Feature | Input / Condition | Observed Behavior | Status & Severity |
|---|---------|-------------------|-------------------|-------------------|
| 1 | Single Elimination Bracket | 13 Teams with 40 PCs (3 BYEs) | Top 3 seeds (1, 2, 3) receive BYEs; 10 teams play 5 matches in Round 1. Bracket size 16. | Correct & Tested |
| 2 | Edge-Case Team Counts | 1, 2, 3, 5, 7, 9, 15, 17, 32 Teams | Power-of-2 sizing correctly fills with BYEs up to nearest $2^k$. | Correct & Tested |
| 3 | Station Capacity Recalculation | 1 PC marked OFFLINE in Lab 1 (leaving 9 working PCs in Station 1) | Station 1 working PCs drops to 9, `isOperational` becomes false. Lab operational stations drops from 3 to 2. Max simultaneous matches drops from 4 to 3. | Correct & Tested |
| 4 | Asymmetric Labs | Lab 1 (30 PCs / 3 stations), Lab 2 (10 PCs / 1 station) | Evaluator treats each station independently: 3 operational in Lab 1 + 1 in Lab 2 = 4 operational stations. | Correct & Tested |
| 5 | State Machine: Illegal Tournament Transition | `DRAFT` $\to$ `LIVE` | `validateTournamentTransition` throws: `Illegal tournament status transition from DRAFT to LIVE`. | Correct & Tested |
| 6 | State Machine: Illegal Match Transition | `SCHEDULED` $\to$ `LIVE` (skipping `CALLED`, `READY`, `LOBBY_READY`) | `validateMatchTransition` throws: `Illegal match status transition from SCHEDULED to LIVE`. | Correct in domain engine, **BYPASSED by API route!** |
| 7 | State Machine: Premature Verification | Verify score when match is in `LIVE` or `READY` | State machine prohibits `LIVE` $\to$ `VERIFIED`. `canTransitionMatch("LIVE", "VERIFIED") === false`. | Domain engine prohibits, but UI/API currently bypasses state machine! |
| 8 | UI Result Entry: Inverted Score / Winner Mismatch | Score entered: Team A 13, Team B 8; Operator clicks "Award Team B" | `BracketViewer` score modal accepts winner regardless of score; no cross-validation between score inputs and selected winner. | **Defect**: High severity logic flaw in UI |
| 9 | UI Result Verification: Missing Tie / Overtime Rule | Score entered: 12-12 or 13-12 | Accepted by modal without enforcing VALORANT standard overtime rule (win by 2, e.g. 14-12, 15-13). | **Defect**: Medium severity |
| 10 | Volunteer UI: Direct Result Verification | Volunteer taps "Submit Score" on mobile | Immediately advances winner and marks fixture `VERIFIED`, bypassing `RESULT_PENDING` and official verification. | **Defect**: Critical invariant violation |
| 11 | Fixture Regeneration on Finalized Tournament | Tournament status is `FINALIZED` or `LIVE`; user clicks "Recalculate Hardware Schedule" | `POST /api/tournaments/[id]/fixtures` regenerates all fixtures without checking tournament status or requiring unlock reason! | **Defect**: Critical invariant violation |
| 12 | Anonymous API Mutation | Raw HTTP POST to `/api/tournaments/[id]/validate` with `{ action: "FINALIZE" }` or `{ action: "UNLOCK" }` without auth token | Endpoint executes mutation with hardcoded actor `"admin"`, `"SUPER_ADMIN"`. | **Defect**: Critical security vulnerability |
| 13 | Unvalidated Payload Ingestion | `PATCH /api/tournaments/[id]/matches/[matchId]` with `{ status: "BOGUS_STATUS" }` | Passes string directly into store; TypeScript compile-time cast `status as MatchStatus` bypasses runtime validation. | **Defect**: High severity |
| 14 | Volunteer Assignment Boundary | Volunteer opens `/volunteer` with multiple simultaneous matches | UI does not filter by volunteer assignment; grabs first playable match found across entire venue. | **Defect**: Medium severity |

---

## 4. In-Depth Analysis: Task 4 — Admin Dashboard & Setup Experience

### 4.1 What Exists Today
1. **Admin Dashboard (`src/app/(admin)/admin/page.tsx`)**:
   - 4 KPI summary cards (Teams & Attendance, Matches Progress, Hardware Capacity, Active Incidents).
   - Upcoming Fixture Timeline queue showing next 4 scheduled matches with station badges and timestamps.
   - Quick operation buttons (Live Match Controller, Volunteer View, Projector Scoreboard).
   - Bracket snapshot summary card (format, size, rounds, BYEs).
   - Pre-flight validation modal integration.
2. **Bracket Viewer (`src/components/tournament/bracket-viewer.tsx`)**:
   - Multi-column tree view displaying rounds from Round 1 through Grand Finals.
   - Seed badges (`#1`, `#2`), feeder placeholders (`TBD (Feeder)`), and BYE badges.
   - Live match glow indicators.
   - Modal dialog for entering scores and advancing winners.
3. **Fixture Table (`src/components/tournament/fixture-table.tsx`)**:
   - Filterable timeline table with Round filter and Status filter.
   - Match code, round name, team pairings, station/lab allocations, time slots, and status badges.
   - "Recalculate Hardware Schedule" button.
4. **Venue & Hardware Grid (`src/components/venue/lab-pc-grid.tsx`)**:
   - Summary metric banners for configured PCs, operational PCs, active stations, and simultaneous match capacity.
   - Multi-lab layout view (Lab 1 North Hall, Lab 2 South Arena).
   - Clickable 10-PC matrix per station allowing instant failure toggling (`AVAILABLE` $\leftrightarrow$ `OFFLINE`).
5. **Team Roster Manager (`src/components/tournament/team-roster-manager.tsx`)**:
   - Attendance summary cards (Total Registered, Checked In, Match Ready, Incomplete, Absent).
   - Searchable team list with seed badges and check-in status toggles.
   - Team detail pane displaying captain contact, institution, and 5 starting players with Riot IDs.
6. **Validation Modal (`src/components/tournament/validation-modal.tsx`)**:
   - 10-point pre-flight checklist modal with critical/warning/passed summaries.
   - "Lock & Finalize Tournament" button (disabled when critical errors $> 0$).
   - Administrative unlock prompt requiring mandatory rationale.

### 4.2 Gaps & Missing Requirements for Task 4
1. **No Tournament Creation Wizard**:
   - `docs/USER_GUIDE.md` §2.1 explicitly instructs operators to go to `/admin/tournaments/new`. This route does not exist.
   - No UI exists to create a new tournament from scratch, select formats, set match durations, configure buffer times, or input venue information.
2. **Hardcoded Tournament ID**:
   - Almost every admin page hardcodes `const tournamentId = "vto-tourney-1";`.
   - There is no tournament switcher, dropdown, or tournament management table.
3. **In-Memory Store Instead of Service Layer**:
   - All admin pages call `store.getTournament(...)`, `store.getTeams(...)`, etc., directly in server components.
   - If the Next.js Node process restarts or scales to multiple instances, all changes are wiped.
   - Does not query PostgreSQL via Prisma.
4. **Destructive Actions Use Browser `window.confirm`**:
   - Bracket regeneration in `bracket-viewer.tsx` (line 22) uses `window.confirm`.
   - Fixture regeneration in `fixture-table.tsx` (line 21) uses `window.confirm`.
   - Tournament finalization in `validation-modal.tsx` (line 45) uses `window.confirm`.
   - `GEMINI.md` §5 explicitly mandates: **"Confirmation Modals: Required for destructive or irreversible actions (Unlock Tournament, Disqualify Team, Forfeit Match, Overwrite Result)"**. Browser `window.confirm` is prohibited.
5. **Fixture Regeneration Not Blocked on Finalized Tournament**:
   - When a tournament is `FINALIZED` or `LIVE`, clicking "Recalculate Hardware Schedule" regenerates fixtures without error, violating `GEMINI.md` §3.4.
6. **No Team / Player Editing or Creation**:
   - Operators cannot add a new team, edit team details, add/remove players, or import rosters via CSV from the UI.
7. **No Lab / Station Creation UI**:
   - Operators cannot add a new lab, add a station, or reconfigure station sizes from the UI.

---

## 5. In-Depth Analysis: Task 5 — Tournament-Day Operational Interface

### 5.1 What Exists Today
1. **Live Match Control Board (`src/components/operations/live-match-board.tsx`)**:
   - Multi-card grid of all playable tournament matches.
   - Visual status indicators with color coding (LIVE = red glow, PAUSED = amber glow).
   - Station assignment indicators (`Station 1 (Lab 1)`).
   - One-touch state progression buttons: "Call Teams", "Mark Teams Seated & Ready", "Start Match (LIVE)", "Tech Pause", "Resume Match Play", "Finish Match", "Verify Score & Advance".
2. **Mobile Volunteer Portal (`src/app/volunteer/page.tsx`)**:
   - Mobile-first layout (`max-w-md mx-auto`) optimized for smartphones.
   - Touch targets $\ge 48\text{px}$ (`h-14` = 56px, `h-12` = 48px).
   - Hero card highlighting current active match with station badge and team boxes.
   - 1-tap state buttons with distinct colors and icons.
   - Upcoming matches queue on deck.
   - Score entry modal.
   - 5-second polling interval for real-time updates.
3. **Incident Desk (`src/components/operations/incident-desk.tsx`)**:
   - Incident listing with severity badges (`CRITICAL`, `HIGH`, `LOW`).
   - Incident reporting modal with category dropdown (`TECHNICAL`, `PC`, `NETWORK`, `AUDIO`, `CONDUCT`, `CHEATING`, `LOBBY`), severity dropdown, match code, description.
   - Resolution modal allowing operators to log resolution notes and mark resolved.

### 5.2 Gaps & Missing Requirements for Task 5
1. **Bypassing the Official State Machine**:
   - `LOBBY_READY` state transition is completely omitted in both `live-match-board.tsx` and `volunteer/page.tsx`. Matches jump straight from `READY` to `LIVE`.
   - `RESULT_PENDING` state transition is completely omitted in both UIs. Matches jump straight from `FINISHED` to `VERIFIED`.
   - In `live-match-board.tsx`, clicking "Verify Score & Advance" sends `PATCH status: "VERIFIED"` without capturing any score or winner!
2. **Volunteer Result Submission Violates Role Boundary**:
   - In `volunteer/page.tsx`, the volunteer enters score and clicks "Submit Score", which immediately calls `POST /api/tournaments/[id]/bracket` with action `ADVANCE`, crowning the winner and marking the match `VERIFIED`.
   - Per `OPERATIONS.md` SOP 6 and `GEMINI.md` §3.3: Volunteers must only **submit** results (`RESULT_PENDING`), and only a **Results Official** or **Tournament Admin** can verify scores and advance the bracket.
3. **No VALORANT Score Validation**:
   - VALORANT standard competitive rules require:
     - Winner must reach at least 13 rounds.
     - Regulation win: 13-X where $X \le 11$.
     - Overtime win: Margin must be exactly 2 (e.g. 14-12, 15-13, 16-14). A score of 13-12 is invalid in VALORANT tournament play.
     - Neither the UI modal nor the backend validates round scores!
4. **Attendance Desk Deficiencies**:
   - Team check-in is an all-or-nothing toggle; individual player check-in and photo ID verification cannot be toggled from the UI.
   - No route `/admin/attendance` exists (only `/admin/teams`).
   - No substitute player management or substitution swap workflow.
5. **No Mobile Incident Reporting**:
   - Volunteer marshals on the floor (`/volunteer`) have no button or modal to report an incident or technical fault directly from their mobile station view.
6. **No Volunteer Station Filtering**:
   - The volunteer page displays the first playable match across the entire tournament rather than filtering to the volunteer's assigned station.
7. **No Penalty Issuance**:
   - `Penalty` model exists in schema (`WARNING`, `ROUND_PENALTY`, `MATCH_FORFEIT`, `DISQUALIFICATION`), but zero UI or API endpoints exist to issue penalties.
8. **No Announcements Feature**:
   - `Announcement` model exists in schema, but zero UI or API routes exist to draft or broadcast announcements.

---

## 6. In-Depth Analysis: Task 6 — Authentication, Authorization & Security

### 6.1 Authoritative Role Definitions & Matrix

The user request specifies 6 distinct roles. The table below defines the authoritative RBAC permission matrix for VTO:

| Role | Description | Permitted Actions | Prohibited Actions |
|---|---|---|---|
| **`SUPER_ADMIN`** | System & Technical Lead | Full system access; Administrative Tournament Unlock; Bracket Reseed; User & Role Management; Format Overrides; System Audit Review | None |
| **`TOURNAMENT_ADMIN`** | Tournament Director | Create Tournament; Setup Labs/PCs; Seed Teams; Pre-Flight Validation; Lock & Finalize; Disqualify Teams; Resolve Incidents; Issue Penalties | Unlock Tournament without audit reason; Delete audit records |
| **`COORDINATOR`** | Operations Lead | Manage Attendance & Check-in; Assign Volunteers to Stations; Reassign Fixture Stations; Issue Warnings; Report Incidents | Finalize Tournament; Advance Bracket Winners; Reseed Brackets |
| **`RESULTS_OFFICIAL`** | Head Referee / Score Judge | Review Pending Results; Inspect Lobby Screenshots; Verify Scores & Advance Winners; Dispute Score Resolution | Modify Lab/PC hardware status; Reschedule fixtures; Check-in teams |
| **`VOLUNTEER`** | Station Match Marshal | Call Teams; Confirm Seated; Verify Lobby Settings; Start Match; Technical Pause; Submit Match Score (`RESULT_PENDING`); Report Incident | Verify Results; Advance Bracket; Finalize Tournament; Modify Venues |
| **`VIEWER`** | Spectator / Public Display | View Public Scoreboards (`/display/*`); View Bracket Tree; View Fixture Schedule | Any mutation; Access `/admin/*` or `/volunteer/*` |

### 6.2 Security Audit & Current Codebase Vulnerabilities

| Vulnerability Area | Current Codebase State | Risk Level | Required Remediation |
|---|---|---|---|
| **Route Protection** | No Next.js `middleware.ts` exists. `/admin/*` and `/volunteer/*` are publicly exposed to unauthenticated visitors. | **CRITICAL** | Implement `middleware.ts` with route matchers: redirect unauthenticated requests to `/login`; block unauthorized roles. |
| **API Route Authentication** | All 10 API routes in `src/app/api/tournaments/**` execute without session or bearer token verification. | **CRITICAL** | Implement server-side session verification helper (`requireAuth`, `requireRole`) on every API handler. |
| **Input Validation (Zod)** | Zero API routes use Zod schemas. `await req.json()` is parsed with raw type assertions. | **HIGH** | Define Zod schemas for all mutation payloads (`CreateTournamentSchema`, `UpdateMatchStatusSchema`, `SubmitResultSchema`, etc.). |
| **Audit Log Integrity** | Audit logs are written to an in-memory array with hardcoded actor IDs (`"admin"`, `"SUPER_ADMIN"`). Not persisted to DB. | **HIGH** | Write audit logs via Prisma in transactional batches; extract real `actorId`, `actorRole`, `ipAddress`, and structured `beforeState`/`afterState` diffs. |
| **Session Handling** | No login route, no session tokens, no password hashing (`bcrypt`), no HTTP-only cookies. | **CRITICAL** | Implement secure session management (e.g. Iron-session or JWT in HTTP-only, SameSite cookies) + `/login` page + password hash verification. |
| **User Role Schema** | Prisma `User.role` is a plain string with default `"MATCH_MARSHAL"` and outdated comment list. | **MEDIUM** | Update Prisma schema with an explicit enum `UserRole` matching all 6 required roles: `SUPER_ADMIN`, `TOURNAMENT_ADMIN`, `COORDINATOR`, `VOLUNTEER`, `RESULTS_OFFICIAL`, `VIEWER`. |

---

## 7. UI Conventions & Operational Requirements

The system rules in `GEMINI.md` define strict UI/UX standards tailored for high-pressure, dim LAN esports venues:

1. **Mobile-First Volunteer UI**:
   - Touch targets must be $\ge 48\text{px}$ in height and width (e.g. `min-h-[48px]`, `h-12` or `h-14` in Tailwind).
   - High contrast color palette: Dark background (`#0f1923`, `#17202a`), vibrant action colors (VALORANT Red `#ff4655`, Emerald `#10b981`, Amber `#f59e0b`, Blue `#3b82f6`).
   - Zero multi-step administrative dropdowns or dense tables on mobile.
   - Minimal navigation: Match Marshal only sees their assigned station and immediate action button.
2. **Operator Ergonomics & Speed**:
   - 1-to-2 click operations for common tasks: Call Teams, Mark Ready, Start Match, Tech Pause, Resume Match, Check-in Player.
   - Real-time visual feedback: Pulsing indicators for live matches and active syncing.
3. **Confirmation Modals**:
   - Required for destructive, irreversible, or high-consequence operations:
     - Unlock Finalized Tournament (requires mandatory audit reason).
     - Regenerate / Reseed Bracket.
     - Regenerate Fixture Schedule.
     - Disqualify Team / Forfeit Match.
     - Overwrite Verified Result.
   - Browser `window.confirm` and `window.alert` are **strictly forbidden**. Modals must be fully styled accessible React dialog components with clear explanation of consequences and explicit confirmation buttons.
4. **Zero Tournament Logic in UI Components**:
   - UI components must be purely presentational.
   - Calculation of working PCs, station capacity, bracket size, BYE allocation, standings order, or winner progression must never be written inside JSX or component handlers.
   - All domain calculations belong in pure domain functions (`src/lib/tournament/`, `src/lib/scheduling/`) and orchestration services (`src/services/`).
5. **Clear Error Messaging**:
   - Errors displayed in the UI must communicate:
     1. What went wrong (concise error title).
     2. Root cause (why the action was rejected).
     3. Actionable recovery advice (what the operator must do to proceed).

---

## 8. Prioritized Implementation Roadmap for Tasks 4, 5, 6

Based on the specification audit and codebase gaps, the following concrete deliverables must be executed by implementation agents:

### Phase 1: Security, Auth & Service Layer Foundation (Task 6)
1. **Prisma Schema Update**:
   - Define `enum UserRole { SUPER_ADMIN, TOURNAMENT_ADMIN, COORDINATOR, VOLUNTEER, RESULTS_OFFICIAL, VIEWER }`.
   - Update `User` model to use `UserRole`.
   - Add session or token support (e.g. `Session` model or JWT secret).
2. **Auth & RBAC Infrastructure (`src/lib/auth/`, `src/services/auth.service.ts`)**:
   - Password hashing and verification using standard crypto/bcrypt.
   - Secure session handling via signed HTTP-only cookies.
   - Role permission guard utility: `requireRole(allowedRoles: UserRole[])`.
   - Next.js `middleware.ts`: route protection for `/admin/:path*`, `/volunteer/:path*`.
   - Authentication UI: `/login` page with high-contrast esports theme.
3. **Prisma Service Layer (`src/services/`)**:
   - Create `tournament.service.ts`, `scheduling.service.ts`, `attendance.service.ts`, `incident.service.ts`, `audit.service.ts`.
   - Migrate endpoints from in-memory mock `tournament-store.ts` to Prisma PostgreSQL database transactions (`prisma.$transaction`).
   - Implement Zod validation schemas for all requests.

### Phase 2: Tournament Setup & Admin Experience (Task 4)
1. **Tournament Creation Wizard (`src/app/(admin)/admin/tournaments/new/page.tsx`)**:
   - Multi-step wizard: Basic info $\to$ Rules & Format $\to$ Labs & Hardware $\to$ Teams & Seeding $\to$ Review.
2. **Team & Roster Management Enhancements**:
   - Add Team modal and Edit Team modal.
   - CSV bulk upload parser for rosters with validation.
   - Player management: Add substitute, swap starter/substitute.
3. **Hardware Management Enhancements**:
   - Add Lab modal and Add Station modal.
   - Multi-status PC selector (`AVAILABLE`, `MAINTENANCE`, `TECHNICAL_ISSUE`, `OFFLINE`, `RESERVED`).
4. **Bracket & Fixture Protections**:
   - Replace all `window.confirm` calls with accessible Confirmation Modals.
   - Block bracket and fixture regeneration if tournament is `FINALIZED` or `LIVE` without SUPER_ADMIN unlock.
   - Support Round Robin and Group Stage visualization views.

### Phase 3: Tournament-Day Operations Interface (Task 5)
1. **Attendance & Registration Desk (`src/app/(admin)/admin/attendance/page.tsx`)**:
   - Individual player attendance toggles (`present`, `verified`).
   - College photo ID verification check.
   - Link route to `/admin/attendance` in navigation.
2. **Two-Phase Result Entry & Verification Flow**:
   - Phase 1 (Volunteer): Score submission $\to$ Status `RESULT_PENDING`, stores `MatchResult`.
   - Phase 2 (Results Official): Score verification $\to$ Status `VERIFIED`, advances winner in bracket.
   - Strict VALORANT score validator (13 wins, win-by-2 in overtime).
3. **Full Match State Machine Adherence**:
   - Integrate `LOBBY_READY` checklist (cheats OFF, tournament mode ON) before `LIVE`.
   - Match forfeit and cancellation controls with confirmation dialogs.
4. **Mobile Volunteer Portal Enhancements**:
   - Station selector or filter based on logged-in volunteer assignment.
   - Mobile Incident Quick-Report button on `/volunteer`.
5. **Incidents & Penalties**:
   - Link "Tech Pause" button directly to incident report prompt.
   - Penalty issuance UI (Warning, Round Penalty, Forfeit, DQ).
6. **Announcements**:
   - Announcement drafting and broadcasting interface.

---

## 9. Conclusion

The domain calculation engines (`bracket.ts`, `capacity.ts`, `scheduler.ts`, `validator.ts`, `state-machine.ts`) are well-architected, deterministic, and 100% unit-tested. However, the application layer currently runs on an in-memory prototype store with zero authentication, bypassed state transitions, missing setup wizards, and unvalidated API endpoints. 

Addressing the gaps detailed in this report will transform VTO from an in-memory prototype into an enterprise-grade, secure, tournament-ready LAN operations platform.
