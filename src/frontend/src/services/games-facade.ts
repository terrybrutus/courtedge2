// Maps BDL API data into the app's existing Game/GameInvestigation types.
// Replaces all canister HTTP outcalls with direct browser fetches.

import type {
  Game,
  GameInvestigation,
  GameTotal,
  OddsLine,
  PlayerPropsAnalysis,
  TeamStats,
} from "@/types";
import {
  type BdlGame,
  bdlStatusToDisplayTime,
  bdlStatusToEtDate,
  fetchGamesForDate,
  fetchTeamLastNGames,
  fetchPlayerStatsForGame,
  fetchSeasonAverages,
  fetchActivePlayers,
  parseBdlStatus,
} from "./bdl";
import { fetchOdds, parseOddsEvent } from "./odds";
import { analyzeNbaEdge } from "./analysis";

// Re-export so hooks can import from one place
export { fetchGamesForDate };

// ── BDL team ID map ───────────────────────────────────────────────────────────
// Maps BDL team ID → win/loss record (updated via season stats — approximate)
const TEAM_RECORDS: Record<number, string> = {};

// ── BDL Game → App Game ───────────────────────────────────────────────────────

export function buildGameFromBdl(g: BdlGame): Game {
  const statusRaw = g.status ?? "";
  const status = parseBdlStatus(statusRaw);
  const etDate = bdlStatusToEtDate(statusRaw, g.date);
  const displayTime = bdlStatusToDisplayTime(statusRaw);
  const isLive = status === "inProgress";
  const isFinal = status === "final";

  let gameTimeStr: string;
  if (statusRaw.includes("T") && statusRaw.includes("Z")) {
    gameTimeStr = statusRaw; // ISO UTC — use directly
  } else if (isLive || isFinal) {
    gameTimeStr = `${etDate}T00:00:00Z`;
  } else {
    gameTimeStr = `${etDate}T00:00:00Z`;
  }

  return {
    id: String(g.id),
    status: status as unknown as Game["status"],
    venue: "", // BDL basic schedule doesn't include venue in v1
    displayTime,
    gameTime: gameTimeStr,
    homeTeam: {
      id: String(g.home_team.id),
      city: g.home_team.city,
      name: g.home_team.name,
      abbreviation: g.home_team.abbreviation,
      record: TEAM_RECORDS[g.home_team.id] ?? "",
    },
    awayTeam: {
      id: String(g.visitor_team.id),
      city: g.visitor_team.city,
      name: g.visitor_team.name,
      abbreviation: g.visitor_team.abbreviation,
      record: TEAM_RECORDS[g.visitor_team.id] ?? "",
    },
    odds: [],
    series: g.postseason ? "Playoffs" : undefined,
  };
}

// ── Full game investigation ───────────────────────────────────────────────────

