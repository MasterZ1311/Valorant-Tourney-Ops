# Bracket Architecture & Mathematics — VTO

## 1. Single Elimination Mathematical Model

### Power of Two Sizing
For any participant count \(N\):
\[
\text{Bracket Size } B = 2^{\lceil \log_2 N \rceil}
\]
\[
\text{Total Rounds } R = \log_2 B
\]
\[
\text{Total BYEs } Y = B - N
\]
\[
\text{Round 1 Matches Played } M_1 = N - \frac{B}{2}
\]
\[
\text{Teams Advancing with BYE } = Y
\]

### Seed Pairing Algorithm
Standard tournament bracket placement recursively pairs Seed \(s\) with Seed \((2^k + 1 - s)\):
- Bracket size 4: `[1 vs 4], [2 vs 3]`
- Bracket size 8: `[1 vs 8], [4 vs 5], [2 vs 7], [3 vs 6]`
- Bracket size 16:
  - Upper Half: `[1 vs 16], [8 vs 9], [4 vs 13], [5 vs 12]`
  - Lower Half: `[2 vs 15], [7 vs 10], [3 vs 14], [6 vs 11]`

### BYE Allocation Rule
- BYEs are always placed against the top seeds.
- Seed 1 receives the first BYE (Match 1 opponent is `BYE`).
- Seed 2 receives the second BYE, Seed 3 receives the third, etc.
- When an opponent is `BYE`, the seeded team is marked `AUTOMATIC_BYE_ADVANCE` and populated immediately into the corresponding Round 2 match slot.

---

## 2. Tree Representation & DAG
The bracket is modeled as a Directed Acyclic Graph (DAG) of match nodes:
```
R1: M01 (Seed 1 vs BYE) ----\
                             ---> R2: M09 (Seed 1 vs Winner M02) ---\
R1: M02 (Seed 8 vs Seed 9) -/                                       \
                                                                     ---> Semifinal M13
R1: M03 (Seed 4 vs Seed 13) --\                                     /
                               ---> R2: M10 (Winner M03 vs Winner M04)
R1: M04 (Seed 5 vs Seed 12) -/
```

Every node contains:
- `matchId`
- `roundNumber`
- `slotA` & `slotB`
- `sourceMatchAId` & `sourceMatchBId`
- `targetMatchId`
- `targetSlot` (`TEAM_A` or `TEAM_B`)
