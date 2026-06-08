import { CONFIG } from "./config";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface MlbTeam {
  id: number;
  name: string;
  abbreviation: string;
  locationName: string;
  teamName: string;
}

export interface MlbPitcher {
  id: number;
  fullName: string;
  primaryPosition?: { abbreviation: string };
}

export interface MlbPitcherStats {
  era: number | null;
  whip: number | null;
  strikeoutsPer9: number | null;
  walksPer9: number | null;
  inningsPitched: number | null;
  wins: number | null;
  losses: number | null;
  homeEra: number | null;
  awayEra: number | null;
  lastStartDate: string | null;
  daysSinceLastStart: number | null;
}

export interface MlbGame {
  gamePk: number;
  gameDate: string;            // ISO UTC
  status: { abstractGameState: string; detailedState: string };
  teams: {
    home: { team: MlbTeam; score?: number; probablePitcher?: MlbPitcher };
    away: { team: MlbTeam; score?: number; probablePitcher?: MlbPitcher };
  };
  venue: { id: number; name: string };
  linescore?: { currentInning?: number; inningHalf?: string };
}

export interface MlbUmpire {
  id: number;
  fullName: string;
}

export interface ParkFactor {
  runFactor: number;   // 100 = neutral, >100 = hitter-friendly
  hrFactor: number;
  description: string;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchMlbGamesForDate(date: string): Promise<MlbGame[]> {
  // date: "YYYY-MM-DD"
  const url = `${CONFIG.MLB_BASE}/schedule?sportId=1&date=${date}&hydrate=team,linescore,probablePitcher,status,venue`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB schedule failed: ${res.status}`);
  const json = await res.json();
  const dates = json.dates ?? [];
  return dates.flatMap((d: { games: MlbGame[] }) => d.games ?? []);
}

export async function fetchMlbPitcherStats(
  pitcherId: number,
  season: number,
): Promise<MlbPitcherStats> {
  const url =
    `${CONFIG.MLB_BASE}/people/${pitcherId}/stats` +
    `?stats=season,homeAndAway&season=${season}&group=pitching`;
  const res = await fetch(url);
  if (!res.ok) return emptyPitcherStats();

  const json = await res.json();
  const stats = json.stats ?? [];

  const season_stat = stats.find(
    (s: { type: { displayName: string } }) => s.type?.displayName === "season",
  )?.splits?.[0]?.stat;
  const home_stat = stats
    .find(
      (s: { type: { displayName: string } }) =>
        s.type?.displayName === "homeAndAway",
    )
    ?.splits?.find(
      (s: { split: { description: string } }) =>
        s.split?.description === "Home",
    )?.stat;
  const away_stat = stats
    .find(
      (s: { type: { displayName: string } }) =>
        s.type?.displayName === "homeAndAway",
    )
    ?.splits?.find(
      (s: { split: { description: string } }) =>
        s.split?.description === "Away",
    )?.stat;

  return {
    era: season_stat?.era ? parseFloat(season_stat.era) : null,
    whip: season_stat?.whip ? parseFloat(season_stat.whip) : null,
    strikeoutsPer9: season_stat?.strikeoutsPer9Inn
      ? parseFloat(season_stat.strikeoutsPer9Inn)
      : null,
    walksPer9: season_stat?.walksPer9Inn
      ? parseFloat(season_stat.walksPer9Inn)
      : null,
    inningsPitched: season_stat?.inningsPitched
      ? parseFloat(season_stat.inningsPitched)
      : null,
    wins: season_stat?.wins ?? null,
    losses: season_stat?.losses ?? null,
    homeEra: home_stat?.era ? parseFloat(home_stat.era) : null,
    awayEra: away_stat?.era ? parseFloat(away_stat.era) : null,
    lastStartDate: null,
    daysSinceLastStart: null,
  };
}

export async function fetchUmpireForGame(
  gamePk: number,
): Promise<MlbUmpire | null> {
  const url = `${CONFIG.MLB_BASE}/game/${gamePk}/boxscore`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  const officials: Array<{
    official: { id: number; fullName: string };
    officialType: string;
  }> = json.officials ?? [];
  const hp = officials.find((o) => o.officialType === "Home Plate");
  return hp ? { id: hp.official.id, fullName: hp.official.fullName } : null;
}

export async function fetchBullpenUsage(
  teamId: number,
  season: number,
): Promise<{ fatigueLevel: "HIGH" | "MEDIUM" | "LOW"; detail: string }> {
  // Fetch team pitching stats for last 3 days to estimate bullpen fatigue
  const today = new Date();
  const endDate = today.toLocaleDateString("en-CA");
  const startDate = new Date(today.getTime() - 3 * 86400000).toLocaleDateString(
    "en-CA",
  );
  const url =
    `${CONFIG.MLB_BASE}/schedule?sportId=1&teamId=${teamId}` +
    `&startDate=${startDate}&endDate=${endDate}&hydrate=linescore`;
  const res = await fetch(url);
  if (!res.ok) return { fatigueLevel: "LOW", detail: "Usage data unavailable" };
  const json = await res.json();
  const dates = json.dates ?? [];
  const gamesPlayed = dates.reduce(
    (acc: number, d: { games: MlbGame[] }) =>
      acc +
      (d.games ?? []).filter(
        (g) => g.status.abstractGameState === "Final",
      ).length,
    0,
  );

  if (gamesPlayed >= 3)
    return {
      fatigueLevel: "HIGH",
      detail: `Played ${gamesPlayed} games in last 3 days`,
    };
  if (gamesPlayed === 2)
    return {
      fatigueLevel: "MEDIUM",
      detail: `Played ${gamesPlayed} games in last 3 days`,
    };
  return {
    fatigueLevel: "LOW",
    detail: `Only ${gamesPlayed} game(s) in last 3 days`,
  };
}

// ── Park factors (static — updated each offseason) ───────────────────────────
// Scale: 100 = neutral. Source: multi-year composite.
const PARK_FACTORS: Record<number, ParkFactor> = {
  2  : { runFactor: 112, hrFactor: 118, description: "Coors Field — extreme hitter park, altitude boosts carry" },
  15 : { runFactor: 108, hrFactor: 114, description: "Great American Ball Park — short porch in RF" },
  4  : { runFactor: 106, hrFactor: 110, description: "Fenway Park — Green Monster creates extra hits" },
  10 : { runFactor: 104, hrFactor: 108, description: "Wrigley Field — wind-dependent, plays big with wind out" },
  1  : { runFactor: 98,  hrFactor: 95,  description: "Oriole Park — moderate pitcher-friendly dimensions" },
  22 : { runFactor: 96,  hrFactor: 92,  description: "Petco Park — spacious outfield, marine layer suppresses" },
  31 : { runFactor: 95,  hrFactor: 90,  description: "Oracle Park — massive foul territory, marine air" },
  7  : { runFactor: 94,  hrFactor: 91,  description: "Dodger Stadium — consistent pitcher-friendly environment" },
  32 : { runFactor: 93,  hrFactor: 88,  description: "T-Mobile Park — marine air, deep fences" },
};

export function getParkFactor(venueId: number): ParkFactor {
  return (
    PARK_FACTORS[venueId] ?? {
      runFactor: 100,
      hrFactor: 100,
      description: "Neutral park factors",
    }
  );
}

// ── Umpire tendencies (static — updated periodically) ────────────────────────
// k_pct: strikeout rate when behind plate vs league avg. over_rate: over hit% above .500
interface UmpireTendency {
  name: string;
  kZoneSize: "LARGE" | "AVERAGE" | "SMALL"; // larger zone → more Ks → lower scoring
  overRate: number; // % of games going over (50 = neutral)
  tendency: string;
}

const UMPIRE_TENDENCIES: Record<number, UmpireTendency> = {
  427:  { name: "Angel Hernandez",  kZoneSize: "SMALL",   overRate: 54, tendency: "Small zone, high scoring games, over lean" },
  354:  { name: "CB Bucknor",       kZoneSize: "SMALL",   overRate: 55, tendency: "Below-average strike zone, suppresses Ks, hitter-friendly" },
  68:   { name: "Joe West",         kZoneSize: "LARGE",   overRate: 45, tendency: "Expansive zone, pitchers benefit, under lean" },
  551:  { name: "Dan Bellino",      kZoneSize: "LARGE",   overRate: 46, tendency: "Wide zone, quick games, under lean" },
  514:  { name: "Adrian Johnson",   kZoneSize: "AVERAGE", overRate: 51, tendency: "Near neutral, slight over tendency" },
  583:  { name: "Nic Lentz",        kZoneSize: "LARGE",   overRate: 44, tendency: "Pitcher-friendly zone" },
};

export function getUmpireTendency(umpireId: number): UmpireTendency | null {
  return UMPIRE_TENDENCIES[umpireId] ?? null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyPitcherStats(): MlbPitcherStats {
  return {
    era: null, whip: null, strikeoutsPer9: null, walksPer9: null,
    inningsPitched: null, wins: null, losses: null,
    homeEra: null, awayEra: null, lastStartDate: null, daysSinceLastStart: null,
  };
}

export function mlbGameStatus(
  game: MlbGame,
): "scheduled" | "inProgress" | "final" {
  const state = game.status.abstractGameState;
  if (state === "Final") return "final";
  if (state === "Live") return "inProgress";
  return "scheduled";
}

export function mlbDisplayTime(game: MlbGame): string {
  const d = new Date(game.gameDate);
  if (Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}