export async function buildInvestigationFromBdl(
  gameId: string,
  gameDate: string,
): Promise<GameInvestigation> {
  // 1. Find the game from BDL
  const games = await fetchGamesForDate(gameDate);
  const bdlGame = games.find((g) => String(g.id) === gameId);
  if (!bdlGame)
    throw new Error(
      `Game ${gameId} not found in BDL games for ${gameDate}`,
    );

  const game = buildGameFromBdl(bdlGame);
  const homeId = bdlGame.home_team.id;
  const awayId = bdlGame.visitor_team.id;
  const season = bdlGame.season;

  // 2. Fetch team recent games + odds in parallel
  const [homeGames, awayGames, oddsEvents] = await Promise.allSettled([
    fetchTeamLastNGames(homeId, season, 10),
    fetchTeamLastNGames(awayId, season, 10),
    fetchOdds("basketball_nba"),
  ]);

  const homeRecent = homeGames.status === "fulfilled" ? homeGames.value : [];
  const awayRecent = awayGames.status === "fulfilled" ? awayGames.value : [];
  const odds =
    oddsEvents.status === "fulfilled" ? oddsEvents.value : [];

  // 3. Find matching odds event
  const oddsEvent = odds.find(
    (e) =>
      e.home_team
        .toLowerCase()
        .includes(bdlGame.home_team.name.toLowerCase()) ||
      e.away_team
        .toLowerCase()
        .includes(bdlGame.visitor_team.name.toLowerCase()),
  );
  const parsedOdds = oddsEvent ? parseOddsEvent(oddsEvent) : null;

  const oddsLines: OddsLine[] = oddsEvent
    ? oddsEvent.bookmakers.slice(0, 3).map((bm) => {
        const p = parseOddsEvent({ ...oddsEvent, bookmakers: [bm] });
        return {
          bookmaker: bm.title,
          homeSpread: p.homeSpread ?? undefined,
          awaySpread: p.awaySpread ?? undefined,
          homeSpreadOdds: p.homeSpreadOdds != null ? BigInt(p.homeSpreadOdds) : undefined,
          awaySpreadOdds: p.awaySpreadOdds != null ? BigInt(p.awaySpreadOdds) : undefined,
          overUnder: p.total ?? undefined,
          overOdds: p.overOdds != null ? BigInt(p.overOdds) : undefined,
          underOdds: p.underOdds != null ? BigInt(p.underOdds) : undefined,
          homeMoneyline: p.homeML != null ? BigInt(p.homeML) : undefined,
          awayMoneyline: p.awayML != null ? BigInt(p.awayML) : undefined,
          updatedAt: new Date().toISOString(),
        };
      })
    : [];

  // 4. Compute rest days (days since last game)
  const homeRestDays = computeRestDays(homeRecent, gameDate);
  const awayRestDays = computeRestDays(awayRecent, gameDate);

  // 5. Build team stats
  const homeStats = buildTeamStats(
    String(homeId),
    homeRecent,
    homeRestDays,
  );
  const awayStats = buildTeamStats(
    String(awayId),
    awayRecent,
    awayRestDays,
  );

  // 6. Edge analysis (signal stacking)
  const edgeInputs = {
    gameId,
    homeTeam: game.homeTeam.name,
    awayTeam: game.awayTeam.name,
    homeRestDays,
    awayRestDays,
    openSpread: parsedOdds?.homeSpread ?? null,
    currentSpread: parsedOdds?.homeSpread ?? null,
    openTotal: parsedOdds?.total ?? null,
    currentTotal: parsedOdds?.total ?? null,
    homeML: parsedOdds?.homeML ?? null,
    awayML: parsedOdds?.awayML ?? null,
    refereeName: null,
    refereeOverRate: null,
    refereeFoulRate: null,
    isPlayoffs: bdlGame.postseason,
  };
  const edge = analyzeNbaEdge(edgeInputs);

  // Map edge signals to SituationalAngles for display
  const situationalAngles = edge.signals.map((s) => ({
    name: s.category,
    description: s.description,
    edge: s.direction,
    confidence: BigInt(s.confidence),
  }));

  const restAdvantage =
    Math.abs(homeRestDays - awayRestDays) >= 1
      ? {
          homeRestDays: BigInt(homeRestDays),
          awayRestDays: BigInt(awayRestDays),
          advantage:
            homeRestDays > awayRestDays
              ? "HOME"
              : homeRestDays < awayRestDays
                ? "AWAY"
                : "EVEN",
          impactDescription:
            homeRestDays > awayRestDays
              ? `${game.homeTeam.name} has ${homeRestDays - awayRestDays} extra day(s) of rest`
              : `${game.awayTeam.name} has ${awayRestDays - homeRestDays} extra day(s) of rest`,
        }
      : undefined;

  return {
    game: { ...game, odds: oddsLines },
    odds: oddsLines,
    injuries: [],
    discrepancies: [],
    homeTeamStats: homeStats,
    awayTeamStats: awayStats,
    situationalAngles,
    restAdvantage,
    lineMovement: undefined,
    refereeProfile: undefined,
  };
}

// ── Player props (BDL active players + season avgs) ───────────────────────────

export async function fetchActivePlayersForGame(
  gameId: string,
): Promise<PlayerPropsAnalysis | null> {
  // Get current game to find team IDs
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  const games = await fetchGamesForDate(today);
  const bdlGame = games.find((g) => String(g.id) === gameId);
  if (!bdlGame) return null;

  const [homePlayers, awayPlayers] = await Promise.all([
    fetchActivePlayers(bdlGame.home_team.id),
    fetchActivePlayers(bdlGame.visitor_team.id),
  ]);

  const allPlayers = [...homePlayers, ...awayPlayers].slice(0, 12);
  const playerIds = allPlayers.map((p) => p.id);
  const avgs = await fetchSeasonAverages(playerIds, bdlGame.season);
  const avgMap = new Map(avgs.map((a) => [a.player_id, a]));

  const props = allPlayers.map((p) => {
    const avg = avgMap.get(p.id);
    return {
      player: {
        id: String(p.id),
        name: `${p.first_name} ${p.last_name}`,
        team: p.team.abbreviation,
        jerseyNumber: "",
        injuryStatus: "Active",
        position: p.position,
      },
      seasonAvgPoints: avg?.pts ?? 0,
      seasonAvgMinutes: parseFloat(avg?.min ?? "0") || 0,
      seasonUsageRate: 0,
      backToBack: false,
      recentGames: [],
      propLines: avg
        ? [
            {
              statType: "points",
              line: avg.pts,
              overOdds: BigInt(-110),
              underOdds: BigInt(-110),
              recommendation: "PASS",
              edgeScore: BigInt(50),
            },
            {
              statType: "rebounds",
              line: avg.reb,
              overOdds: BigInt(-110),
              underOdds: BigInt(-110),
              recommendation: "PASS",
              edgeScore: BigInt(50),
            },
            {
              statType: "assists",
              line: avg.ast,
              overOdds: BigInt(-110),
              underOdds: BigInt(-110),
              recommendation: "PASS",
              edgeScore: BigInt(50),
            },
          ]
        : [],
    };
  });

  return {
    gameId,
    players: props,
    analysisGeneratedAt: new Date().toISOString(),
  };
}

// ── Game totals (BDL team scoring data) ──────────────────────────────────────

