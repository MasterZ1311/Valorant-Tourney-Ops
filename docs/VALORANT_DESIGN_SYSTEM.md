# VALORANT & Riot Games UI/UX Design System Specification
## VTO — VALORANT Tournament Operations System

**Document Version**: 1.0.0  
**Date**: 2026-09-27  
**Target Environment**: Next.js 14 App Router, Tailwind CSS, Lucide Icons, TypeScript  
**Design Reference**: Riot Games `playvalorant.com`, in-game client HUD, and VCT (VALORANT Champions Tour) Broadcast Package

---

## 1. Executive Summary & Design Philosophy

The official VALORANT interface created by Riot Games is recognized as one of the most distinctive design languages in modern digital entertainment. It departs decisively from standard generic SaaS templates, flat minimalism, and rounded mobile cards. Instead, it fuses **"Defiant Streetwear Brutalism"** with **"Military Tactical Precision"**.

### Core Pillars of the VALORANT Aesthetic:
1. **Subversive Brutalism**: Bold, unapologetic geometric weight. Sharp, unrounded 0px borders or aggressive 45°/51° chamfered cuts. Heavy, condensed uppercase typography that commands authority.
2. **Tactical Military Precision**: The interface behaves like high-tech defense hardware. Features technical telemetry, latitude/longitude coordinates, crosshairs (`+`), millimeter grid rulers, framing corner brackets (`┌ ┐ └ ┘`), and bilingual tactical stamps (`// PROTOCOL`, `ヴァロラント`).
3. **High-Contrast Dark Canvas**: A deep obsidian/navy backdrop (`#0F1923`) creates a stage where the signature VALORANT Radiant Crimson (`#FF4655`) and Cyber Mint (`#66E5DA`) explode with intense focal energy.
4. **Instant Action & Zero Friction**: Every critical tournament action (Call Teams, Ready Lobby, Start Match, Tech Pause, Verify Result) is designed for immediate recognition under high-stress LAN tournament conditions.

---

## 2. Graphic Motifs & Geometric Language

VALORANT's visual identity is built upon mathematical geometric motifs that must be consistently woven into all UI components:

```
           THE 51° SIGNATURE CUT & CORNER FRAMING SYSTEM
  ┌────────────────────────────────────────────────────────┐
  │ ┌ [01 // LIVE_DECK] ─────────────────────────── + ┐   │
  │ │                                                 │   │
  │ │   MATCH M02 // ALPHA ARENA                      │   │
  │ │                                                 │   │
  │ └ ────────────────────────────── // LAT: 34.05 ───┘   │
  │                                   /                   │
  │    CHAMFERED BUTTON:             / (51° Angle Cut)    │
  │    /════════════════════════════/                     │
  │   /  START MATCH (LIVE)  ►     /                      │
  │  /════════════════════════════/                       │
  └────────────────────────────────────────────────────────┘
```

### 1. The 51° Angle Cut (The "V" Angle)
The core brand angle derived from the center of the VALORANT "V" logo is approximately **51°** (often implemented in CSS with `clip-path: polygon(...)` or 45°/51° skewed banners).
- **CSS Chamfer Formula for Buttons**:
  ```css
  /* Top-left or bottom-right cut */
  clip-path: polygon(
    0 0,
    calc(100% - 14px) 0,
    100% 14px,
    100% 100%,
    14px 100%,
    0 calc(100% - 14px)
  );
  ```
- **Angled Tab Header**:
  ```css
  clip-path: polygon(0 0, calc(100% - 18px) 0, 100% 100%, 0 100%);
  ```

### 2. Tactical HUD Corner Framing Brackets
Cards and panels in VALORANT do not use rounded corners (`rounded-lg`). Instead, they feature sharp right-angles embellished with technical framing brackets:
- **Visual Appearance**:
  - Top-Left: `┌`
  - Top-Right: `┐`
  - Bottom-Left: `└`
  - Bottom-Right: `┘`
- **Tailwind / CSS Implementation**:
  ```tsx
  <div className="relative border border-[#2b3844] bg-[#17202a] p-4">
    {/* Framing Corner Markers */}
    <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-[#ff4655]" />
    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-[#ff4655]" />
    <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-[#ff4655]" />
    <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-[#ff4655]" />
    {/* Content */}
  </div>
  ```

### 3. Dotted Matrix & Tactical Grid Overlay
Subtle background textures reinforce the tactical simulator atmosphere:
- **Dotted Grid Canvas**:
  ```css
  background-color: #0f1923;
  background-image: radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px);
  background-size: 24px 24px;
  ```
