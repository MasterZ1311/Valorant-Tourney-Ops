# Detailed Implementation Plan & Parallel Workstreams — VTO

This document defines the 12 independent, parallel workstreams for the development team and autonomous subagents. Each workstream has strictly partitioned file boundaries, inputs, deliverables, and automated verification criteria.

---

## Workstream Matrix

```
                      ┌────────────────────────────────────────┐
                      │    WS1: Architecture & Data Models     │
                      └───────────────────┬────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
┌───────────▼───────────┐   ┌─────────────▼───────────┐   ┌─────────────▼───────────┐
│ WS3: Tournament Engine│   │  WS4: Scheduling Engine │   │   WS5: State & Validator│
└───────────┬───────────┘   └─────────────┬───────────┘   └─────────────┬───────────┘
            │                             │                             │
            └─────────────────────────────┼─────────────────────────────┘
                                          │
                      ┌───────────────────▼────────────────────┐
                      │      WS6: Backend Services & API       │
                      └───────────────────┬────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
┌───────────▼───────────┐   ┌─────────────▼───────────┐   ┌─────────────▼───────────┐
│  WS7: Admin Desktop UI│   │  WS9: Mobile Volunteer  │   │  WS11: TV Display & Rep.│
└───────────────────────┘   └─────────────────────────┘   └─────────────────────────┘
```

---

### Workstream 1: Architecture, Type Contracts & System Invariants
- **Lead Role**: Principal Software Architect
- **File Ownership**: `docs/*`, `GEMINI.md`, `src/lib/tournament/types.ts`, `src/lib/scheduling/types.ts`
- **Scope**:
  - Maintain data contracts, interfaces, and cross-subsystem boundaries.
  - Review PRs from other workstreams to prevent invariant violations.
- **Verification**: Zero circular dependencies; `npx tsc --noEmit` clean.

---

### Workstream 2: Database Schema & Relational Foundation
- **Lead Role**: Database Engineer
- **File Ownership**: `prisma/schema.prisma`, `prisma/seed.ts`
- **Scope**:
  - Maintain PostgreSQL relational integrity, compound indexes, and foreign key cascades.
  - Provide seed data for realistic 13-team LAN tournament testing.
- **Verification**: `npx prisma generate` succeeds; seed populates 13 teams and 40 PCs cleanly.

---

### Workstream 3: Tournament Bracket & Format Algorithms
- **Lead Role**: Tournament Algorithm Specialist
- **File Ownership**: `src/lib/tournament/bracket.ts`, `src/lib/tournament/round-robin.ts`, `src/lib/tournament/group-stage.ts`
- **Scope**:
  - Single Elimination: Power-of-two sizing, deterministic competitive seeding, BYE allocation on top seeds.
  - Round Robin: Cyclic pairing algorithm (Berger tables) with odd/even team support.
  - Group Stage + Knockout: Round-robin group stage, standings calculation (Points > H2H > Round Diff), and knockout advancement.
- **Verification**: 100% unit test coverage in `tests/unit/bracket-engine.test.ts` across 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 teams.

---

### Workstream 4: Scheduling & Hardware Capacity Engine
- **Lead Role**: Physical Resource & Scheduling Specialist
- **File Ownership**: `src/lib/scheduling/capacity.ts`, `src/lib/scheduling/scheduler.ts`
- **Scope**:
  - Dynamic PC capacity evaluator: $10 \text{ working PCs} = 1 \text{ operational station}$.
  - Re-evaluates station status dynamically when individual PCs are marked `OFFLINE`, `MAINTENANCE`, `TECHNICAL_ISSUE`, or `RESERVED`.
  - Conflict-free fixture generator: Hard constraints (zero station collision, zero team double-booking, predecessor time window compliance) and soft constraints (lab locality, balanced wear).
- **Verification**: Tests in `tests/unit/scheduling-engine.test.ts` verify offline PC capacity recalculation and conflict-free schedules.

---

### Workstream 5: State Machine & Validation Pipeline
- **Lead Role**: Integrity & Rules Engineer
- **File Ownership**: `src/lib/tournament/state-machine.ts`, `src/lib/tournament/validator.ts`
- **Scope**:
  - Explicit finite state machine transitions for Tournament and Match lifecycles.
  - 10-point pre-flight validation pipeline before tournament finalization.
  - Guard conditions blocking unverified match advances or unauthorized unlocks.
