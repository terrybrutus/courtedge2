import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface PlayerRecentGame {
    fieldGoalAttempts: number;
    date: string;
    minutes: number;
    usageRate: number;
    points: number;
    opponent: string;
}
export interface Player {
    id: PlayerId;
    name: string;
    team: string;
    jerseyNumber: string;
    injuryStatus: string;
    position: string;
}
export type Result_2 = {
    __kind__: "ok";
    ok: GamesResponse;
} | {
    __kind__: "err";
    err: ApiError;
};
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface GameInvestigation {
    game: Game;
    odds: Array<OddsLine>;
    injuries: Array<InjuryReport>;
    discrepancies: Array<Discrepancy>;
    homeTeamStats: TeamStats;
    awayTeamStats: TeamStats;
}
export interface Game {
    id: GameId;
    status: GameStatus;
    venue: string;
    displayTime: string;
    homeTeam: Team;
    odds: Array<OddsLine>;
    series?: string;
    awayTeam: Team;
    gameTime: string;
}
export interface InjuryReport {
    status: string;
    playerId: PlayerId;
    team: string;
    description: string;
    updatedAt: string;
    playerName: string;
}
export interface BetHistoryStats {
    lostBets: bigint;
    wonBets: bigint;
    totalBets: bigint;
    pendingBets: bigint;
    winRate: number;
}
export interface PlayerProp {
    seasonAvgPoints: number;
    player: Player;
    seasonUsageRate: number;
    matchupDefRating?: number;
    seasonAvgMinutes: number;
    propLines: Array<PropLine>;
    confidenceReport?: ConfidenceReport;
    backToBack: boolean;
    recentGames: Array<PlayerRecentGame>;
    homeAwaySplit: number;
}
export type Result_5 = {
    __kind__: "ok";
    ok: GameTotal;
} | {
    __kind__: "err";
    err: ApiError;
};
export interface ScoringTrend {
    result: string;
    overUnder: number;
    teamTotal: number;
    date: string;
    gameTotal: number;
    opponent: string;
}
export type TeamId = string;
export type Result_1 = {
    __kind__: "ok";
    ok: string;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_4 = {
    __kind__: "ok";
    ok: Array<OddsLine>;
} | {
    __kind__: "err";
    err: ApiError;
};
export type PlayerId = string;
export interface RefereeProfile {
    overRate?: number;
    name: string;
    avgFoulsPerGame?: number;
    avgFreeThrowsPerGame?: number;
}
export interface PaceProfile {
    defensiveEfficiency: number;
    pace: number;
    avgPointsAgainst: number;
    avgPointsFor: number;
    offensiveEfficiency: number;
    teamId: TeamId;
    last5Avg: number;
}
export interface GamesResponse {
    gamesDate: string;
    isUpcomingDate: boolean;
    games: Array<Game>;
}
export type GameId = string;
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface ConfidenceReport {
    keyFactors: Array<string>;
    projectedPoints?: number;
    reasoning: string;
    score: bigint;
    grade: string;
    recommendation: string;
}
export interface OddsLine {
    homeMoneyline?: bigint;
    overUnder?: number;
    awaySpreadOdds?: bigint;
    awayMoneyline?: bigint;
    overOdds?: bigint;
    awaySpread?: number;
    homeSpreadOdds?: bigint;
    homeSpread?: number;
    bookmaker: string;
    underOdds?: bigint;
    updatedAt: string;
}
export interface ApiStatus {
    lastBdlCallStatus?: string;
    oddsApiConfigured: boolean;
    openAiConfigured: boolean;
    bdlApiConfigured: boolean;
    lastOddsApiCallStatus?: string;
}
export interface Team {
    id: TeamId;
    city: string;
    name: string;
    abbreviation: string;
    record: string;
}
export type Result_6 = {
    __kind__: "ok";
    ok: GameInvestigation;
} | {
    __kind__: "err";
    err: ApiError;
};
export interface TotalsConfidenceReport {
    overUnderEdge: string;
    keyFactors: Array<string>;
    reasoning: string;
    score: bigint;
    projectedTotal?: number;
    grade: string;
    recommendation: string;
}
export interface TeamStats {
    pace?: number;
    recentForm: Array<bigint>;
    homeAwayRecord: string;
    defensiveRating?: number;
    teamId: TeamId;
    restDays: bigint;
    offensiveRating?: number;
    pointsPerGame?: number;
}
export interface PlayerPropsAnalysis {
    gameId: GameId;
    players: Array<PlayerProp>;
    analysisGeneratedAt: string;
}
export interface http_header {
    value: string;
    name: string;
}
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export type Result = {
    __kind__: "ok";
    ok: boolean;
} | {
    __kind__: "err";
    err: ApiError;
};
export type Result_3 = {
    __kind__: "ok";
    ok: PlayerPropsAnalysis;
} | {
    __kind__: "err";
    err: ApiError;
};
export interface PropLine {
    overOdds: bigint;
    line: number;
    bookmaker: string;
    underOdds: bigint;
}
export type ApiError = {
    __kind__: "networkError";
    networkError: string;
} | {
    __kind__: "notFound";
    notFound: string;
} | {
    __kind__: "parseError";
    parseError: string;
} | {
    __kind__: "rateLimited";
    rateLimited: string;
} | {
    __kind__: "unavailable";
    unavailable: string;
};
export interface GameTotal {
    homePace: PaceProfile;
    gameId: GameId;
    refereeProfile?: RefereeProfile;
    impliedTotal?: number;
    projectedTotal?: number;
    recentTrends: Array<ScoringTrend>;
    confidenceReport?: TotalsConfidenceReport;
    awayPace: PaceProfile;
    injuryImpact: string;
}
export interface Discrepancy {
    gap: number;
    minValue: number;
    minBook: string;
    betType: string;
    maxBook: string;
    maxValue: number;
}
export interface BetRecommendation {
    id: string;
    status: BetStatus;
    result?: string;
    homeTeam: string;
    gameResult?: string;
    betType: BetType;
    gameId: GameId;
    description: string;
    reasoning: string;
    updatedAt?: bigint;
    recommendedAt: bigint;
    awayTeam: string;
    gameDate: string;
    preGameOdds?: string;
    confidence: bigint;
}
export enum BetStatus {
    won = "won",
    cancelled = "cancelled",
    pending = "pending",
    lost = "lost",
    push = "push"
}
export enum BetType {
    gameTotal = "gameTotal",
    playerProp = "playerProp",
    spread = "spread"
}
export enum GameStatus {
    final_ = "final",
    scheduled = "scheduled",
    inProgress = "inProgress",
    postponed = "postponed"
}
export interface backendInterface {
    getApiStatus(): Promise<ApiStatus>;
    getBetHistory(): Promise<Array<BetRecommendation>>;
    getBetHistoryStats(): Promise<BetHistoryStats>;
    getGameInvestigation(gameId: GameId, gameDate: string): Promise<Result_6>;
    getGameTotalsAnalysis(gameId: GameId, homeTeamName: string, awayTeamName: string): Promise<Result_5>;
    getHistoryContext(): Promise<string>;
    getMultiBookOdds(gameId: GameId): Promise<Result_4>;
    getPlayerPropsAnalysis(gameId: GameId): Promise<Result_3>;
    getPropsAIAnalysis(gameId: string, playerData: string): Promise<string>;
    getTodaysGames(): Promise<Result_2>;
    getTotalsAIAnalysis(gameId: string, totalsData: string): Promise<string>;
    isBdlApiConfigured(): Promise<boolean>;
    isOddsApiConfigured(): Promise<boolean>;
    isOpenAIConfigured(): Promise<boolean>;
    saveBetRecommendation(rec: BetRecommendation): Promise<Result_1>;
    setBdlApiKey(_key: string): Promise<void>;
    setOddsApiKey(_key: string): Promise<void>;
    setOpenAIApiKey(_key: string): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
    updateBetOutcome(id: string, status: BetStatus, gameResult: string | null): Promise<Result>;
}
