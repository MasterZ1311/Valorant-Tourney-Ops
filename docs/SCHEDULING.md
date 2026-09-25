# Scheduling & Physical Resource Engine — VTO

## 1. Physical Hardware Modeling
VALORANT requires dedicated, connected hardware. Unlike virtual or online tournaments, physical LAN events depend on PC reliability, cabling, and station ergonomics:
- **1 Team** = 5 Starting Players.
- **1 Match** = 2 Teams = 10 Players.
- **1 Station** = Physical bank of at least 10 working PCs.
- **Operational Condition**: A station is only operational if count of working PCs \(\ge 10\).

---

## 2. Dynamic Capacity Recalculation Formula

For each Lab \(L\):
\[
\text{Working PCs}_L = \sum_{p \in \text{PCs}_L} [status(p) \in \{\text{AVAILABLE}, \text{ASSIGNED}, \text{IN\_USE}\}]
\]

For each Station \(S\) in Lab \(L\):
\[
\text{Operational}(S) = (\text{Count of functional PCs assigned to } S \ge 10)
\]

Venue Simultaneous Match Capacity:
\[
\text{Simultaneous Match Slots} = \sum_{S \in \text{Stations}} \text{Operational}(S)
\]

### Asymmetric Failure Handling
If Lab 1 has 3 stations (PCs 1–10, 11–20, 21–30) and PC 5 suffers an unrecoverable GPU failure:
- Station 1 now has 9 working PCs \(\to\) Station 1 status becomes **NON-OPERATIONAL**.
- Stations 2 and 3 remain operational (10 PCs each).
- Effective Lab 1 capacity immediately drops from 3 to 2 simultaneous matches.
- The scheduler automatically reassigns pending fixtures away from Station 1 to available operational stations.

---

## 3. Fixture Scheduling Algorithm

### Hard Constraints (Zero-Tolerance Violations)
1. **Station Exclusivity**: A station cannot host two matches with overlapping intervals \([t_{\text{start}}, t_{\text{end}}]\).
2. **Team Exclusivity**: A team cannot participate in two matches with overlapping intervals.
3. **Predecessor Invariant**: For any match \(M\) depending on feeder matches \(A\) and \(B\):
   \[
   t_{\text{start}}(M) \ge \max(t_{\text{end}}(A), t_{\text{end}}(B)) + \text{bufferDuration}
   \]
4. **Hardware Validation**: Matches are only assigned to stations with \(\ge 10\) working PCs.

### Soft Constraints (Heuristic Optimization)
1. **Lab Locality**: If a team plays back-to-back rounds, schedule them in the same lab to minimize hardware/peripherals migration time.
2. **Station Wear Leveling**: Balance match allocations across stations to prevent overheating in specific lab zones.
3. **Buffer Integrity**: Standard 15-minute inter-match buffer allows for player seat changes, warm-ups, and audio setup.