- **Hazard Warning Stripes** (for Lock/Unlock and DQ modals):
  ```css
  background-image: repeating-linear-gradient(
    -45deg,
    #ff4655,
    #ff4655 10px,
    #17202a 10px,
    #17202a 20px
  );
  ```

### 4. Technical Telemetry Decals & Micro-Annotations
Every card, fixture, and station is annotated with tactical metadata:
- Technical prefixes: `// MATCH.01`, `[SYS_ONLINE]`, `SECTOR_A // STATION_04`
- Coordinate tags: `LAT: 34.0522° N // LON: 118.2437° W`
- Japanese Katakana micro-labels: `ヴァロラント` (VALORANT), `プロトコル` (PROTOCOL), `ライブ` (LIVE)

---

## 3. Typography Architecture

VALORANT's typographic hierarchy is uncompromising, relying on ultra-condensed all-caps display fonts paired with clean technical grotesques and monospaces:

```
               VALORANT TYPOGRAPHIC HIERARCHY
┌─────────────────────────────────────────────────────────────┐
│ TUNGSTEN BOLD / ANTON (All-Caps Display, Condensed, Heavy)   │
│ "CHAMPIONSHIP BRACKET // ROUND OF 16"                       │
├─────────────────────────────────────────────────────────────┤
│ DIN NEXT LT PRO / RAJDHANI (Sharp Industrial Sans-Serif)    │
│ "CONFIRM CUSTOM LOBBY (LOBBY READY) • STATION 01"           │
├─────────────────────────────────────────────────────────────┤
│ JETBRAINS MONO / SHARE TECH MONO (Technical Telemetry)      │
│ "SYS_OK // 10/10 PCS ACTIVE // MS_LATENCY: 0.12ms"         │
├─────────────────────────────────────────────────────────────┤
│ BARLOW / INTER (High-Density Tabular Operations)            │
│ "Apex Predators • Seed #1 • Alexander Vance (Captain)"     │
└─────────────────────────────────────────────────────────────┘
```

| Role | Official Font (Riot) | Google Font Equivalent | Usage in VTO | Styling Guidelines |
|---|---|---|---|---|
| **Display / Headers** | **Tungsten Bold** | **Anton** or **Bebas Neue** | Page titles, Tournament title, Champion banner, Modal headlines | `uppercase`, `tracking-wider`, `font-black`, tight leading |
| **Sub-headlines & Buttons**| **DIN Next LT Pro** | **Rajdhani** (Semi-Bold/Bold) | Action buttons, Navigation items, Station badges, Card headers | `uppercase`, `font-bold`, `tracking-widest`, `text-sm` |
| **Telemetry & Codes** | **DIN Next Mono** | **JetBrains Mono** / **Share Tech Mono** | Match IDs (`M01`), Timestamps, PC Numbers, IP/Port, System logs | `font-mono`, `text-[11px]`, `tracking-widest`, `text-gray-400` |
| **Body & Dense Tables**| **DIN Next Regular** | **Barlow** / **Inter** | Team rosters, player IDs, incident descriptions, audit diffs | `font-normal`, `text-xs`/`text-sm`, high contrast legibility |

---

## 4. Color Token System & Semantic Palette

The color system is strictly calibrated to preserve Riot Games' official color values while exceeding WCAG AAA contrast standards on dark display panels:

| Token Name | Hex Code | Tailwind Name | Role & Usage |
|---|---|---|---|
| **VALORANT Dark (Canvas)** | `#0F1923` | `bg-valorant-dark` | Deep atmospheric base for all pages, modals, and screen canvasses |
| **Deep Slate (Surface 1)** | `#17202A` | `bg-valorant-surface` | Primary card background, panel surfaces, table rows |
| **Elevated Slate (Surface 2)**| `#1F2731` | `bg-valorant-elevated`| Hover states, station headers, modal content boxes |
| **Tactical Border** | `#2B3844` | `border-valorant-border`| 1px structural dividing lines, framing brackets, table dividers |
| **Radiant Crimson (Hero Red)**| `#FF4655` | `bg-valorant-red` | Primary brand accent, Live match status, CTA buttons, eliminate markers |
| **Hover Crimson** | `#E03D4B` | `hover:bg-valorant-redDark`| Interactive hover state for primary red buttons |
| **Off-White (Ivory)** | `#ECE8E1` | `text-valorant-ivory`| High-contrast headline typography, active tab labels |
| **Tactical Slate (Grey)** | `#8B978F` | `text-valorant-slate`| Secondary captions, technical telemetry, offline indicators |
| **Cyber Mint** | `#66E5DA` | `text-valorant-mint` | Shield badges, verified scores, online operational status, tech pulse |
| **Radiant Gold** | `#F2D16B` | `text-valorant-gold` | Grand champion title, 1st place medals, MVP trophies, VIP badges |
| **Warning Amber** | `#FF9900` | `text-valorant-amber`| Technical pauses, pending review, hardware check warnings |
| **Terminal Cyan** | `#00E5FF` | `text-valorant-cyan` | Coordinate markers, volunteer runner alerts, projector indicators |

