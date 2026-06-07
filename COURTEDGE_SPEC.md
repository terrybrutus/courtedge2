# CourtEdge — Complete Build Specification

> **Purpose of this document:** This spec is the single source of truth for rebuilding CourtEdge from scratch in a new session. It captures every architectural decision, API contract, data shape, known bug, and optimization from 29 build rounds. Follow it exactly and the app should compile, deploy, and work correctly on the first attempt.

---

## Table of Contents

1. [What CourtEdge Does](#what-courtedge-does)
2. [Tech Stack](#tech-stack)
3. [API Keys — Hardcoded, Never via Settings](#api-keys)
4. [Project File Structure](#project-file-structure)
5. [Backend Architecture](#backend-architecture)
6. [Frontend Architecture](#frontend-architecture)
7. [Data Flows — End to End](#data-flows)
8. [External API Reference](#external-api-reference)
9. [Caching Layer — Non-Negotiable](#caching-layer)
10. [Self-Learning Bet History](#self-learning-bet-history)
11. [Design & UI Requirements](#design--ui-requirements)
12. [Known Bugs — Never Repeat These](#known-bugs--never-repeat-these)
13. [Acceptance Criteria](#acceptance-criteria)

---

## What CourtEdge Does

CourtEdge is an NBA playoff betting research tool. It is **not** a picks service or a dashboard full of noise. It is built around two bet types with the highest free-data coverage and best predictive accuracy:

- **Player Points Props** — usage rate, matchup defensive rating, recent form, injury context, pace factor
- **Game Totals (Over/Under)** — both teams' pace, offensive/defensive efficiency, referee foul tendencies, injury-adjusted projections

**Design philosophy:**
- Only surfaces picks when multiple independent signals align
- High-confidence, low-frequency — built for a small bankroll user who wants maybe 1-2 bets per week with genuine conviction
- Self-learning: every AI recommendation is stored permanently; the AI reads its own track record before making new picks
- Filters out EV math as a primary filter — looks for convergence of 5-6 independent signals instead

**What makes CourtEdge different from other sports betting apps:**
1. **Only bets when confident** — no filler picks, no "here's today's slate." If nothing clears the threshold, it tells you nothing clears. Most apps push picks every day to keep you engaged.
2. **Self-learning from its own record** — every recommendation is logged with the outcome. The AI reads its own history before making new picks, so it adjusts based on what it has actually gotten right and wrong.
3. **Convergence over margins** — instead of "this has a 2% edge," it looks for situations where multiple independent signals all point the same direction: matchup data, injury impact, pace, recent form, rest days, historical H2H. When 6 of 6 things align, that is a different kind of confidence than a marginal EV calculation.
4. **Small bankroll by design** — built around high-confidence, low-frequency picks. Not a volume game.
5. **No noise** — it does not show you 40 stats and leave you to figure it out. It surfaces a verdict with the specific reasons behind it.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Motoko canister on Internet Computer |
| Frontend | React 19 + TypeScript + Tailwind CSS |
| Routing | TanStack Router (file-based, lazy-loaded pages) |
| Data fetching | React Query (TanStack Query) |
| UI primitives | Radix UI (Dialog, Tabs, Badge, Button, Skeleton, Tooltip) |
| Animations | Framer Motion |
| External APIs | Ball Don't Lie, The Odds API, OpenAI (via http-outcalls extension) |
| State management | React Query for server state, component useState for UI state |

No Zustand stores required. Zustand may be imported but is not used.

---

## API Keys

**All three keys must be hardcoded directly into `src/backend/main.mo`.** There is no Settings UI for entering keys. The SettingsPage only shows connection status (always "Connected" since keys are hardcoded).

```
Ball Don't Lie:  866f00d3-c11f-4b46-bf67-6e37accde2b9
The Odds API:    6f6725d8b12b239c51bd1b404fd83c5e
OpenAI:          sk-proj-[redacted — see main.mo]
```

The setter functions (setOpenAIApiKey, setOddsApiKey, setBdlApiKey) must exist in the backend but must be no-ops — they accept a key argument and do nothing. This allows the frontend to call them without error while the real keys remain hardcoded.

---

## Project File Structure

```
app/
├── mops.toml
├── dfx.json
├── package.json               # root — pnpm bindgen
├── caffeine.toml
├── COURTEDGE_SPEC.md          # this file
├── state.md                   # living state document
└── src/
    ├── backend/
    │   ├── main.mo            # composition root + hardcoded keys + shared cache
    │   ├── mops.toml
    │   ├── types/
    │   │   ├── common.mo      # shared error types, Result<T>, ApiStatus
    │   │   ├── games.mo       # Game, Team, OddsLine, GameInvestigation, GamesResponse
    │   │   ├── props.mo       # Player, PlayerProp, PropLine, PlayerPropsAnalysis
    │   │   ├── totals.mo      # PaceProfile, ScoringTrend, GameTotal, TotalsConfidenceReport
    │   │   └── history.mo     # BetRecommendation, BetStatus, BetType, BetHistoryStats
    │   ├── lib/
    │   │   ├── cache.mo       # CacheEntry, Cache type, TTL constants, get/put functions
    │   │   ├── games.mo       # date math, BDL/Odds parsing, team lookups, text helpers
    │   │   ├── props.mo       # player search/stats parsing, props prompt builder
    │   │   └── totals.mo      # team scoring parsing, projection math, totals prompt builder
    │   └── mixins/
    │       ├── games-api.mo   # getTodaysGames, getGameInvestigation, HTTP transform
    │       ├── props-api.mo   # getPlayerPropsAnalysis, getPropsAIAnalysis, bdlGetWithRetry
    │       ├── totals-api.mo  # getGameTotalsAnalysis, getTotalsAIAnalysis, sequential BDL calls
    │       ├── openai-api.mo  # stub config queries (always return true), no-op setters
    │       └── history-api.mo # saveBetRecommendation, getBetHistory, updateBetOutcome, getHistoryContext
    └── frontend/
        ├── package.json
        ├── tailwind.config.js
        └── src/
            ├── main.tsx              # React 19 entry, renders App into #root
            ├── App.tsx               # TanStack Router setup, lazy-loaded routes, Layout wrapper
            ├── index.css             # OKLCH design tokens, custom fonts, Tailwind base
            ├── types/
            │   └── index.ts          # all types re-exported + helpers (formatMoneyline etc.)
            ├── hooks/
            │   └── useBackend.ts     # all React Query hooks for backend calls
            ├── pages/
            │   ├── GamesPage.tsx     # today's games or upcoming games dashboard
            │   ├── InvestigationPage.tsx  # full matchup investigation room
            │   ├── HistoryPage.tsx   # bet history + outcome tracking
            │   └── SettingsPage.tsx  # API connection status display
            ├── components/
            │   ├── Layout.tsx        # app shell, sticky nav, status indicators
            │   ├── ConfidenceMeter.tsx   # visual 0-100 confidence score
            │   ├── InjuryBadge.tsx   # player injury status pill
            │   ├── OddsCard.tsx      # single bookmaker odds display
            │   └── OpenAIKeyModal.tsx    # modal (deprecated no-op, but keep for nav compatibility)
            └── declarations/
                └── backend.did.d.ts  # auto-generated by pnpm bindgen — DO NOT hand-edit
```

---

## Backend Architecture

### main.mo

The composition root. It:
1. Declares all three API keys as `let` constants (never vars, never loaded from state)
2. Initializes the shared response cache (`var cache: Cache.Cache`)
3. Includes all five mixins
4. Exposes all public methods via `public` wrappers that delegate to mixin functions

```motoko
// main.mo pattern
actor CourtEdge {
  let BDL_API_KEY = "866f00d3-c11f-4b46-bf67-6e37accde2b9";
  let ODDS_API_KEY = "6f6725d8b12b239c51bd1b404fd83c5e";
  let OPENAI_API_KEY = "sk-proj-...";

  stable var cacheEntries : [(Text, Cache.CacheEntry)] = [];
  var cache = Cache.empty();

  system func preupgrade() { cacheEntries := Cache.toStable(cache); };
  system func postupgrade() { cache := Cache.fromStable(cacheEntries); };

  // Public methods delegate to mixins
}
```

### Types

#### types/common.mo
```motoko
module {
  public type GameId = Text;
  public type PlayerId = Text;
  public type TeamId = Text;
  public type Timestamp = Int;
  public type ApiError = {
    #networkError: Text;
    #parseError: Text;
    #notFound: Text;
    #rateLimited: Text;
    #unavailable: Text;
  };
  public type Result<T> = { #ok: T; #err: ApiError };
  public type ApiStatus = {
    bdlConfigured: Bool;
    oddsConfigured: Bool;
    openAIConfigured: Bool;
  };
}
```

#### types/games.mo
```motoko
module {
  public type GameStatus = { #live; #upcoming; #final; #postponed };
  public type Team = {
    id: Text;
    name: Text;         // full name e.g. "Oklahoma City Thunder"
    abbreviation: Text; // e.g. "OKC"
    city: Text;         // e.g. "Oklahoma City"
    record: Text;       // e.g. "57-25"
    score: ?Nat;
  };
  public type InjuryReport = {
    playerId: Text;
    playerName: Text;
    team: Text;
    status: Text;       // "Out", "Doubtful", "Day-to-Day", "Questionable"
    description: Text;
  };
  public type OddsLine = {
    bookmaker: Text;
    homeMoneyline: ?Int;
    awayMoneyline: ?Int;
    homeSpread: ?Float;
    awaySpread: ?Float;
    overUnder: ?Float;
    overOdds: ?Int;
    underOdds: ?Int;
    lastUpdated: Text;
  };
  public type Discrepancy = {
    market: Text;       // "spread", "total", "moneyline"
    minValue: Text;
    maxValue: Text;
    bookmakerMin: Text;
    bookmakerMax: Text;
    gapNote: Text;
  };
  public type TeamStats = {
    offensiveRating: ?Float;
    defensiveRating: ?Float;
    pace: ?Float;
    assistRatio: ?Float;
    reboundRate: ?Float;
  };
  public type ConfidenceReport = {
    score: Nat;
    signals: [Text];
    recommendation: Text;
  };
  public type GameInvestigation = {
    gameId: Text;
    homeTeam: Team;
    awayTeam: Team;
    status: GameStatus;
    startTime: Text;
    venue: Text;
    injuries: [InjuryReport];
    odds: [OddsLine];
    discrepancies: [Discrepancy];
    homeStats: ?TeamStats;
    awayStats: ?TeamStats;
    seriesStatus: ?Text;
  };
  public type Game = {
    id: Text;
    homeTeam: Team;
    awayTeam: Team;
    status: GameStatus;
    startTime: Text;    // ISO 8601 UTC string
    venue: Text;
    seriesStatus: ?Text;
    oddsTeaser: ?Text;
  };
  public type GamesResponse = {
    games: [Game];
    fetchedDate: Text;
    isUpcomingDate: Bool;
    upcomingDateLabel: ?Text;
  };
}
```

#### types/props.mo
```motoko
module {
  public type Player = {
    id: Text;
    firstName: Text;
    lastName: Text;
    position: Text;
    teamAbbreviation: Text;
    injuryStatus: ?Text;
    isStarting: Bool;
  };
  public type PlayerRecentGame = {
    date: Text;
    points: Nat;
    assists: Nat;
    rebounds: Nat;
    minutes: Nat;
    fga: Nat;
    fgm: Nat;
  };
  public type PropLine = {
    bookmaker: Text;
    line: Float;
    overOdds: ?Int;
    underOdds: ?Int;
  };
  public type PlayerProp = {
    player: Player;
    seasonAvgPoints: Float;
    seasonAvgMinutes: Float;
    usageRate: Float;
    recentGames: [PlayerRecentGame];
    matchupDefRating: ?Float;
    propLines: [PropLine];
    confidenceScore: Nat;
    confidenceSignals: [Text];
    recommendation: Text;
    isBackToBack: Bool;
  };
  public type PlayerPropsAnalysis = {
    gameId: Text;
    players: [PlayerProp];
    topPick: ?PlayerProp;
    generatedAt: Int;
  };
}
```

#### types/totals.mo
```motoko
module {
  public type ScoringTrend = {
    gamesBack: Nat;
    avgPointsFor: Float;
    avgPointsAgainst: Float;
    avgTotal: Float;
    overHitRate: Float;
    underHitRate: Float;
  };
  public type RefereeProfile = {
    name: Text;
    avgFoulsPerGame: Float;
    avgFTAPerGame: Float;
    overRate: Float;
  };
  public type PaceProfile = {
    teamName: Text;
    pace: Float;
    offensiveEfficiency: Float;
    defensiveEfficiency: Float;
    avgPointsFor: Float;
    avgPointsAgainst: Float;
  };
  public type TotalsConfidenceReport = {
    score: Nat;
    signals: [Text];
    recommendation: Text;   // "OVER", "UNDER", or "NO BET"
    projectedTotal: Float;
  };
  public type GameTotal = {
    gameId: Text;
    homeTeamPace: PaceProfile;
    awayTeamPace: PaceProfile;
    homeScoringTrend: ScoringTrend;
    awayScoringTrend: ScoringTrend;
    refereeProfile: ?RefereeProfile;
    projectedTotal: Float;
    confidence: TotalsConfidenceReport;
    injuries: [Text];
    generatedAt: Int;
  };
}
```

#### types/history.mo
```motoko
module {
  public type BetType = { #playerPoints; #gameTotal; #spread; #moneyline };
  public type BetStatus = { #pending; #won; #lost; #push; #cancelled };
  public type BetRecommendation = {
    id: Text;
    gameId: Text;
    gameDate: Text;
    betType: BetType;
    recommendation: Text;
    confidence: Nat;
    preGameOdds: Text;
    outcome: ?Text;
    status: BetStatus;
    recommendedAt: Int;
    resolvedAt: ?Int;
    notes: Text;
  };
  public type BetHistoryStats = {
    totalBets: Nat;
    wonBets: Nat;
    lostBets: Nat;
    pushBets: Nat;
    pendingBets: Nat;
    winRate: Float;
    avgConfidence: Float;
    highConfidenceWinRate: Float;
  };
}
```

---

### lib/ — Pure Helpers (No HTTP Calls, No State)

#### lib/cache.mo
```motoko
module {
  public type CacheEntry = { data: Text; timestamp: Int; };
  public type Cache = HashMap.HashMap<Text, CacheEntry>;
  public let TTL_15MIN : Int = 900_000_000_000;
  public let TTL_5MIN  : Int = 300_000_000_000;
  public func empty() : Cache { HashMap.HashMap(16, Text.equal, Text.hash) };
  public func get(cache: Cache, key: Text, ttl: Int) : ?Text {
    switch (cache.get(key)) {
      case null null;
      case (?entry) {
        if ((Time.now() - entry.timestamp) < ttl) ?entry.data else null
      };
    }
  };
  public func put(cache: Cache, key: Text, data: Text) {
    cache.put(key, { data; timestamp = Time.now() });
  };
}
```

**Cache key conventions:**
- BDL games for a date: `bdl_games_2026-06-01`
- Upcoming games search: `bdl_games_upcoming_14`
- BDL stats for a game: `bdl_stats_GAMEID`
- BDL season averages: `bdl_savg_PLAYERID_2025`
- Odds for NBA: `odds_nba_20260601`
- Player props: `props_GAMEID`
- Game totals: `totals_GAMEID`

#### lib/games.mo — Critical Functions

**computeTodayDateStr() → Text**
Returns today's date as YYYY-MM-DD using raw UTC.
CRITICAL: Use `Time.now() / 1_000_000_000` to get Unix seconds. Compute year/month/day via proleptic Gregorian calendar math. Do NOT subtract or add hours for any timezone conversion. This single function was the source of 6+ "0 games" failures.

**advanceDateStr(dateStr: Text, days: Nat) → Text**
Adds N days to a YYYY-MM-DD string for the 14-day upcoming game search.

**parseBdlGames(jsonText: Text, date: Text) → [Game]**
Parses BDL /games response. Key rules:
- game.date is already YYYY-MM-DD — use directly
- Use `game.home_team.full_name` for display — NEVER concatenate city + name
- status: "Final" → #final, "In Progress" → #live, anything else → #upcoming
- Scores may be null for upcoming games

**shortTeamName(fullName: Text) → Text** and **teamCity(fullName: Text) → Text**
Hardcoded lookup tables for all 30 teams. Never construct programmatically.

Hardcoded BDL team ID map (all 30 teams):
```
Atlanta Hawks = 1         Houston Rockets = 11      OKC Thunder = 21
Boston Celtics = 2        Indiana Pacers = 12        Orlando Magic = 22
Brooklyn Nets = 3         LA Clippers = 13           Philadelphia 76ers = 23
Charlotte Hornets = 4     Los Angeles Lakers = 14    Phoenix Suns = 24
Chicago Bulls = 5         Memphis Grizzlies = 15     Portland Trail Blazers = 25
Cleveland Cavaliers = 6   Miami Heat = 16            Sacramento Kings = 26
Dallas Mavericks = 7      Milwaukee Bucks = 17       San Antonio Spurs = 27
Denver Nuggets = 8        Minnesota Timberwolves = 18 Toronto Raptors = 28
Detroit Pistons = 9       New Orleans Pelicans = 19  Utah Jazz = 29
Golden State Warriors = 10 New York Knicks = 20      Washington Wizards = 30
```

#### lib/props.mo
- `buildBdlPlayerSearchUrl(name)` → `https://api.balldontlie.io/v1/players?search=NAME`
- `buildBdlSeasonAvgUrl(id)` → `https://api.balldontlie.io/v1/season_averages?season=2025&player_ids[]=ID`
- `buildBdlRecentGamesUrl(id)` → `https://api.balldontlie.io/v1/stats?player_ids[]=ID&per_page=5`
- Usage rate formula: `(seasonFGA * 1.3) / pace_factor`
- `buildPropsAnalysisPrompt(players, historyContext)` — includes past outcomes for self-learning

#### lib/totals.mo
- `buildBdlTeamRecentGamesUrl(teamId, count)` → `https://api.balldontlie.io/v1/games?team_ids[]=ID&per_page=10`
- `projectGameTotal(home, away)` → `((home.avgPtsFor + away.avgPtsAgainst) + (away.avgPtsFor + home.avgPtsAgainst)) / 2 * 0.95`
- The 0.95 factor is a playoff defensive tightening adjustment
- `buildTotalsAnalysisPrompt(total, historyContext)` — ends with clear OVER/UNDER/NO BET

---

### mixins/ — Stateful API Logic

#### mixins/games-api.mo

**getTodaysGames() logic:**
1. Compute `todayStr = computeTodayDateStr()` — raw UTC, NO timezone offset
2. Check cache for `bdl_games_TODAYSTR`
3. Cache hit: parse and return
4. Cache miss: call BDL `GET /games?dates[]=TODAYSTR&postseason=true`
   - Authorization header: `Bearer BDL_API_KEY`
5. If empty: search ahead days +1 through +14 (two batch calls, sequential)
   - Find earliest date with games
   - Return with `isUpcomingDate: true`
6. Cache success, parse, overlay Odds API data, return GamesResponse

**MUST NEVER:**
- Subtract or add hours to the UTC date
- Return an empty games array (always search ahead)
- Discard responses based on byte length
- Return mock/hardcoded game data
- Swallow errors silently

**HTTP transform (required for IC):**
```motoko
public query func transform(args: IC.TransformArgs) : IC.HttpResponse {
  { status = args.response.status; body = args.response.body; headers = [] }
};
```

#### mixins/props-api.mo

**bdlGetWithRetry(url) pattern — use for EVERY BDL call:**
```
attempt = 0
loop:
  HTTP GET with Authorization: Bearer BDL_API_KEY
  if 200: return body
  if 429 and attempt < 3: wait 1s * 2^attempt, retry
  else: throw #rateLimited or #networkError with actual error text
```

All BDL calls must be SEQUENTIAL — never use parallel awaits.

**getPropsAIAnalysis() — only called on explicit user button press, never auto-fired:**
- Fetches cached props analysis
- Gets historyContext (last 20 bet outcomes)
- Builds prompt via lib/props.buildPropsAnalysisPrompt()
- POST to OpenAI with model gpt-4o-mini, temperature 0.3, max_tokens 600

#### mixins/totals-api.mo

Home team data fetch, then AWAIT completion, then away team data fetch.
Never fire both team lookups in parallel.

#### mixins/openai-api.mo — Stub Only

```motoko
public query func isOpenAIConfigured() : async Bool { true };
public query func isOddsApiConfigured() : async Bool { true };
public query func isBdlApiConfigured() : async Bool { true };
public func setOpenAIApiKey(_key: Text) : async () { };   // no-op
public func setOddsApiKey(_key: Text) : async () { };     // no-op
public func setBdlApiKey(_key: Text) : async () { };      // no-op
public func getApiStatus() : async Types.ApiStatus {
  { bdlConfigured = true; oddsConfigured = true; openAIConfigured = true }
};
```

#### mixins/history-api.mo

State: `stable var betHistoryEntries : [(Text, BetRecommendation)]` with pre/postupgrade hooks.

Methods:
- `saveBetRecommendation(rec)` — stores in HashMap, persists across upgrades
- `getBetHistory()` — returns all, sorted DESC by recommendedAt
- `updateBetOutcome(id, outcome, status)` — updates status field
- `getBetHistoryStats()` — computes win rate aggregates
- `getHistoryContext()` — last 20 bets as formatted string for AI self-learning

**getHistoryContext() format:**
```
Past bet recommendations:
- 2026-05-28 | PlayerPoints | SGA OVER 32.5 pts | Confidence: 78 | Result: WON
- 2026-05-26 | GameTotal | OKC vs SAS UNDER 218.5 | Confidence: 72 | Result: WON
Win rate: 2/3 (67%). High-confidence (70+) win rate: 2/2 (100%).
```

---

## Frontend Architecture

### Routes

| Path | Page | Notes |
|---|---|---|
| `/` | GamesPage | Today's games or upcoming |
| `/game/$gameId` | InvestigationPage | `?gameDate=YYYY-MM-DD` search param |
| `/history` | HistoryPage | Bet history and outcomes |
| `/settings` | SettingsPage | API status (always Connected) |

All pages lazy-loaded via React.lazy() with Suspense skeleton fallback.

### Pages

#### GamesPage.tsx
- Polls useTodayGames() every 120 seconds
- If isUpcomingDate: shows banner "Next Games: [upcomingDateLabel]"
- Game cards: full team name (no city duplication), records, status badge, series status, odds teaser, venue, "Investigate →" link
- Error state: actual API error message + Retry button
- NEVER shows empty/dead-end screen if API is working

#### InvestigationPage.tsx
Tabs: **Matchup** (default) / **Player Props** / **Game Totals**

- Matchup: teams, series status, injuries (InjuryBadge), odds table (OddsCard), discrepancies
- Props tab: data fetches ONLY when tab is first opened (not on page mount). Shows top players with ConfidenceMeter, season avg, recent 5-game form, usage rate, injury badge, back-to-back flag, confidence signals. "Analyze with AI" button at bottom — NEVER auto-fires.
- Totals tab: data fetches ONLY when tab is first opened. Both teams' pace profiles, scoring trends, projected total vs current line, TotalsConfidenceReport, "Analyze with AI" button — NEVER auto-fires.
- AI result: shown as expandable card, stays rendered, no re-fetch on tab revisit

#### HistoryPage.tsx
- All BetRecommendation records, newest first
- Per card: date, game, bet type, recommendation text, ConfidenceMeter, status badge (Pending/Won/Lost/Push)
- Inline outcome editor: [Won] [Lost] [Push] buttons for pending bets
- Stats card: total bets, win/loss/push/pending, win rate %, avg confidence of winners

#### SettingsPage.tsx
- Shows all three APIs as "Connected" (green checkmark)
- No input fields — keys are baked in
- Brief note: "Keys are hardcoded for single-user use"

### Components

**Layout.tsx:** Sticky nav, CourtEdge logo + "Playoffs" badge, nav links (Games, History), Settings icon, API status dots, OpenAIKeyModal trigger.

**ConfidenceMeter.tsx:** Horizontal bar 0-100. >= 70 = primary green (HIGH). 40-69 = accent yellow (MEDIUM). < 40 = destructive red (LOW). Glow shadow. Sizes: sm/md/lg.

**InjuryBadge.tsx:** Pill with status text. Out=red, Doubtful=orange, Day-to-Day/Questionable=yellow.

**OddsCard.tsx:** Bookmaker name, moneylines (+150/-170), spreads (-6.5/+6.5), over/under (220.5 o-115/u-105). Monospace numbers.

**OpenAIKeyModal.tsx:** Radix Dialog, input field, submit calls setOpenAIApiKey (no-op). Shows "Key already configured" message. Keep for nav compatibility.

### Hooks (useBackend.ts)

All React Query hooks:
```typescript
useTodayGames()                // staleTime: 60s, refetchInterval: 120s
useGameDetail(gameId)          // staleTime: Infinity, gcTime: 30min
usePlayerProps(gameId, home, away, enabled)   // enabled=false until tab opens
usePropsAIAnalysis(gameId, enabled)           // enabled=false until button click
useGameTotalsAnalysis(gameId, home, away, enabled)
useTotalsAIAnalysis(gameId, enabled)
useBetHistory()
useBetHistoryStats()
useUpdateBetOutcome()   // mutation
useIsOpenAIConfigured() useIsOddsApiConfigured() useApiStatus()
```

### Frontend Types (types/index.ts)

Re-exports all Candid types plus:
```typescript
formatMoneyline(ml: number | null): string   // +150 / -170 / —
formatSpread(spread: number | null): string  // +6.5 / -6.5 / —
getApiErrorMessage(error: ApiError): string
getConfidenceLevel(score: number): "high" | "medium" | "low"
```

### Design System

**index.css — OKLCH dark mode only:**
```css
:root {
  --background: oklch(0.13 0 0);
  --card: oklch(0.18 0 0);
  --border: oklch(0.28 0 0);
  --primary: oklch(0.65 0.18 145);    /* green */
  --accent: oklch(0.75 0.15 85);      /* yellow-green */
  --destructive: oklch(0.55 0.22 25); /* red */
  --muted: oklch(0.22 0 0);
  --foreground: oklch(0.92 0 0);
}
```

**Fonts:** JetBrains Mono (numbers/odds/stats), Figtree (body), Geist Mono (headers).

**Rules:** Dark only. Data-dense. Monospace for all numbers. Green=good/high confidence, Yellow=medium/caution, Red=bad/low confidence. Framer Motion for page transitions.

---

## Data Flows

### Flow 1: App loads
```
GamesPage mounts → useTodayGames() → backend.getTodaysGames()
→ cache check → miss → BDL GET /games?dates[]=2026-06-01&postseason=true
→ if empty → search ahead D+1 through D+14 (sequential)
→ find next game date → return GamesResponse { isUpcomingDate: true }
→ overlay Odds API (TTL 5min) → render game cards
```

### Flow 2: Investigate a game
```
Click "Investigate →" → /game/GAMEID?gameDate=2026-06-01
→ InvestigationPage mounts → useGameDetail() → base matchup data
→ Matchup tab renders (teams, injuries, base odds)
→ Props/Totals tabs show placeholder until opened
```

### Flow 3: Open Props tab
```
Click "Player Props" tab → propsEnabled = true → usePlayerProps() fires
→ sequential BDL calls (roster, player search x5, season avg x5, recent games x5, repeat for away team)
→ Odds API player prop lines → compute confidence → cache → render
```

### Flow 4: Analyze with AI
```
Click "Analyze with AI" → aiEnabled flips true → usePropsAIAnalysis() fires
→ getHistoryContext() → buildPropsAnalysisPrompt() → OpenAI gpt-4o-mini
→ render AI analysis card (stays rendered, no re-fetch)
```

---

## External API Reference

### Ball Don't Lie (BDL) API

Base URL: `https://api.balldontlie.io/v1`
Auth: `Authorization: Bearer 866f00d3-c11f-4b46-bf67-6e37accde2b9`
Rate limit: 100 req/min — enforce with sequential calls + exponential backoff.

| Endpoint | Use |
|---|---|
| GET /games?dates[]=YYYY-MM-DD&postseason=true | Playoff games for a date |
| GET /players?search=NAME | Find player by name |
| GET /season_averages?season=2025&player_ids[]=ID | Season stats (use 2025 for 2025-26) |
| GET /stats?player_ids[]=ID&per_page=5 | Recent game box scores |
| GET /games?team_ids[]=ID&per_page=10 | Recent team games |

Response: `{ "data": [...], "meta": { "per_page": 100, "next_cursor": null } }`

**Game object — use `full_name` for team display, never concatenate city + name:**
```json
{
  "id": 21713534,
  "date": "2026-06-01",
  "status": "Final",
  "home_team": {
    "full_name": "Oklahoma City Thunder",
    "abbreviation": "OKC",
    "city": "Oklahoma City"
  },
  "home_team_score": 112,
  "visitor_team_score": 105
}
```

### The Odds API

Base URL: `https://api.the-odds-api.com/v4`
Key: `6f6725d8b12b239c51bd1b404fd83c5e`

| Endpoint | Use |
|---|---|
| GET /sports/basketball_nba/odds/?apiKey=KEY&regions=us&markets=h2h,spreads,totals | All NBA odds |
| GET /sports/basketball_nba/events/{id}/odds/?apiKey=KEY&markets=player_points | Player prop lines |

Cache at TTL_5MIN (5 minutes).

### OpenAI API

URL: `https://api.openai.com/v1/chat/completions`
Auth: `Authorization: Bearer OPENAI_KEY`
Model: `gpt-4o-mini` — cheap, fast, sufficient
Temperature: 0.3, max_tokens: 600

System prompt template:
```
You are a sharp sports bettor analyst specializing in NBA playoffs. Analyze player props and game totals to find high-confidence opportunities, not marginal edges. You have a track record you learn from: [HISTORY_CONTEXT]. Be concise. State recommendation clearly with confidence (0-100) and top 3 reasons. If data does not support a confident bet, say "NO BET" and why.
```

Parse response from: `choices[0].message.content`

---

## Caching Layer

**Non-negotiable. Without this, the canister burns cycles and goes offline within hours.**

Every HTTP outcall on Internet Computer costs ~100,000-200,000 cycles. The investigation room fires 20+ calls without caching. The auto-top-up system cannot keep up.

Cache must be in **stable canister state** with pre/postupgrade hooks so it survives upgrades.

**Check-before-call pattern (required for every external call):**
```motoko
let cacheKey = "bdl_games_" # dateStr;
switch (Cache.get(cache, cacheKey, Cache.TTL_15MIN)) {
  case (?cachedData) { return parseBdlGames(cachedData, dateStr) };
  case null {
    let response = await bdlGetWithRetry(url);
    Cache.put(cache, cacheKey, response);
    return parseBdlGames(response, dateStr);
  };
};
```

---

## Self-Learning Bet History

When the AI analyzes a new matchup, it receives a summary of all past recommendations and outcomes. As you mark bets Won/Lost/Push over time, future AI recommendations incorporate those results.

- Stored in stable canister state — persists across upgrades, not localStorage
- `getHistoryContext()` returns last 20 bets as a formatted string injected into every AI prompt
- The feedback loop: save a bet → mark outcome → AI reads it next time → recommendations improve

---

## Design & UI Requirements

**Overall:** Dark mode only. Data-dense (this is a research tool, not a consumer app). Think Bloomberg Terminal meets modern sports analytics.

**Color meaning:**
- Green (primary): good signals, wins, high confidence, positive trends
- Yellow/amber (accent): medium confidence, caution, neutral
- Red (destructive): bad signals, losses, low confidence, injuries
- Gray (muted): secondary data, labels, inactive

**Typography:** Numbers/odds/stats always in JetBrains Mono. Labels in Figtree. Headers in Geist Mono.

**Game status indicators:**
- Live: pulsing green dot + "LIVE" text
- Upcoming (today): gray clock + time "8:00 PM ET"
- Upcoming (tomorrow or later): full date "Thu Jun 5 · 8:00 PM ET"
- Final: score displayed, no indicator

**Confidence meters:** Horizontal bar 0-100, glow shadow, label HIGH/MEDIUM/LOW.
**Odds:** Monospace. +150/-170 format. Discrepancies highlighted with yellow "Line gap: X" pill.
**Investigation room:** Fixed header with teams, tab bar below, scrollable tab content.
**Mobile:** Single column game cards, horizontal scroll for odds table, stacked player cards.

---

## Known Bugs — Never Repeat These

These ALL caused production failures in prior builds.

### BUG 1 (Most Critical): UTC Timezone Math
**NEVER subtract/add hours to UTC for API date strings.**
```
WRONG: let etSeconds = utcSeconds - 4 * 3600;  // caused "0 games" 6+ times
CORRECT: let dateStr = epochToDateStr(utcSeconds);  // raw UTC always
```
BDL accepts YYYY-MM-DD UTC. Subtracting 4 hours pushed date to yesterday → empty schedule.

### BUG 2: Hardcoded/Mock Game Data
Zero hardcoded team names, matchups, or fallback game data anywhere.
Prior builds had CLE vs IND, GSW vs MIN as fallbacks — months or years out of date.

### BUG 3: Response Byte-Size Guard
Never discard API responses below a size threshold. This silently threw away valid small responses.

### BUG 4: Silent Error Swallowing
Every catch branch must surface the real error:
```
WRONG: catch (e) { return [] };
CORRECT: catch (e) { throw #networkError ("BDL failed: " # Error.message(e)) };
```

### BUG 5: Key-Gated App Startup
Never block the games view behind an API key check. Keys are hardcoded — app loads unconditionally.

### BUG 6: Team Name Duplication
```
WRONG: city # " " # full_name → "Oklahoma City Oklahoma City Thunder"
CORRECT: full_name only → "Oklahoma City Thunder"
```

### BUG 7: ESPN as Primary Data Source
Do not use ESPN API for game schedules or scores. It returned wrong/stale data repeatedly.
BDL is the primary source. ESPN roster URLs are acceptable only for player name lookups in props.

### BUG 8: Parallel BDL API Calls
```
WRONG: let (r1, r2, r3) = await (call1(), call2(), call3());  // triggers 429
CORRECT: let r1 = await call1(); let r2 = await call2(); let r3 = await call3();
```

### BUG 9: OpenAI Auto-Fire
OpenAI must ONLY fire on explicit user button press. Auto-firing on investigation load caused canister out-of-cycles.

### BUG 10: Invalid Date Display
```typescript
WRONG: new Date(rawApiString)  // "Invalid Date" if format unexpected
CORRECT: const d = new Date(isoStr); return isNaN(d.getTime()) ? null : d;
```

### BUG 11: No Caching = Out of Cycles
Without caching, HTTP outcalls burn canister fuel within hours. The caching layer is non-negotiable.

### BUG 12: Dead-End "No Games" Screen
When today has no playoff games, always look ahead up to 14 days. Never show a dead-end screen.

---

## Acceptance Criteria

App is complete when ALL of these pass in the live preview:

1. Games load without any API key entry — open cold, games appear within 5 seconds
2. Correct teams shown — match the actual current NBA playoff schedule
3. Off-day: app shows next scheduled game date, not a dead-end screen
4. Game status correct — game 20 hours away shows Upcoming, not Live
5. Team names clean — "Oklahoma City Thunder" not doubled
6. Dates readable — tomorrow shows "Fri Jun 6 · 8:00 PM ET" not "Invalid Date"
7. Investigation room loads — clicking Investigate opens the detail view
8. Matchup tab shows teams, records, and at least basic odds
9. Props tab loads data only when opened (not on page mount)
10. Totals tab loads data only when opened (not on page mount)
11. "Analyze with AI" is manual — no AI call fires without explicit button click
12. Bet history persists — saved recommendation survives page refresh
13. Error messages are real — API failures show actual error text, not generic messages
14. No empty screens — every failure shows a message and Retry button
15. Caching works — second click on Investigate loads instantly from cache

---

## Build Commands

```bash
# Root
pnpm bindgen          # generate frontend bindings (run after any backend change)

# Frontend (from src/frontend/)
pnpm install --prefer-offline
pnpm typecheck
pnpm fix              # lint fix
pnpm build

# Backend (from src/backend/)
mops install
mops check --fix
mops build
```

---

*Spec generated from 29 build iterations. Every bug in the Known Bugs section was encountered in production. Follow this spec exactly for a clean ground-up rebuild.*