export async function fetchSeasonAveragesForGame(
  gameId: string,
  homeTeamName: string,
  awayTeamName: string,
): Promise<GameTotal | null> {
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  const games = await fetchGamesForDate(today);
  const bdlGame = games.find((g) => String(g.id) === gameId);
  if (!bdlGame) return null;

  const season = bdlGame.season;
  const [homeGames, awayGames] = await Promise.all([
    fetchTeamLastNGames(bdlGame.home_team.id, season, 10),
    fetchTeamLastNGames(bdlGame.visitor_team.id, season, 10),
  ]);

  const homeScores = homeGames
    .filter((g) => g.home_team_score > 0 || g.visitor_team_score > 0)
    .map((g) =>
      g.home_team.id === bdlGame.home_team.id
        ? g.home_team_score
        : g.visitor_team_score,
    );
  const awayScores = awayGames
    .filter((g) => g.home_team_score > 0 || g.visitor_team_score > 0)
    .map((g) =>
      g.visitor_team.id === bdlGame.visitor_team.id
        ? g.visitor_team_score
        : g.home_team_score,
    );

  const homePPG =
    homeScores.length > 0
      ? homeScores.reduce((a, b) => a + b, 0) / homeScores.length
      : 110;
  const awayPPG =
    awayScores.length > 0
      ? awayScores.reduce((a, b) => a + b, 0) / awayScores.length
      : 110;
  const projectedTotal = Math.round((homePPG + awayPPG) * 10) / 10;

  const homeTrends = homeGames.slice(0, 5).map((g) => {
    const total = g.home_team_score + g.visitor_team_score;
    const teamScore =
      g.home_team.id === bdlGame.home_team.id
        ? g.home_team_score
        : g.visitor_team_score;
    return {
      date: g.date,
      opponent:
        g.home_team.id === bdlGame.home_team.id
          ? g.visitor_team.abbreviation
          : g.home_team.abbreviation,
      gameTotal: total,
      teamTotal: teamScore,
      overUnder: 220,
      result: total > 220 ? "OVER" : "UNDER",
    };
  });

  const awayTrends = awayGames.slice(0, 5).map((g) => {
    const total = g.home_team_score + g.visitor_team_score;
    const teamScore =
      g.visitor_team.id === bdlGame.visitor_team.id
        ? g.visitor_team_score
        : g.home_team_score;
    return {
      date: g.date,
      opponent:
        g.visitor_team.id === bdlGame.visitor_team.id
          ? g.home_team.abbreviation
          : g.visitor_team.abbreviation,
      gameTotal: total,
      teamTotal: teamScore,
      overUnder: 220,
      result: total > 220 ? "OVER" : "UNDER",
    };
  });

  return {
    gameId,
    homePace: {
      teamId: String(bdlGame.home_team.id),
      pace: 98,
      offensiveEfficiency: homePPG,
      defensiveEfficiency: 110,
      avgPointsFor: homePPG,
      avgPointsAgainst: 110,
      last5Avg:
        homeScores.slice(0, 5).reduce((a, b) => a + b, 0) /
          Math.max(homeScores.slice(0, 5).length, 1),
    },
    awayPace: {
      teamId: String(bdlGame.visitor_team.id),
      pace: 98,
      offensiveEfficiency: awayPPG,
      defensiveEfficiency: 110,
      avgPointsFor: awayPPG,
      avgPointsAgainst: 110,
      last5Avg:
        awayScores.slice(0, 5).reduce((a, b) => a + b, 0) /
          Math.max(awayScores.slice(0, 5).length, 1),
    },
    impliedTotal: null,
    projectedTotal,
    recentTrends: [...homeTrends, ...awayTrends],
    refereeProfile: undefined,
    injuryImpact: "",
    confidenceReport: undefined,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeRestDays(recentGames: BdlGame[], gameDate: string): number {
  const finals = recentGames
    .filter(
      (g) =>
        (g.status ?? "").toLowerCase().startsWith("final") &&
        g.date < gameDate,
    )
    .sort((a, b) => b.date.localeCompare(a.date));

  if (finals.length === 0) return 3;
  const lastGame = new Date(finals[0].date);
  const target = new Date(gameDate);
  const diff = Math.round(
    (target.getTime() - lastGame.getTime()) / 86400000,
  );
  return Math.max(0, diff - 1);
}

function buildTeamStats(
  teamId: string,
  recentGames: BdlGame[],
  restDays: number,
): TeamStats {
  const finals = recentGames.filter(
    (g) =>
      (g.status ?? "").toLowerCase().startsWith("final") &&
      (g.home_team_score > 0 || g.visitor_team_score > 0),
  );
  const scores = finals.slice(0, 5).map((g) => {
    const isHome = String(g.home_team.id) === teamId;
    return isHome ? g.home_team_score : g.visitor_team_score;
  });
  const ppg =
    scores.length > 0
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : 110;

  return {
    teamId,
    restDays: BigInt(restDays),
    recentForm: scores.map((s) => BigInt(s)),
    homeAwayRecord: "",
    pointsPerGame: ppg,
    offensiveRating: ppg,
    defensiveRating: 110,
    pace: 98,
  };
}