---

## 5. UI Component Specifications

### 1. The Tactical Action Button (`ValorantButton`)
The signature VALORANT button features chamfered diagonal corners, high-impact uppercase typography, an animated border trace, and a snappy slide-in red accent fill:

```tsx
// Visual Specs:
// - Height: 44px (Desktop) / 54px (Mobile Marshal)
// - Cut corner: 12px diagonal chamfer on top-left and bottom-right
// - Typography: uppercase, tracking-widest, font-bold
// - States: default, hover (slanted fill slide-in), active (scale-98), disabled (slate opacity 40%)
```

### 2. Tactical Command Card (`TacticalCard`)
Replaces generic rounded web cards with an angular, industrial container:
- Inset framing corner brackets (`#FF4655` or `#66E5DA`)
- Top technical header bar: `// STATION 01 [ONLINE]` with pulsing LED beacon
- Dark matte carbon finish: `#17202A` with a 1px border of `#2B3844`

### 3. High-Contrast Status Badges (`StatusBadge`)
Every match and tournament state maps to a specialized tactical insignia:
- **`SCHEDULED`**: Tactical Slate `#8B978F`, static border.
- **`CALLED`**: Electric Cyan `#00E5FF`, animated radar ping.
- **`READY`**: Indigo Cyber `#6366F1`, steady ready beacon.
- **`LOBBY_READY`**: Neon Violet `#A855F7`, pulsing lobby lock symbol.
- **`LIVE`**: Radiant Crimson `#FF4655`, pulsing broadcast dot, subtle crimson box-shadow glow.
- **`PAUSED`**: Hazard Amber `#FF9900`, tech pause icon with warning stripes.
- **`VERIFIED`**: Cyber Mint `#66E5DA`, checkmark badge with emerald halo.

### 4. Esports Tournament Bracket Tree
Inspired directly by the **VALORANT Champions Tour (VCT)** broadcast graphics:
- High-contrast team slots with seed markers (`#01`, `#02`).
- Score pills in Radiant Crimson vs Slate.
- Glowing branch lines connecting winner progression.
- Auto-advanced BYE matches designated with distinct diagonal tech striping.

### 5. Volunteer Mobile Marshal Interface (`/volunteer`)
Engineered for dim LAN venues and fast thumb-reachability:
- Full-width hero cards for the volunteer's assigned station.
- Touch targets $\ge 48\text{px}$ to $56\text{px}$ with high tactile contrast.
- Single-tap actions: Call Teams $\to$ Mark Seated $\to$ Ready Lobby $\to$ Start Live $\to$ Submit Score.

### 6. Public Display Board (`/display/:id`)
A full-screen, projector-ready broadcast arena display:
- Dark stadium backdrop with live station occupancy boards.
- Top scrolling news ticker for announcements and next match calls.
- High-visibility scoreboard visible from 30+ feet away in a college hall.
- Automatic 8-second smooth refresh with zero admin controls exposed.

---

## 6. Sound & Audio-Tactile Feedback (Web Audio API)

In official Riot games, every UI interaction has rich tactile sound feedback (the crisp mechanical "tick" of hovering a button, the deep resonant "lock-in" chord when confirming a match, and the warning alert of a tech pause).

To achieve this in VTO with **zero external sound file dependencies**, we can utilize the browser's native **Web Audio API** (`AudioContext`) to synthesize lightweight, authentic tactical audio cues:
- **`playHoverSound()`**: 800Hz high-frequency micro-click (15ms duration).
- **`playSelectSound()`**: 440Hz $\to$ 880Hz upward pitch chirp on confirming match state.
- **`playLiveMatchSound()`**: Deep tactical lock-in bass synth when match goes `LIVE`.
- **`playPauseAlertSound()`**: Two-tone alert klaxon (`880Hz / 440Hz`) when a technical pause is triggered.

