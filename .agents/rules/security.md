# Security & Access Control Rules — VTO

### Roles & Permission Matrix
1. **SUPER_ADMIN / ORGANIZER**:
   - Create, edit, finalize, unlock tournaments.
   - Configure labs, stations, PCs.
   - Generate, edit, and overwrite fixtures.
   - Issue penalties (warnings, forfeits, disqualifications).
   - View complete audit logs.
2. **RESULT_OFFICIAL**:
   - Verify/reject match results.
   - Correct scores (triggers audit log).
3. **MATCH_MARSHAL / VOLUNTEER**:
   - Call teams, mark ready, start/pause/resume matches.
   - Submit preliminary match results.
   - Report technical and conduct incidents.
   - Check-in teams and players (Registration volunteer role).
   - Read assigned matches only. Cannot finalize tournament or edit fixtures.
4. **DISPLAY (PUBLIC / PROJECTOR)**:
   - Read-only access to `/display/:tournamentId`.
   - Never exposes player private contact details (phone numbers, personal emails).

### Data Protection Rules
- Never expose player phone numbers or contact details on public endpoints or screens.
- All server routes and actions must enforce role-based access control (RBAC).
- Sanitize and escape all user input against XSS.
- Validate all payloads with strict Zod schemas.
- Reject requests with missing or forged session tokens.
