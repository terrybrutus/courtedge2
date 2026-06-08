import { CONFIG } from "./config";

export interface OddsMarket {
  key: string;
  last_update: string;
  outcomes: Array<{ name: string; price: number; point?: number }>;
}

export interface OddsBookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}

export interface OddsEvent {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

export interface ParsedOdds {
  homeSpread: number | null;
  awaySpread: number | null;
  homeSpreadOdds: number | null;
  awaySpreadOdds: number | null;
  total: number | null;
  overOdds: number | null;
  underOdds: number | null;
  homeML: number | null;
  awayML: number | null;
}

export async function fetchOdds(
  sportKey: "basketball_nba" | "baseball_mlb",
  markets = "spreads,totals,h2h",
): Promise<OddsEvent[]> {
  const url =
    `${CONFIG.ODDS_BASE}/sports/${sportKey}/odds` +
    `?apiKey=${CONFIG.ODDS_API_KEY}&regions=us&markets=${markets}&oddsFormat=american`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Odds API failed: ${res.status}`);
  return res.json();
}

// Extract clean odds from a single event, preferring DraftKings then FanDuel then first available
export function parseOddsEvent(event: OddsEvent): ParsedOdds {
  const preferred = ["draftkings", "fanduel", "betmgm", "williamhill_us"];
  const sorted = [...event.bookmakers].sort((a, b) => {
    const ai = preferred.indexOf(a.key);
    const bi = preferred.indexOf(b.key);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  let homeSpread: number | null = null;
  let awaySpread: number | null = null;
  let homeSpreadOdds: number | null = null;
  let awaySpreadOdds: number | null = null;
  let total: number | null = null;
  let overOdds: number | null = null;
  let underOdds: number | null = null;
  let homeML: number | null = null;
  let awayML: number | null = null;

  for (const bm of sorted) {
    for (const market of bm.markets) {
      if (market.key === "spreads" && homeSpread === null) {
        for (const o of market.outcomes) {
          if (o.name === event.home_team) {
            homeSpread = o.point ?? null;
            homeSpreadOdds = o.price;
          } else {
            awaySpread = o.point ?? null;
            awaySpreadOdds = o.price;
          }
        }
      }
      if (market.key === "totals" && total === null) {
        for (const o of market.outcomes) {
          if (o.name === "Over") { total = o.point ?? null; overOdds = o.price; }
          else { underOdds = o.price; }
        }
      }
      if (market.key === "h2h" && homeML === null) {
        for (const o of market.outcomes) {
          if (o.name === event.home_team) homeML = o.price;
          else awayML = o.price;
        }
      }
    }
    if (homeSpread !== null && total !== null && homeML !== null) break;
  }

  return { homeSpread, awaySpread, homeSpreadOdds, awaySpreadOdds, total, overOdds, underOdds, homeML, awayML };
}

export function formatAmerican(odds: number | null): string {
  if (odds === null) return "N/A";
  return odds > 0 ? `+${odds}` : `${odds}`;
}