- **Verification**: Tests in `tests/unit/state-machine.test.ts` and `tests/unit/validator.test.ts`.

---

### Workstream 6: Backend Service Layer & RESTful APIs
- **Lead Role**: Backend Engineer
- **File Ownership**: `src/services/*`, `src/app/api/tournaments/**`, `src/lib/store/tournament-store.ts`
- **Scope**:
  - Orchestrate mutations across bracket, fixtures, labs, attendance, and incidents.
  - Enforce Zod schema validation on all incoming payloads.
  - Write immutable audit logs for every state transition and score submission.
- **Verification**: API integration tests pass with proper HTTP status codes and structured errors.

---

### Workstream 7: Admin Desktop Operations Center
- **Lead Role**: Frontend Operations Specialist
- **File Ownership**: `src/app/(admin)/admin/**`, `src/components/tournament/**`, `src/components/navigation/**`
- **Scope**:
  - Main Operations Dashboard with high-cadence KPI cards and quick operations.
  - Interactive Bracket Visualizer with seed pairings, BYE badges, and score entry modal.
  - Fixture Timeline Table with round/status filters and station assignment indicators.
  - Pre-finalization validation modal with lock/unlock controls.
- **Verification**: Responsive desktop view, zero hydration warnings, clean component modularity.

---

### Workstream 8: Lab & Hardware Configuration Grid
- **Lead Role**: Hardware UI Specialist
- **File Ownership**: `src/components/venue/lab-pc-grid.tsx`, `src/app/(admin)/admin/venues/**`
- **Scope**:
  - Clickable PC matrix across all labs and stations.
  - One-click failure toggle (`AVAILABLE` $\leftrightarrow$ `OFFLINE`).
  - Real-time station health display (shows "X / 10 PCs Working" and operational status badge).
- **Verification**: Toggling PC status dynamically triggers capacity recalculation and updates active station count.

---

### Workstream 9: Mobile Volunteer Match Marshal Portal
- **Lead Role**: Mobile UX Specialist
- **File Ownership**: `src/app/volunteer/**`
- **Scope**:
  - Mobile-first interface for field marshals standing at player booths.
  - Large $\ge 48\text{px}$ touch targets, minimal navigation, high contrast in dim LAN environments.
  - 1-tap match flow: Call Teams → Mark Ready → Start Match → Technical Pause → Finish Match → Submit Score.
- **Verification**: Verified on mobile viewports ($\le 480\text{px}$ width); zero multi-step admin complexities exposed.

---

### Workstream 10: Attendance & Incident Management
- **Lead Role**: Operations Lead
- **File Ownership**: `src/components/operations/incident-desk.tsx`, `src/components/tournament/team-roster-manager.tsx`, `src/app/(admin)/admin/incidents/**`, `src/app/(admin)/admin/teams/**`
- **Scope**:
  - Team check-in desk with real-time roster verification and incomplete team warnings.
  - Incident desk with ticket creation (Technical, PC, Network, Conduct, Cheating), severity flags, pause logging, and resolution notes.
- **Verification**: Successfully logs technical pauses and resolves incidents with audit trail linkage.

---

### Workstream 11: Public TV Projector Board & Report Exporter
- **Lead Role**: Broadcast & Media Specialist
- **File Ownership**: `src/app/display/**`, `src/services/export.service.ts`
- **Scope**:
  - Read-only, auto-updating (8s interval) full-screen projector scoreboard.
  - Live station activity, upcoming matches queue, and verified results list.
  - CSV/PDF report exporter for post-tournament standings, fixture history, and audit logs.
- **Verification**: Safe auto-polling; zero admin buttons or sensitive player data exposed.

---

### Workstream 12: QA, End-to-End Simulation & Hardening
- **Lead Role**: Lead QA Engineer
- **File Ownership**: `tests/**`, `scripts/simulate-tournament.ts`
- **Scope**:
  - Comprehensive unit test suites for all edge cases (1 to 32 teams, asymmetric labs, broken PCs).
  - Multi-round tournament simulation script exercising 13 teams, 40 PCs, 4 stations, technical pause, score submissions, and Grand Finals crowning.
- **Verification**: `npm test` passes 100%; `npm run simulate` runs error-free; `npm run build` succeeds.
