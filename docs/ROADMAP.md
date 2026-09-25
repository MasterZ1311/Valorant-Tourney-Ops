# VTO Implementation Roadmap & Execution Plan

This roadmap outlines the systematic development of the VALORANT Tournament Operations System across ten targeted phases.

---

## Phase Breakdown

### Phase A: Architecture & Foundation (Current Phase)
- [x] Workspace inspection & git initialization.
- [x] Project principles & engineering rules (`GEMINI.md`, `.agents/rules/*`).
- [x] Core architecture and subsystem specifications (`docs/*`).
- [x] Database ERD and relational schema design.
- [ ] Next.js + TypeScript + Tailwind + shadcn/ui base project setup.
- [ ] Prisma schema with PostgreSQL models, constraints, and indexes.

### Phase B: Pure Domain Engines (Zero-DB Unit Testable)
- [ ] Bracket Engine:
  - Sizing calculations ($2^{\lceil \log_2 N \rceil}$).
  - Seed distribution algorithm (standard competitive pairings).
  - BYE placement on top seeds.
  - DAG construction and winner advancement resolver.
- [ ] Scheduling & Resource Engine:
  - PC health and lab station operational status evaluator.
  - Simultaneous match capacity formula.
  - Fixture time slot and station assignment.
  - Conflict detector: Station overlap, team overlap, predecessor violations.
- [ ] State Machine & Validation Pipeline:
  - Finite state machine guards for Match and Tournament states.
  - 10-point pre-finalization checklist.

### Phase C: First Vertical Slice (End-to-End Core Workflow)
- [ ] Database repository & services for:
  - Tournament creation & settings.
  - Team & player registration.
  - Lab, station, and PC configuration.
  - Bracket generation & storage.
  - Fixture generation & conflict verification.
- [ ] Admin UI for:
  - Tournament Setup Wizard.
  - Team Roster Manager.
  - Lab/Station Configuration Grid (drag or click PC allocation).
  - Bracket Visualizer (interactive tree).
  - Fixture Timeline Table with validation indicator.
  - Main Tournament Dashboard with live metrics.

### Phase D: Live Match Operations & Volunteer Portal
- [ ] Match operations service:
  - Call teams, Mark Ready, Start Match, Technical Pause, Resume, Finish Match.
- [ ] Volunteer Mobile Route (`/volunteer`):
  - Touch-friendly 48px+ buttons, high contrast LAN mode.
  - Station marshal view: assigned station, current match, next match.
  - One-tap status updates and score submission.
- [ ] Score verification workflow:
  - Volunteer submits score (`RESULT_PENDING`).
  - Result Official / Admin reviews & verifies (`VERIFIED`).
  - Automatic atomic winner advancement in bracket tree.

### Phase E: Incident Desk, Attendance & Public Display
- [ ] Attendance Manager:
  - Real-time team check-in, missing player warning, ID verification.
- [ ] Incident & Technical Pause System:
  - Ticket creation (PC issue, network, conduct, cheats, audio).
  - Severity level & technician assignment.
  - Penalty system (warnings, round penalties, forfeits, disqualifications).
- [ ] Public Display Screen (`/display/:tournamentId`):
  - Projector-optimized scoreboard, live stations, next matches, bracket tree.
  - Auto-refreshing read-only display.

### Phase F: Finalization, Audit Logging & Reports
- [ ] Pre-Finalization automated validator with detailed PASS/FAIL report.
- [ ] Tournament Locking & Authorized Admin Unlock with mandatory audit reason.
- [ ] Comprehensive Audit Log viewer with before/after state diffs.
- [ ] Tournament Report Exporter (CSV/PDF) for standings, fixtures, results, and incidents.

### Phase G: Automated Testing & E2E Simulation
- [ ] Unit test suite (Vitest):
  - 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 team brackets.
  - BYE placement invariance.
  - Asymmetric labs, offline PC capacity recalculation.
  - Match state machine transitions.
- [ ] Simulation Script (`scripts/simulate-tournament.ts`):
  - 13 teams, 5 players each, 40 PCs (Lab 1: 30 PCs/3 stations, Lab 2: 10 PCs/1 station).
  - Full automated playthrough from registration to Grand Finals trophy.
