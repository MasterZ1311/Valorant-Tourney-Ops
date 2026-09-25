# Operator User Guide — VTO

Welcome to the **VALORANT Tournament Operations System (VTO)**. This guide explains how tournament directors, registration staff, match marshals, and tech leads run a tournament smoothly.

---

## 1. Quick Navigation

| Role | Primary Route | Main Responsibilities |
|---|---|---|
| **Tournament Director** | `/admin` | Bracket, Fixtures, Station Config, Finalization, Overrides |
| **Registration Desk** | `/admin/attendance` | Check-in teams, verify player Riot IDs |
| **Match Marshal** | `/volunteer` | Call teams to station, verify lobby, Start/Pause/Score |
| **Tech Lead** | `/admin/incidents` & `/admin/venues` | Fix offline PCs, manage network issues |
| **Spectators / Audience** | `/display/:id` | Live scores, bracket tree, next matches |

---

## 2. Tournament Setup Checklist
1. **Create Tournament**:
   - Go to `/admin/tournaments/new`.
   - Enter name, date, time, and format (e.g. "Single Elimination").
2. **Setup Physical Labs & Stations**:
   - Go to `/admin/venues`.
   - Add Lab 1 (30 PCs, 3 Stations of 10 PCs each).
   - Add Lab 2 (10 PCs, 1 Station of 10 PCs).
   - Verify that the station counter shows **4 available stations (40 active PCs)**.
3. **Add Teams**:
   - Import CSV or add teams manually with 5 starting players each.
4. **Attendance Check-In**:
   - As teams arrive, search team name in `/admin/attendance` and toggle `CHECKED IN`.
5. **Generate Bracket & Fixtures**:
   - Click **Generate Bracket** → View bracket tree with seeds and BYEs.
   - Click **Generate Fixtures** → System schedules matches across available stations with zero conflicts.
6. **Pre-Flight Validation**:
   - Run system checks. Once all pass, click **Finalize Tournament**.

---

## 3. Match Day Execution
- Match Marshals open `/volunteer` on their smartphones.
- Tap **Call Teams** when the station is ready.
- Tap **Mark Ready** when both teams are seated and logged into VALORANT.
- Start Custom Game (Standard, Bind/Ascent/Haven, Tournament Mode ON, Cheats OFF).
- Tap **Start Match**.
- If a disconnect occurs: Tap **Technical Pause**, log issue. Tap **Resume** once solved.
- When match finishes: Tap **Finish Match**, input final round scores (e.g., 13-10), submit screenshot.
- Head Official at `/admin/matches` verifies score → winner automatically moves to the next bracket round!
