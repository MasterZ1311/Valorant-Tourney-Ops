# Backend Engineering Rules — VTO

### Architecture & Service Boundaries
- Place business operations in `src/services/` (e.g., `tournament.service.ts`, `match.service.ts`, `scheduling.service.ts`, `audit.service.ts`).
- Server actions (`src/actions/`) and API routes (`src/app/api/`) are strictly thin wrappers:
  1. Authenticate user session.
  2. Authorize user role against action requirements.
  3. Validate input payload using Zod.
  4. Call corresponding domain service method.
  5. Commit transaction and log audit entry.
  6. Return standardized `{ success: true, data }` or `{ success: false, error: { message, code, details } }`.

### State Mutation & Transactions
- Every operation modifying multi-record dependencies (e.g. advancing bracket winner, forfeiting match, rescheduling fixture, recalculating lab stations) MUST run inside `prisma.$transaction`.
- Never execute state transitions without verifying current state against the valid transition matrix.
- Ensure concurrency safety: when updating match score or status, verify version/status match to prevent race conditions during rapid volunteer submissions.

### Audit Logging
- Call `auditService.log({...})` on every administrative or match state change.
- Audit records must capture:
  - `actorId` / `actorRole`
  - `action` (e.g., `MATCH_STATUS_CHANGE`, `RESULT_VERIFIED`, `BRACKET_ADVANCED`, `PENALTY_ISSUED`)
  - `entity` & `entityId`
  - `beforeState` (serialized JSON)
  - `afterState` (serialized JSON)
  - `ipAddress` and `timestamp`
