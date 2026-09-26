# Original User Request

## 2026-09-25T23:29:52Z

VTO is a production-quality LAN tournament operations platform designed for organizers running VALORANT esports tournaments in colleges, computer labs, and gaming cafes.

Working directory: e:/Github/Valorant Brackets
Integrity mode: development

Please execute and operate on each of the following 8 numbered tasks systematically:

1. Implement the VTO database architecture from the approved documentation:
   - Focus on: Prisma schema, migrations, indexes, constraints, seed data, database utilities.
   - Comprehensive database tests verifying relational integrity, compound uniqueness, and soft deletion.
   - Seed a development tournament: 13 teams, 5 players each, 40 PCs (Lab 1 = 30 PCs / 3 stations, Lab 2 = 10 PCs / 1 station).
   - Run typecheck, lint, and tests.

2. Implement the tournament domain engine:
   - Formats: Single Elimination, Round Robin, Group Stage + Knockout.
   - BYEs, rounds, match dependencies, winner advancement, result verification, state transitions.
   - Keep tournament logic strictly independent from React UI.
   - Exhaustive unit tests: 1, 2, 3, 5, 7, 8, 9, 13, 15, 16, 17, 32 teams and invalid state transitions.

3. Implement the physical tournament scheduling engine:
   - Labs, stations, PCs, resource capacity, unavailable PCs, match duration, buffers, time slots, team conflicts, station conflicts, PC conflicts, bracket dependencies.
   - Tests for 13 teams, 40 PCs (Lab 1 = 30 PCs / 3 stations, Lab 2 = 10 PCs / 1 station, expected capacity = 4 simultaneous matches).
   - Test unavailable PCs and reduced capacity. Never allow invalid schedules.

4. Build the admin dashboard and tournament setup experience:
   - Dashboard KPI metrics, tournament creation wizard, team & player management, lab management, PC management, fixture management, bracket visualization.
   - Use existing domain services; zero tournament logic duplicated inside React components.
   - Responsive, clean operations-focused UI. Test main workflows.

5. Build the tournament-day operational interface:
   - Attendance desk, check-in, match control, match state transitions, result entry, result verification, technical issues, incidents, volunteer assignments, announcements.
   - Mobile-first volunteer UI with >= 48px touch targets.
   - Test: team check-in, match call, start, pause, resume, finish, result, verification, incident.

6. Audit and implement authentication and authorization for VTO:
   - Roles: SUPER_ADMIN, TOURNAMENT_ADMIN, COORDINATOR, VOLUNTEER, RESULTS_OFFICIAL, VIEWER.
   - Server-side permission checks, route protection, API protection, audit logging, secure session handling, input validation.
   - Test accessing protected operations as each role with security tests.

7. Act as an independent QA engineer:
   - Inspect the entire VTO application.
   - Create and run unit tests, integration tests, API tests, Playwright tests, tournament simulation, edge-case tests.
   - Pay special attention to: brackets, BYEs, scheduling, PC allocation, simultaneous matches, result advancement, permissions, attendance, finalization.
   - Report every defect with severity, location, reproduction, expected vs actual behavior, and fix high-confidence defects.

8. End-to-end simulation & production hardening:
   - Verify scripts/simulate-tournament.ts runs cleanly from 13 teams to champion.
   - Ensure npx tsc --noEmit, npm test, and npm run build all succeed with 0 errors.
