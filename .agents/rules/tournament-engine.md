# Tournament Engine Rules — VTO

### Pure Domain Logic
- All bracket generation, BYE assignment, seeder logic, and schedule conflict resolution must live in pure functions in `src/lib/tournament/` and `src/lib/scheduling/`.
- No Prisma or database imports inside these pure domain files. They accept plain data interfaces and return structured calculation results or validation errors.

### Bracket Generation Rules
1. **Single Elimination**:
   - Power of 2 sizing: Next power of 2 \(\ge N\) teams.
   - BYE calculation: `bracketSize - N`.
   - Seeded placement: Standard bracket seeding (1 vs 16, 8 vs 9, 4 vs 13, 5 vs 12, etc.) ensuring top seeds don't meet until later rounds.
   - BYE distribution: Higher seeds receive the BYEs and automatically advance to Round 2 without a match played.
2. **Round Robin**:
   - Berger tables / cyclic pairing algorithm.
   - Odd number of teams: Add a dummy "BYE" team per round.
3. **Group Stage + Knockout**:
   - Group seeding (snake or random pot), round-robin fixtures within groups, points/tiebreaker resolution (Points > Head-to-Head > Round Diff), top N advance to Single Elimination knockout bracket.

### Scheduling Invariants
- Each VALORANT match consumes:
  - 1 Station.
  - 10 working PCs.
  - Time window: `matchDurationMinutes + bufferMinutes`.
- Hard constraints enforced before schedule acceptance:
  1. Team overlap: Team cannot play two matches with overlapping time slots.
  2. Station overlap: Station cannot host two matches with overlapping time slots.
  3. Predecessor dependency: A match in round \(R\) cannot begin before the matches in round \(R-1\) producing its teams have completed.
  4. Station health: Station must have 10 working PCs with status `AVAILABLE` or `ASSIGNED`. Any station with \(< 10\) working PCs cannot be scheduled.
