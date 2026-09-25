# Scheduling & Physical Resource Engine — VTO

## 1. Physical Model Principles
In competitive VALORANT, a match cannot take place without real, functional hardware:
- **1 Team** = 5 Starting Players.
- **1 Match** = 2 Teams = 10 Players.
- **1 Station** = A physical cluster of at least 10 working, connected PCs.
- **1 Match Requires** = 1 Station with 10 PCs with status `AVAILABLE` or `ASSIGNED`.

---

## 2. Dynamic Capacity Formula
Never assume total PCs divided by 10 is the usable capacity. Capacity is constrained by both station grouping and PC individual operational status.

For each Lab \(L\):
\[
\text{Working PCs}_L = \sum_{p \in \text{PCs}_L} [status(p) \in \{\text{AVAILABLE}, \text{ASSIGNED}, \text{IN\_USE}\}]
\]

For each Station \(S\) in Lab \(L\):
\[
\text{Is Operational}(S) = (\text{Count of functional PCs assigned to } S \ge 10)
\]

Total simultaneous match capacity across venue:
\[
\text{Max Simultaneous Matches} = \sum_{S \in \text{Stations}} \text{Is Operational}(S)
\]

### Example Scenario
- **Lab 1**: 30 total PCs, 3 stations configured (Station 1: PCs 1–10, Station 2: PCs 11–20, Station 3: PCs 21–30).
  - If PC 7 has `status: OFFLINE`: Station 1 now has only 9 operational PCs.
  - Station 1 is rendered **non-operational**.
  - Operational stations in Lab 1 = 2 (Station 2 and Station 3).
- **Lab 2**: 10 total PCs, 1 station (Station 4: PCs 31–40). All operational = 1 station.
- **Effective Venue Capacity**: 2 + 1 = 3 simultaneous matches (NOT 4).

---

## 3. Fixture Generation Algorithm
The scheduling engine produces a chronological schedule of matches mapped to time slots and stations.

### Inputs
1. List of matches grouped by rounds (with dependency DAG).
2. Tournament start time (e.g. `2026-10-15T09:00:00Z`).
3. Match duration (default: 45 minutes).
4. Buffer duration (default: 15 minutes).
5. Operational stations across all active labs.

### Hard Constraints
1. **Station Exclusivity**: A station cannot host more than one match during any overlapping time interval \([t_{\text{start}}, t_{\text{end}}]\).
2. **Team Exclusivity**: A team cannot participate in more than one match during any overlapping time interval.
3. **Predecessor Invariant**: For any match \(M\) depending on match \(P\):
   \[
   t_{\text{start}}(M) \ge t_{\text{end}}(P) + \text{bufferDuration}
   \]
4. **Hardware Validation**: Only stations with \(\ge 10\) working PCs can be assigned.

### Soft Constraints (Heuristics)
1. **Lab Locality**: Keep a team in the same lab if they play back-to-back rounds to minimize physical equipment migration.
2. **Balanced Station Wear**: Distribute matches evenly across stations.
3. **Minimize Idle Delays**: Schedule matches as early as permissible under predecessor dependencies.
