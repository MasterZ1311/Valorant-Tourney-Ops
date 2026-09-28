# VALORANT Tournament Operations System (VTO)
## High-Integrity LAN Tournament Management & Execution Platform

---

### Executive Summary

The **VALORANT Tournament Operations System (VTO)** is an enterprise-grade tournament management and real-time operations platform engineered specifically for competitive LAN esports events. Built to operate in environments such as university computer laboratories, LAN gaming arenas, and esports venues, VTO enforces strict physical resource constraints, deterministic tournament progression, and auditable match lifecycle control.

Unlike generic tournament software, VTO tightly integrates physical venue topology—individual computer labs, ten-PC stations, and machine availability states—with tournament bracket algorithms. This guarantees that matches are scheduled only when fully verified physical hardware is available, prevents team double-booking, and eliminates bracket corruption through multi-step state verification.

---

### Table of Contents

1. [Core Architectural Principles](#1-core-architectural-principles)
2. [System Principles & Non-Negotiable Invariants](#2-system-principles--non-negotiable-invariants)
3. [System Architecture](#3-system-architecture)
4. [Domain Engine Specifications](#4-domain-engine-specifications)
   - [4.1 Single Elimination Bracket Engine](#41-single-elimination-bracket-engine)
   - [4.2 Round Robin Engine (Berger Algorithm)](#42-round-robin-engine-berger-algorithm)
   - [4.3 Group Stage & Knockout Engine](#43-group-stage--knockout-engine)
   - [4.4 Third-Place Decider Engine](#44-third-place-decider-engine)
5. [Physical Resource Model & Dynamic Scheduling](#5-physical-resource-model--dynamic-scheduling)
   - [5.1 Venue Hierarchy](#51-venue-hierarchy)
   - [5.2 Physical Station Integrity Rules](#52-physical-station-integrity-rules)
   - [5.3 Dynamic Match Capacity Algorithm](#53-dynamic-match-capacity-algorithm)
   - [5.4 Hardware-Constrained Fixture Scheduling](#54-hardware-constrained-fixture-scheduling)
6. [State Machine & Match Lifecycle](#6-state-machine--match-lifecycle)
   - [6.1 Tournament State Machine](#61-tournament-state-machine)
   - [6.2 Match Lifecycle State Machine](#62-match-lifecycle-state-machine)
7. [Authentication & Role-Based Access Control (RBAC)](#7-authentication--role-based-access-control-rbac)
8. [Database Architecture & Relational Schema](#8-database-architecture--relational-schema)
9. [Pre-Flight Validation Pipeline (10-Point Readiness Gate)](#9-pre-flight-validation-pipeline-10-point-readiness-gate)
10. [Specialized User Interfaces](#10-specialized-user-interfaces)
11. [Incident Management & Operational Runbook](#11-incident-management--operational-runbook)
12. [REST API & Server Actions Reference](#12-rest-api--server-actions-reference)
13. [Installation, Setup, & Simulation Guide](#13-installation-setup--simulation-guide)
14. [Testing & Quality Assurance](#14-testing--quality-assurance)

---

### 1. Core Architectural Principles

VTO is architected according to strict Clean Architecture and Domain-Driven Design (DDD) principles:

- **Strict Separation of Concerns**:
  - **Domain / Engine Layer** (`src/lib/tournament/`, `src/lib/scheduling/`): Pure TypeScript mathematical and scheduling algorithms. Completely stateless, deterministic, unit-tested, and containing zero dependencies on databases, HTTP primitives, or UI components.
  - **Service Layer** (`src/services/`): Business orchestration, relational database queries via Prisma ORM, distributed database transactions, state transition enforcement, and immutable audit logging.
  - **API / Action Layer** (`src/app/api/`, `src/actions/`): HTTP request routing, session validation, payload schema validation via Zod, and HTTP status code translation.
  - **UI / Presentation Layer** (`src/components/`, `src/app/`): React Server Components and Client Components optimized for high-contrast visibility and low-latency interaction. Presentation components never execute tournament calculation logic directly.
- **Deterministic and Reversible Operations**:
  - Bracket generation, seed seeding, and fixture generation produce deterministic outputs given identical inputs.
  - Irreversible actions (tournament bracket unlocking, team disqualifications, fixture regenerations) require explicit administrative authorization and write immutable audit records before execution.
- **Defense-in-Depth Authorization**:
  - Permissions are strictly validated on the server for every API route and Server Action. Client-side routing guards serve solely as visual convenience.

---

### 2. System Principles & Non-Negotiable Invariants

In accordance with system specifications defined in `GEMINI.md`, the platform enforces the following operational invariants:

1. **Physical Resource Integrity**:
   - Exactly two teams and ten verified active players (five players per team) are required to initiate an official VALORANT match.
   - Each match requires one station equipped with exactly ten operational, `AVAILABLE` PCs.
   - Machines marked as `OFFLINE`, `MAINTENANCE`, `TECHNICAL_ISSUE`, or `RESERVED` can never be assigned to an active match.
   - Effective venue match capacity is strictly calculated as:
     $$\text{Capacity}_{\text{venue}} = \sum_{l \in \text{Labs}} \min\left(\left\lfloor \frac{\text{PCs}_{\text{available}}(l)}{10} \right\rfloor, \text{Stations}_{\text{configured}}(l)\right)$$
2. **Scheduling Conflict Elimination**:
   - A team cannot be scheduled to compete in multiple matches concurrently.
   - A station cannot host overlapping matches.
   - Dependent matches cannot be scheduled to start before all predecessor matches have reached `VERIFIED` status.
   - Standard turnaround buffers (minimum 10 minutes) must be preserved between consecutive matches on the same station.
3. **Bracket Integrity & Score Verification**:
   - Matches transition from `FINISHED` to `RESULT_PENDING`. Bracket progression is blocked until a `RESULTS_OFFICIAL` or `TOURNAMENT_ADMIN` marks the match as `VERIFIED`.
   - Score updates cannot bypass official verification.
4. **Data Immutability & Auditability**:
   - Destructive deletions of historical matches, fixtures, or teams are strictly prohibited during active tournaments. Entities are marked via status flags (`DISQUALIFIED`, `CANCELLED`).
   - Every mutation generates a timestamped entry in the `AuditLog` table containing actor ID, role, action, target entity, and before/after payloads.

---

### 3. System Architecture

```mermaid
graph TD
    subgraph UI Presentation Layer
        AdminUI[Admin Control Center: /admin]
        VolunteerUI[Mobile Match Marshal: /volunteer]
        DisplayUI[Projector Scoreboard: /display/:id]
    end

    subgraph API and Action Layer
        APIRoutes[Next.js API Route Handlers: /api/*]
        ServerActions[Next.js Server Actions: src/actions/*]
        AuthGuard[Session & RBAC Middleware]
    end

    subgraph Service and Orchestration Layer
        TournamentService[Tournament Service]
        SchedulingService[Scheduling & Venue Service]
        MatchService[Match Operations Service]
        IncidentService[Incident & Penalty Service]
        AuditService[Audit Log Service]
    end

    subgraph Pure Domain Engines
        BracketEngine[Tournament Engine: Single Elim, Round Robin, Groups]
        CapacityEngine[Resource Engine: Lab/PC Capacity Matrix]
        StateMachine[State Engine: Match & Tournament Guards]
        ValidatorPipeline[Pre-Flight 10-Point Readiness Validator]
    end

    subgraph Persistence Layer
        Prisma[Prisma ORM Client]
        PostgreSQL[(PostgreSQL Database)]
    end

    AdminUI --> AuthGuard
    VolunteerUI --> AuthGuard
    DisplayUI --> APIRoutes

    AuthGuard --> APIRoutes
    AuthGuard --> ServerActions

    APIRoutes --> TournamentService
    APIRoutes --> SchedulingService
    APIRoutes --> MatchService
    APIRoutes --> IncidentService
    APIRoutes --> AuditService

    ServerActions --> TournamentService
    ServerActions --> SchedulingService
    ServerActions --> MatchService

    TournamentService --> BracketEngine
    TournamentService --> StateMachine
    TournamentService --> ValidatorPipeline
    SchedulingService --> CapacityEngine

    TournamentService --> Prisma
    SchedulingService --> Prisma
    MatchService --> Prisma
    IncidentService --> Prisma
    AuditService --> Prisma

    Prisma --> PostgreSQL
```

---

### 4. Domain Engine Specifications

#### 4.1 Single Elimination Bracket Engine
Located in `src/lib/tournament/bracket.ts`, the engine manages knockout tournament brackets of any size $N \ge 2$ (e.g., 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32).

- **Bracket Sizing**: Calculated as the nearest power of two greater than or equal to team count $N$:
  $$B = 2^{\lceil \log_2 N \rceil}$$
- **Round Count**:
  $$R = \log_2 B$$
- **Automatic BYE Calculation**:
  $$Y = B - N$$
- **Seeding Algorithm**: Standard competitive seeding ensures top seeds face lowest seeds and cannot meet until later rounds:
  - Match 1: Seed 1 vs Seed $B$
  - Match 2: Seed $B/2$ vs Seed $(B/2) + 1$
- **BYE Allocation**: BYEs are allocated strictly to the top $Y$ seeds (Seed 1, Seed 2, ..., Seed $Y$). Matches containing a BYE are marked `isBye = true` and auto-advance the seeded team to Round 2 immediately.
- **DAG Match Dependencies**: Matches in Round $k$ reference successor matches in Round $k+1$ via `targetMatchId` and `targetSlot` (`TEAM_A` or `TEAM_B`).

#### 4.2 Round Robin Engine (Berger Algorithm)
Located in `src/lib/tournament/round-robin.ts`, the engine generates balanced round-robin schedules using the cyclic Berger pairing method.
- **Total Rounds**: $N - 1$ for even $N$; $N$ for odd $N$ (paired against a dummy BYE team).
- **Total Matches**:
  $$M = \frac{N(N - 1)}{2}$$
- **Home/Away Balancing**: Cycles team orientation across rounds to balance Attacker and Defender map advantages.
- **Tiebreaker Hierarchy**:
  1. Total Match Points (3 for regulation win, 1 for overtime win, 0 for loss).
  2. Head-to-Head match outcome between tied teams.
  3. Map/Round Differential ($\Delta = \text{Rounds Won} - \text{Rounds Lost}$).
  4. Total Rounds Won.
  5. Sudden-death tiebreaker match.

#### 4.3 Group Stage & Knockout Engine
Located in `src/lib/tournament/group-stage.ts`, supports multi-group round-robin configurations advancing top qualifiers into a single-elimination playoff bracket (e.g., top 2 per group).

#### 4.4 Third-Place Decider Engine
Integrated into single-elimination tournament structures to resolve bronze medalists between the two semifinal losing teams.

---

### 5. Physical Resource Model & Dynamic Scheduling

#### 5.1 Venue Hierarchy
```
Venue
 └── Lab (Computer Laboratory / Room)
      └── Station (Dedicated Match Area)
           └── PC (Individual Client Machine, 10 per Station)
```

#### 5.2 Physical Station Integrity Rules
- A Station is a logical and physical grouping of exactly 10 PCs divided into Team A (PCs 1–5) and Team B (PCs 6–10).
- Station Operational Status:
  - `OPERATIONAL`: Exactly 10 PCs are verified as `AVAILABLE`.
  - `DEGRADED`: Station has fewer than 10 `AVAILABLE` PCs. Cannot host active matches.
  - `INACTIVE`: Manually taken offline or reserved for administrative staging.

#### 5.3 Dynamic Match Capacity Algorithm
Located in `src/lib/scheduling/capacity.ts`, capacity recalculates automatically upon any machine status transition:

```typescript
export function calculateLabCapacity(lab: LabWithPCs): LabCapacityReport {
  const availablePCs = lab.pcs.filter((pc) => pc.status === "AVAILABLE").length;
  const theoreticalCapacity = Math.floor(availablePCs / 10);
  const operationalStations = lab.stations.filter(
    (station) => station.status === "OPERATIONAL" && station.pcs.length >= 10
  ).length;

  const effectiveCapacity = Math.min(theoreticalCapacity, operationalStations);

  return {
    labId: lab.id,
    totalPCs: lab.pcs.length,
    availablePCs,
    configuredStations: lab.stations.length,
    operationalStations,
    simultaneousMatchCapacity: effectiveCapacity,
  };
}
```

#### 5.4 Hardware-Constrained Fixture Scheduling
Located in `src/lib/scheduling/scheduler.ts`, the scheduling engine computes time slot assignments based on:
1. **Match Durations & Buffers**: Base match duration (e.g., 60 minutes) plus mandatory station turnover buffer (e.g., 15 minutes).
2. **Station Contention**: Stations cannot be double-booked across overlapping intervals.
3. **Team Rest Intervals**: Minimum mandatory rest time between consecutive matches for advancing teams.
4. **Predecessor Resolution**: Knockout round matches are assigned time slots strictly after predecessor round completion windows.

---

### 6. State Machine & Match Lifecycle

#### 6.1 Tournament State Machine
Defined in `src/lib/tournament/state-machine.ts`:

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Tournament Created
    DRAFT --> READY: Rosters & Labs Configured
    READY --> DRAFT: Modifications Required
    READY --> FINALIZED: Pre-Flight Pipeline Passed
    FINALIZED --> LIVE: First Match Called
    FINALIZED --> READY: Admin Emergency Unlock (Audit Required)
    LIVE --> COMPLETED: Grand Finals Verified
    COMPLETED --> ARCHIVED: Operations Concluded
```

| From State | Allowed To State | Required Authority | Preconditions / Guards |
|---|---|---|---|
| `DRAFT` | `READY` | `TOURNAMENT_ADMIN` | Minimum 2 teams with 5 active players each. |
| `READY` | `FINALIZED` | `TOURNAMENT_ADMIN` | All 10 pre-flight validation checks pass. |
| `FINALIZED` | `LIVE` | `COORDINATOR` | At least one fixture started. |
| `FINALIZED` | `READY` | `SUPER_ADMIN` | Mandatory audit reason. Resets active fixtures. |
| `LIVE` | `COMPLETED` | `TOURNAMENT_ADMIN` | All bracket matches verified. |

#### 6.2 Match Lifecycle State Machine

```mermaid
stateDiagram-v2
    [*] --> SCHEDULED: Fixture Generated
    SCHEDULED --> CALLED: Teams Summoned to Lab
    CALLED --> READY: Both Rosters Present & Seated
    READY --> LOBBY_READY: Custom Game Lobby Joined
    LOBBY_READY --> LIVE: Map Play Initiated
    LIVE --> PAUSED: Technical or Tactical Pause
    PAUSED --> LIVE: Issue Resolved, Match Resumed
    LIVE --> FINISHED: Win Condition Reached (13 Rounds)
    FINISHED --> RESULT_PENDING: Volunteer Submits Score
    RESULT_PENDING --> VERIFIED: Official Validates Screenshots/Logs
    VERIFIED --> [*]: Winner Advanced in Bracket
```

- **Emergency Forfeits**: Matches can transition from `SCHEDULED`, `CALLED`, or `READY` directly to `FORFEIT` upon team no-show or disqualification.
- **Advancement Guard**: Only transitions into `VERIFIED` trigger winner advancement in the tournament bracket.

---

### 7. Authentication & Role-Based Access Control (RBAC)

VTO enforces a 6-tier hierarchical RBAC matrix defined in `src/lib/auth/roles.ts`. Every server action and API route validates the requesting session against this matrix:

| Operation | SUPER_ADMIN | TOURNAMENT_ADMIN | COORDINATOR | VOLUNTEER | RESULTS_OFFICIAL | VIEWER |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| System Configuration & Global Audit | Yes | No | No | No | No | No |
| Unlock Finalized Tournament | Yes | No | No | No | No | No |
| Create / Edit Tournament & Venues | Yes | Yes | No | No | No | No |
| Finalize Tournament & Lock Bracket | Yes | Yes | No | No | No | No |
| Disqualify Team / Overwrite Results | Yes | Yes | No | No | No | No |
| Call Match & Assign Station | Yes | Yes | Yes | No | No | No |
| Check-in Teams & Log Attendance | Yes | Yes | Yes | Yes | No | No |
| Trigger Technical Pause | Yes | Yes | Yes | Yes | No | No |
| Submit Match Score | Yes | Yes | Yes | Yes | No | No |
| Verify Match Score & Advance Bracket| Yes | Yes | No | No | Yes | No |
| View Public Bracket & Standings | Yes | Yes | Yes | Yes | Yes | Yes |

---

### 8. Database Architecture & Relational Schema

Implemented in `prisma/schema.prisma` using PostgreSQL:

```mermaid
erDiagram
    Tournament ||--o{ Team : hosts
    Tournament ||--o{ Lab : contains
    Tournament ||--o{ Match : schedules
    Tournament ||--o{ AuditLog : records
    Tournament ||--o{ Incident : logs

    Team ||--o{ Player : contains
    Team ||--o{ AttendanceRecord : checks_in

    Lab ||--o{ Station : partitions
    Station ||--o{ PC : contains
    Station ||--o{ Match : hosts

    Match ||--o{ Incident : triggers
    Match ||--o{ GameResult : records
```

#### Core Entities & Critical Schema Constraints
- **`Tournament`**: Manages tournament metadata, game format, state (`TournamentStatus`), and operational rules.
- **`Team` & `Player`**: Enforces complete 5-player rosters. Compound unique index `[tournamentId, name]` prevents duplicate team names within the same event.
- **`Lab`, `Station`, `PC`**: Models physical venue hardware. Compound unique index `[stationId, stationPosition]` ensures unambiguous machine seating (e.g., Team A PC 1 through 5, Team B PC 1 through 5).
- **`Match`**: Tracks bracket node, rounds, status (`MatchStatus`), assigned station, scheduled start/end times, and scores.
- **`Incident`**: Captures technical pauses, hardware malfunctions, rule infractions, and penalties with resolution audit status.
- **`AuditLog`**: Append-only log recording actor, IP address, action type, entity ID, and full JSON state diff.

---

### 9. Pre-Flight Validation Pipeline (10-Point Readiness Gate)

Implemented in `src/lib/tournament/validator.ts`, a tournament cannot transition to `FINALIZED` status until all 10 validation gates pass with zero blocking errors:

1. **Minimum Team Threshold**: Tournament contains at least 2 registered teams.
2. **Roster Completeness**: Every registered team possesses exactly 5 active players.
3. **Attendance Verification**: All participating teams are marked as checked-in at the registration desk.
4. **Venue Lab Configuration**: At least one computer lab is linked and configured.
5. **Station Operational Readiness**: Venue contains sufficient operational stations ($\ge 10$ working PCs each) to support scheduled simultaneous matches.
6. **Hardware Safety Margin**: No stations with degraded or offline PCs are allocated to the schedule.
7. **Bracket Structural Integrity**: All bracket nodes, match dependencies, and BYE placements form a valid Directed Acyclic Graph (DAG).
8. **Fixture Time Allocation**: All matches possess valid time slots and assigned stations.
9. **Staffing Allocation**: Sufficient qualified match marshals / volunteers are assigned to active stations.
10. **Conflict-Free Schedule**: Zero overlaps detected across team schedules, stations, and predecessor match windows.

---

### 10. Specialized User Interfaces

VTO provides three purpose-built interfaces tailored to operational roles:

1. **Admin Desktop Control Center (`/admin`)**:
   - Multi-column widescreen operations desk.
   - Interactive live bracket view with real-time match status indicators.
   - Station and PC status grid displaying temperature, machine health, and match assignment.
   - Live incident response desk and emergency tournament unlock controls.
2. **Mobile Match Marshal Portal (`/volunteer`)**:
   - Mobile-first web application designed for field marshals walking computer labs.
   - Large, high-contrast touch controls ($\ge 48\text{px}$) engineered for low-light LAN environments.
   - 1-tap match transitions: Summon Teams, Verify Seating, Lobby Ready, Technical Pause, Submit Score.
3. **Arena Projector Display (`/display/:tournamentId`)**:
   - Read-only, auto-refreshing public scoreboard.
   - High-contrast typography displaying active matches, scores, current stations, and completed bracket outcomes. Zero operational controls exposed.

---

### 11. Incident Management & Operational Runbook

When technical faults or rule infractions occur during live LAN operations, operators follow standardized workflows:

#### Hardware / Peripheral Malfunction
1. Match Marshal triggers **Technical Pause** via `/volunteer` or `/admin` (Match transitions to `PAUSED`).
2. An **Incident** is logged with category `HARDWARE` and machine ID (e.g., `PC-14`).
3. If repairable within 5 minutes, hardware is swapped and match resumes.
4. If unrepairable, match is re-routed to an available reserve station via the Admin Station Reassignment tool.
5. Match transitions to `LIVE` and audit log captures total pause duration.

#### Team Tardiness / No-Show
1. Match transitions to `CALLED`. Official 10-minute forfeit countdown timer initiates.
2. If team fails to arrive within the grace period, Coordinator issues a forfeit.
3. Match transitions to `FORFEIT`. Opponent is marked winner with a score of 13–0.
4. Winner advances in bracket; station is released to buffer pool.

---

### 12. REST API & Server Actions Reference

#### Key Endpoints
- `GET /api/tournaments/:id`: Fetches complete tournament details, brackets, and team standings.
- `POST /api/tournaments/:id/finalize`: Executes the 10-point pre-flight validation pipeline and locks tournament.
- `POST /api/tournaments/:id/matches/:matchId/transition`: Executes match state machine transition (`CALLED`, `LIVE`, `PAUSED`, `FINISHED`).
- `POST /api/tournaments/:id/matches/:matchId/verify`: Requires `RESULTS_OFFICIAL` role; verifies score and advances bracket.
- `GET /api/tournaments/:id/venues/capacity`: Returns real-time PC availability, station statuses, and simultaneous match capacity.
- `POST /api/tournaments/:id/incidents`: Logs technical or behavioral incidents and attaches to match record.

---

### 13. Installation, Setup, & Simulation Guide

#### Prerequisites
- Node.js 18.18.0 or higher
- PostgreSQL 14 or higher
- npm 9.0.0 or higher

#### Step 1: Clone Repository & Install Dependencies
```bash
git clone https://github.com/MasterZ1311/Valorant-Tourney-Ops.git
cd Valorant-Tourney-Ops
npm install
```

#### Step 2: Configure Environment Variables
Create a `.env` file in the project root:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/vto_db?schema=public"
NEXTAUTH_SECRET="your-secure-random-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

#### Step 3: Initialize Database & Run Migrations
```bash
npx prisma generate
npx prisma db push
```

#### Step 4: Execute Full Tournament Lifecycle Simulation
The repository includes an end-to-end simulation script verifying all engine calculations, hardware constraints, incidents, and bracket advancement for 13 teams across 40 PCs:
```bash
npm run simulate
```

#### Step 5: Launch Development Server
```bash
npm run dev
```
Navigate to `http://localhost:3000` to access the application.

---

### 14. Testing & Quality Assurance

VTO maintains a strict testing regime to guarantee absolute reliability during live operations:

- **Type Safety**:
  ```bash
  npx tsc --noEmit
  ```
  Enforces zero TypeScript compiler errors across all files.

- **Unit & Integration Test Suite**:
  ```bash
  npm test
  ```
  Executes the automated test suite (15 test suites, 262 passed tests):
  - Bracket generation across asymmetric team counts (1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32).
  - Round Robin cyclic pairings and tiebreaker calculations.
  - Dynamic lab capacity and degraded station calculations.
  - State machine transition guards and unauthorized bypass attempts.
  - Fixture conflict detection algorithms.

- **Production Build Verification**:
  ```bash
  npm run build
  ```
  Validates Next.js compilation, bundle generation, and static page generation.

---

### License

Distributed under the MIT License. See `LICENSE` for further details.
