import type { backendInterface } from "../backend";
import { GameStatus } from "../backend";

export const mockBackend: backendInterface = {
  getTodaysGames: async () => ({
    __kind__: "ok",
    ok: {
      games: [
        {
          id: "okc-spurs-game4-2026",
          status: GameStatus.scheduled,
          venue: "Paycom Center",
          series: "OKC leads 2-1",
          gameTime: "2026-05-29T20:00:00Z",
          displayTime: "8:00 PM ET",
          odds: [],
          homeTeam: {
            id: "okc",
            city: "Oklahoma City",
            name: "Thunder",
            abbreviation: "OKC",
            record: "60-22",
          },
          awayTeam: {
            id: "sas",
            city: "San Antonio",
            name: "Spurs",
            abbreviation: "SAS",
            record: "45-37",
          },
        },
      ],
      gamesDate: "2026-05-29",
      isUpcomingDate: false,
    },
  }),

  getGameInvestigation: async (gameId: string) => ({
    __kind__: "ok",
    ok: {
      game: {
        id: gameId,
        status: GameStatus.scheduled,
        venue: "Paycom Center",
        gameTime: "2026-05-24T20:00:00Z",
        displayTime: "8:00 PM ET",
        odds: [],
        series: "OKC leads 2-1",
        homeTeam: {
          id: "okc",
          city: "Oklahoma City",
          name: "Thunder",
          abbreviation: "OKC",
          record: "60-22",
        },
        awayTeam: {
          id: "sas",
          city: "San Antonio",
          name: "Spurs",
          abbreviation: "SAS",
          record: "45-37",
        },
      },
      odds: [
        {
          bookmaker: "DraftKings",
          homeSpread: -6.5,
          homeSpreadOdds: BigInt(-110),
          awaySpread: 6.5,
          awaySpreadOdds: BigInt(-110),
          homeMoneyline: BigInt(-240),
          awayMoneyline: BigInt(200),
          overUnder: 224.5,
          overOdds: BigInt(-110),
          underOdds: BigInt(-110),
          updatedAt: "2026-05-24T18:00:00Z",
        },
      ],
      injuries: [
        {
          playerId: "p1",
          playerName: "Victor Wembanyama",
          team: "SAS",
          status: "Questionable",
          description: "Left ankle soreness",
          updatedAt: "2026-05-24T10:00:00Z",
        },
      ],
      discrepancies: [
        {
          betType: "Spread",
          minValue: -6.5,
          minBook: "DraftKings",
          maxValue: -5.5,
          maxBook: "FanDuel",
          gap: 1.0,
        },
      ],
      homeTeamStats: {
        teamId: "okc",
        restDays: BigInt(2),
        recentForm: [BigInt(1), BigInt(1), BigInt(0), BigInt(1), BigInt(1)],
        homeAwayRecord: "32-9 Home",
        pace: 98.4,
        offensiveRating: 118.2,
        defensiveRating: 108.1,
        pointsPerGame: 115.3,
      },
      awayTeamStats: {
        teamId: "sas",
        restDays: BigInt(2),
        recentForm: [BigInt(0), BigInt(1), BigInt(1), BigInt(0), BigInt(1)],
        homeAwayRecord: "20-21 Away",
        pace: 96.1,
        offensiveRating: 110.5,
        defensiveRating: 112.7,
        pointsPerGame: 108.9,
      },
      lineMovement: {
        openingSpread: -5.0,
        currentSpread: -6.5,
        spreadMove: -1.5,
        openingTotal: 226.5,
        currentTotal: 224.5,
        totalMove: -2.0,
        steamAlert: true,
        sharpSide: "HOME",
      },
      restAdvantage: {
        homeRestDays: BigInt(2),
        awayRestDays: BigInt(1),
        advantage: "HOME",
        impactDescription: "OKC has a 1-day rest edge — moderate ATS lean.",
      },
      situationalAngles: [
        {
          name: "Home Underdog",
          description: "OKC is a home underdog (+6.5). Home dogs cover ATS at 54%.",
          edge: "LEAN OKC +ATS",
          confidence: BigInt(54),
        },
        {
          name: "Away Team Back-to-Back",
          description: "SAS plays on zero days rest (road B2B). Road B2B teams are 44% ATS and fuel UNDER.",
          edge: "FADE SAS — lean home ATS and UNDER",
          confidence: BigInt(60),
        },
      ],
      refereeProfile: {
        name: "Scott Foster",
        avgFoulsPerGame: 42.1,
        avgFreeThrowsPerGame: 28.3,
        overRate: 0.54,
        tendency: "Over lean — high FT rate inflates totals. Historically favors home teams in close calls.",
      },
    },
  }),

  getPlayerPropsAnalysis: async (gameId: string) => ({
    __kind__: "ok",
    ok: {
      gameId,
      analysisGeneratedAt: "2026-05-24T18:00:00Z",
      players: [
        {
          player: {
            id: "shai",
            name: "Shai Gilgeous-Alexander",
            team: "OKC",
            jerseyNumber: "2",
            injuryStatus: "Active",
            position: "G",
          },
          seasonAvgPoints: 32.7,
          seasonUsageRate: 31.4,
          seasonAvgMinutes: 35.2,
          matchupDefRating: 112.8,
          backToBack: false,
          homeAwaySplit: 34.1,
          propLines: [
            {
              bookmaker: "DraftKings",
              line: 32.5,
              overOdds: BigInt(-115),
              underOdds: BigInt(-105),
            },
          ],
          recentGames: [
            { date: "2026-05-22", opponent: "SAS", points: 38, minutes: 37, usageRate: 33.1, fieldGoalAttempts: 18 },
            { date: "2026-05-20", opponent: "SAS", points: 29, minutes: 34, usageRate: 30.2, fieldGoalAttempts: 15 },
            { date: "2026-05-18", opponent: "DAL", points: 41, minutes: 38, usageRate: 35.0, fieldGoalAttempts: 21 },
          ],
          confidenceReport: {
            score: BigInt(78),
            grade: "B+",
            recommendation: "Over 32.5 Points",
            projectedPoints: 34.2,
            reasoning: "SGA has been dominant at home this postseason, averaging 37.2 PPG vs SAS. The Spurs are missing a key defender, opening driving lanes.",
            keyFactors: ["Home court advantage", "Favorable matchup vs SAS", "High usage rate", "3+ rest days"],
          },
        },
      ],
    },
  }),

  getGameTotalsAnalysis: async (gameId: string, _homeTeamName: string, _awayTeamName: string) => ({
    __kind__: "ok",
    ok: {
      gameId,
      impliedTotal: 224.5,
      projectedTotal: 221.3,
      injuryImpact: "Wembanyama questionable — if out, SAS offense down ~8-10 PPG",
      homePace: {
        teamId: "okc",
        pace: 98.4,
        offensiveEfficiency: 118.2,
        defensiveEfficiency: 108.1,
        avgPointsFor: 115.3,
        avgPointsAgainst: 108.1,
        last5Avg: 113.4,
      },
      awayPace: {
        teamId: "sas",
        pace: 96.1,
        offensiveEfficiency: 110.5,
        defensiveEfficiency: 112.7,
        avgPointsFor: 108.9,
        avgPointsAgainst: 112.3,
        last5Avg: 106.2,
      },
      refereeProfile: {
        name: "Scott Foster",
        avgFoulsPerGame: 42.1,
        avgFreeThrowsPerGame: 28.3,
        overRate: 0.54,
        tendency: "Over lean — high FT rate inflates totals.",
      },
      recentTrends: [
        { date: "2026-05-22", opponent: "SAS", teamTotal: 112, gameTotal: 218, overUnder: 224, result: "Under" },
        { date: "2026-05-20", opponent: "SAS", teamTotal: 108, gameTotal: 210, overUnder: 222, result: "Under" },
      ],
      confidenceReport: {
        score: BigInt(71),
        grade: "B",
        recommendation: "Under 224.5",
        projectedTotal: 221.3,
        overUnderEdge: "3.2 points toward Under",
        reasoning: "Both teams have trended Under in this series. Defense has tightened significantly in Games 2 and 3.",
        keyFactors: ["Series trend Under 2/2", "Both teams top-10 defense in playoffs", "Wembanyama injury concern reduces SAS offense"],
      },
    },
  }),

  getMultiBookOdds: async (gameId: string) => ({
    __kind__: "ok",
    ok: [
      {
        bookmaker: "DraftKings",
        homeSpread: -6.5,
        homeSpreadOdds: BigInt(-110),
        awaySpread: 6.5,
        awaySpreadOdds: BigInt(-110),
        homeMoneyline: BigInt(-240),
        awayMoneyline: BigInt(200),
        overUnder: 224.5,
        overOdds: BigInt(-110),
        underOdds: BigInt(-110),
        updatedAt: "2026-05-24T18:00:00Z",
      },
      {
        bookmaker: "FanDuel",
        homeSpread: -5.5,
        homeSpreadOdds: BigInt(-115),
        awaySpread: 5.5,
        awaySpreadOdds: BigInt(-105),
        homeMoneyline: BigInt(-230),
        awayMoneyline: BigInt(192),
        overUnder: 225.0,
        overOdds: BigInt(-112),
        underOdds: BigInt(-108),
        updatedAt: "2026-05-24T18:00:00Z",
      },
    ],
  }),

  getApiStatus: async () => ({
    oddsApiConfigured: true,
    openAiConfigured: true,
    bdlApiConfigured: true,
    lastOddsApiCallStatus: undefined,
    lastBdlCallStatus: undefined,
  }),

  getBetHistory: async () => [],

  getBetHistoryStats: async () => ({
    lostBets: BigInt(0),
    wonBets: BigInt(0),
    totalBets: BigInt(0),
    pendingBets: BigInt(0),
    winRate: 0,
  }),

  saveBetRecommendation: async (_rec) => ({ __kind__: "ok", ok: _rec.id }),

  updateBetOutcome: async (_id, _status, _gameResult) => ({ __kind__: "ok", ok: true }),

  isOddsApiConfigured: async () => false,

  setOddsApiKey: async (_key: string) => undefined,

  isOpenAIConfigured: async () => false,

  setOpenAIApiKey: async (_key: string) => undefined,

  isBdlApiConfigured: async () => false,

  setBdlApiKey: async (_key: string) => {},

  transform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: input.response.headers,
  }),

  getPropsAIAnalysis: async (_gameId: string, _playerData: string) =>
    "Mock AI analysis: Player props data looks favorable based on usage rates and matchup profiles.",

  getTotalsAIAnalysis: async (_gameId: string, _totalsData: string) =>
    "Mock AI analysis: Game total projected slightly under the implied line based on defensive efficiency trends.",

  updateClosingLine: async (_id: string, _closingLine: string, _preGameLine: string) => ({ __kind__: "ok", ok: true }),
};
