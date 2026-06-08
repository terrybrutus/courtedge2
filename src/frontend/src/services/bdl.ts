import { CONFIG } from "./config";

const headers = () => ({ Authorization: `Bearer ${CONFIG.BDL_API_KEY}` });

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BdlTeam {
  id: number;
  abbreviation: string;
  city: string;
  conference: string;
  division: string;
  full_name: string;
  name: string;
}

export interface BdlGame {
  id: number;
  date: string;
  home_team: BdlTeam;
  visitor_team: BdlTeam;
  home_team_score: number;
  visitor_team_score: number;
  period: number;
  postseason: boolean;
  season: number;
  status: string;
  time: string | null;
}

export interface BdlPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  team: BdlTeam;
}

export interface BdlStat {
  id: number;
  game: { id: number };
  player: BdlPlayer;
  team: BdlTeam;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  min: string;
  fg_pct: number | null;
  fg3_pct: number | null;
  ft_pct: number | null;
}

export interface BdlSeasonAvg {
  player_id: number;
  season: number;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  min: string;
  games_played: number;
}

// ── API calls ─────────────────────────────────────────────────────────────────

export async function fetchGamesForDate(date: string): Promise<BdlGame[]> {
  const url = `${CONFIG.BDL_BASE}/games?dates[]=${date}&per_page=100`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`BDL games failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export async function fetchTeamLastNGames(
  teamId: number,
  season: number,
  n = 10,
): Promise<BdlGame[]> {
  const url = `${CONFIG.BDL_BASE}/games?team_ids[]=${teamId}&seasons[]=${season}&per_page=${n}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`BDL team games failed: ${res.status}`);
  const json = await res.json();
  return (json.data ?? []) as BdlGame[];
}

export async function fetchPlayerStatsForGame(
  gameId: number,
): Promise<BdlStat[]> {
  const url = `${CONFIG.BDL_BASE}/stats?game_ids[]=${gameId}&per_page=100`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`BDL stats failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export async function fetchSeasonAverages(
  playerIds: number[],
  season: number,
): Promise<BdlSeasonAvg[]> {
  const ids = playerIds.map((id) => `player_ids[]=${id}`).join("&");
  const url = `${CONFIG.BDL_BASE}/season_averages?season=${season}&${ids}`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`BDL season avgs failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

export async function fetchActivePlayers(teamId: number): Promise<BdlPlayer[]> {
  const url = `${CONFIG.BDL_BASE}/players/active?team_ids[]=${teamId}&per_page=50`;
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) throw new Error(`BDL players failed: ${res.status}`);
  const json = await res.json();
  return json.data ?? [];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// BDL status → our status type
export function parseBdlStatus(
  status: string,
): "scheduled" | "inProgress" | "final" {
  if (!status) return "scheduled";
  const s = status.toLowerCase();
  if (s === "final" || s.startsWith("final")) return "final";
  if (s.includes("t") && s.includes("z") && s.length >= 19) return "scheduled"; // ISO UTC
  if (s.includes("halftime") || s.match(/^\d+:\d+\s*(q\d|ot)/i)) return "inProgress";
  if (s.match(/^q\d|^\d+(st|nd|rd|th)/i)) return "inProgress";
  return "scheduled";
}

// BDL ISO UTC timestamp → "8:30 PM ET" display
export function bdlStatusToDisplayTime(status: string): string {
  if (!status) return "TBD";
  // ISO UTC string like "2026-06-09T00:30:00Z"
  if (status.includes("T") && status.includes("Z") && status.length >= 19) {
    const d = new Date(status);
    if (Number.isNaN(d.getTime())) return status;
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    });
  }
  // Already a display string like "7:30 pm ET"
  if (status.toLowerCase().includes("et")) return status;
  return status;
}

// BDL ISO UTC timestamp → "YYYY-MM-DD" in ET
export function bdlStatusToEtDate(status: string, fallbackDate: string): string {
  if (status.includes("T") && status.includes("Z") && status.length >= 19) {
    const d = new Date(status);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    }
  }
  return fallbackDate;
}
