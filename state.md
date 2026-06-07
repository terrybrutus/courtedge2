---
# CourtEdge — Project State

**Last updated:** 2026-05-25T03:29:24Z

---

## What This App Is

CourtEdge is an NBA playoff betting research tool. It is focused on two specific bet types — **Player Points Props** and **Game Totals** — with the goal of doing those two things with obsessive depth rather than covering everything superficially.

**Stack:** Motoko backend + React + TypeScript + Tailwind CSS, deployed on Internet Computer.

---

## External APIs Used

| API | Purpose |
|---|---|
| ESPN public API | Today's games, scores, game status, rosters, injuries |
| The Odds API | Multi-book odds (spreads, moneylines, over/unders) |
| API-Sports / API-NBA | Player stats, team stats, H2H history |
| Groq | AI-generated plain-language bet reasoning and confidence explanations |

---

## Core Features (Planned / Built)

### Home — Today's Games
- List of today's NBA playoff games with live status (Live / Upcoming / Final)
- Each game card shows teams, records, series status, venue, odds summary
- Click any game to enter the Investigation Room

### Investigation Room (per game)
- Full breakdown of the selected matchup
- **Player Points Props tab:** usage rate, matchup defensive rating, recent scoring form, injury adjustments, confidence meter (0–100) with AI reasoning
- **Game Totals tab:** both teams' pace and offensive/defensive efficiency, recent scoring trends, referee tendencies (foul rate → free throws → points), confidence meter with AI reasoning
- **Odds tab:** side-by-side odds from multiple books, line discrepancy highlights where the market may be off

### AI Confidence Layer
- Groq-powered plain-language explanations for each bet recommendation
- Confidence score with bullet-point reasons driving it up or down
- No raw numbers — written in plain language a bettor can act on

---

## Recurring Bug History (ESPN Date Fetching)

This has been the most painful issue in the build. A summary of what happened:

| Round | Root cause | Status |
|---|---|---|
| 1 | Hardcoded fake game data (CLE vs IND, GSW vs MIN) used as fallback, never replaced with live data | Fixed |
| 2 | Date comparison using wrong year (2025 vs 2026) | Fixed |
| 3 | A byte-size guard was silently discarding valid ESPN API responses | Fixed |
| 4 | Error handler swallowing all failures and returning empty data with no logging | Fixed |
| 5 | UTC to ET conversion adding 4 hours instead of subtracting, pushing the date to May 26 instead of May 25 | Fixed (latest deploy) |
| 6 | Frontend had a second date filter undoing the backend's date work | Fixed |

**Current state after latest fix:** The backend now subtracts 4 hours from UTC to get Eastern Time, producing the correct date string for ESPN. The app logs [COURTEDGE] debug lines to the browser console showing the exact date sent to ESPN, so any future drift is immediately visible.

---

## Known Issues at Last Deploy (2026-05-25)

1. **Investigation room data quality** — the investigation room loads without crashing now, but the depth of data (especially props and odds) has not been fully verified with real playoff game data. OKC vs Spurs Game 4 (tonight, ~8:00 PM ET) is the first real test.
2. **Game status labels** — "Live" vs "Upcoming" logic has had multiple failures. The latest fix uses ESPN's actual status field rather than inferring from time.
3. **Groq AI analysis** — requires the user to enter an API key via the settings icon in the top nav. If no key is set, AI reasoning sections will be empty or show a placeholder.
4. **2026 vs 2025** — ESPN and other APIs return 2026 dates. Early builds had hardcoded 2025 assumptions that caused silent failures.

---

## What Is NOT Built Yet

- Historical game archives / past playoff matchup browser
- Side-by-side player comparison tool
- Live in-game line movement tracking
- Head-to-head historical matchup panel
- Real-time injury alert push/refresh
- Advanced metrics behind paywalls (ORtg/DRtg, TS%, clutch stats, matchup-specific defensive profiles)
- Prop odds with +EV detection

---

## Design Notes

- Dark, data-rich visual style throughout
- Confidence meters are visual (0–100 scale) with plain-language driver bullets
- Multi-book odds presented side by side with discrepancy highlights
- Investigation room is meant to feel like a full immersive investigation room, not a dashboard

---

## File / Tech Notes

- Backend: src/backend/ — Motoko canister, ESPN API calls via http-outcalls extension
- Frontend: src/frontend/ — React + TypeScript + Tailwind CSS
- Bindings: run pnpm bindgen from root after any backend method changes
- Key commands:
  - Frontend typecheck: cd src/frontend && pnpm typecheck
  - Frontend build: cd src/frontend && pnpm build
  - Backend typecheck: cd src/backend && mops check --fix
  - Bindings: pnpm bindgen (from root)
---
