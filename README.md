# VTO — VALORANT Tournament Operations System

A tournament-management and tournament-day operations platform specifically designed for organizers running LAN VALORANT esports tournaments in colleges, computer labs, and gaming cafes.

---

## 🌟 Key Features
- **Deterministic Bracket Engine**: Handles arbitrary team counts (3, 5, 8, 13, 16, 32), power-of-two expansion, seeded pairings, automatic BYEs, and verified advancement.
- **Physical Resource Aware Scheduler**: Understands Labs, Stations, and PC hardware constraints. Automatically recalculates simultaneous match capacity if PCs go offline.
- **Strict Invariant Enforcement**: Zero double-booking of teams or stations; zero unverified bracket advances; no phantom schedules.
- **Multi-Role User Interfaces**:
  - **Admin Control Center (`/admin`)**: Complete management dashboard for directors and leads.
  - **Mobile Match Marshal (`/volunteer`)**: Touch-optimized 48px+ interface for field volunteers.
  - **Public Display (`/display/:id`)**: Projector-ready live scoreboard and tournament bracket.
- **Pre-Flight Validation Pipeline**: 10-point health check before tournament locking.
- **Incident & Penalty Tracking**: Log technical pauses, hardware failures, player conduct, and forfeits with audit logs.
- **Full Audit Trail**: Every sensitive action (scores, unlocks, DQs, venue edits) is immutably logged with actor, before/after diffs, and timestamp.

---

## 🚀 Tech Stack
- **Frontend**: Next.js 14+ (App Router), React 18/19, TypeScript, Tailwind CSS, Lucide icons, shadcn/ui
- **Backend**: Next.js Server Actions & API Route Handlers
- **Database & ORM**: PostgreSQL via Prisma ORM
- **Domain Engines**: Pure TypeScript algorithms (zero DB/UI coupling)
- **Validation**: Zod schema validation
- **Testing**: Vitest unit & integration tests, E2E simulation script

---

## 📁 Repository Structure
```
├── docs/                 # Complete architectural & operational documentation
│   ├── ARCHITECTURE.md   # System diagram, layers, and service boundaries
│   ├── DATABASE.md       # Schema, ERD, models, indexes, and constraints
│   ├── TOURNAMENT_ENGINE.md # Bracket formats, BYEs, and advancement math
│   ├── SCHEDULING.md     # Lab/Station/PC capacity and conflict detection
│   ├── BRACKET.md        # Mathematical model of single elimination & seeds
│   ├── OPERATIONS.md     # Tournament day runbook & incident response
│   ├── DEPLOYMENT.md     # On-premise LAN setup and production configuration
│   ├── TESTING.md        # Test suite strategy and test plan
│   └── USER_GUIDE.md     # Operator manual for tournament directors & volunteers
├── GEMINI.md             # Core product principles, rules, and invariants
├── .agents/rules/        # Subsystem-specific rules (frontend, backend, db, engine, etc.)
├── prisma/               # Prisma schema & seed scripts
├── src/                  # Source code (domain engines, services, UI components, pages)
├── tests/                # Automated tests (unit, integration)
└── scripts/              # Tournament simulation and verification scripts
```

---

## ⚡ Quick Start
```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env

# 3. Initialize Database
npx prisma generate
npx prisma db push

# 4. Run Tests & Simulation
npm test
npx tsx scripts/simulate-tournament.ts

# 5. Start Development Server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.