*(Sound effects can be toggled on/off via an operator audio toggle in the navigation bar).*

---

## 7. Resource Inventory & External Assets

To implement this official Riot Games / VALORANT design language with perfection, here is the complete breakdown of resources:

### Category A: Zero-Dependency Open Assets (Immediately Implementable)
We can execute 100% of the visual overhaul immediately using open-source, standards-compliant web technologies without requiring any external files from the user:
1. **Google Fonts via `next/font/google`**:
   - `Anton` or `Bebas Neue` for the heavy, condensed Tungsten-style headlines.
   - `Rajdhani` or `Chakra Petch` for the industrial DIN Next-style subheaders.
   - `JetBrains Mono` for telemetry and monospace match codes.
   - `Barlow` for dense table layouts.
2. **Pure CSS Geometric Chamfers (`clip-path`)**:
   - 51° and 45° polygon cuts without requiring external image slices.
3. **Pure SVG Tactical Markers**:
   - Crosshairs (`+`), corner framing brackets (`┌ ┐`), hazard stripes, and telemetry icons.
4. **Web Audio API Synthesizer**:
   - Self-contained procedural sound effects with 0kb audio downloads.

### Category B: User-Provided Proprietary Resources (Optional Enhancements)
If the user or tournament organizer possesses official proprietary Riot Games asset files that they wish to supply, the system can seamlessly incorporate them:
1. **Licensed Typography Files** (`.woff2` or `.ttf` placed into `public/fonts/`):
   - `Tungsten-Bold.woff2` (Official Riot headline font).
   - `DINNextLTPro-Bold.woff2` & `DINNextLTPro-Medium.woff2` (Official Riot body font).
   - `Valorant-Font.ttf` (Community wordmark font).
2. **Official Vector Logo & Agent Silhouette SVGs** (placed into `public/images/`):
   - Official VALORANT "V" logo vector.
   - Official VCT tournament crest vector.
   - Agent role silhouettes (Duelist, Initiator, Controller, Sentinel) for team roster badges.
3. **Official In-Game Sound Effect Audio Clips** (placed into `public/sounds/`):
   - `ui_button_hover.mp3` / `ui_button_click.mp3`
   - `match_found.mp3` / `round_start.mp3`
   - `tech_pause.mp3`

---

## 8. Step-by-Step Implementation Blueprint

When authorized to proceed with implementation, the rollout will follow this phased sequence:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PHASED ROLLOUT PLAN                             │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 1: Design Tokens, Tailwind Config, Typography & Canvas Texture   │
│   • Configure Google Fonts (Anton, Rajdhani, JetBrains Mono, Barlow)   │
│   • Expand tailwind.config.ts with VALORANT color palette & utilities │
│   • Add global tactical dotted grid and scanline styles in globals.css │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 2: Core Primitive Components                                     │
│   • Create <ValorantButton /> with 51° chamfer and sliding hover fill  │
│   • Create <TacticalCard /> with HUD corner brackets and telemetry tag │
│   • Enhance <StatusBadge /> with animated pulsing beacons and borders  │
│   • Create procedural Web Audio sound utility (src/lib/sound/audio.ts) │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 3: Admin Command Center Overhaul (/admin/*)                      │
│   • Redesign Dashboard KPI cards into tactical telemetry stations      │
│   • Overhaul Live Match Control Desk (<LiveMatchBoard />)              │
│   • Redesign Bracket Tree (<BracketViewer />) with VCT broadcast style │
│   • Redesign Incident Desk & Validation Modal with hazard warnings     │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 4: Volunteer Mobile & Projector Display Overhaul                 │
│   • Modernize /volunteer with tactical 56px action touch controls      │
│   • Enhance /display/:id into stadium VCT broadcast spectator HUD      │
│   • Update Top Navigation Header with brand crest and audio toggle     │
├────────────────────────────────────────────────────────────────────────┤
│ PHASE 5: Verification & Quality Assurance                              │
│   • Verify 0 TypeScript errors (npx tsc --noEmit)                      │
│   • Verify all 252 tests pass (npm test)                               │
│   • Clean production compilation (npm run build)                       │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 9. Next Action & Next Steps

This specification establishes the complete visual, architectural, and mathematical blueprint for converting the VTO platform into an authentic, production-grade Riot Games / VALORANT experience.

Operators may review this document, indicate whether they wish to provide any proprietary font/sound assets from **Category B**, or authorize immediate proceeding with **Phase 1 through Phase 5** using our zero-dependency open asset system.
