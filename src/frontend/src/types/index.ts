import {
  type BetHistoryStats,
  type BetRecommendation,
  BetStatus,
  BetType,
  type GamesResponse,
} from "@/backend";
import type {
  ApiError,
  ApiStatus,
  ConfidenceReport,
  Discrepancy,
  Game,
  GameId,
  GameInvestigation,
  GameStatus,
  GameTotal,
  InjuryReport,
  LineMovement,
  OddsLine,
  PaceProfile,
  Player,
  PlayerId,
  PlayerProp,
  PlayerPropsAnalysis,
  PlayerRecentGame,
  PropLine,
  RefereeProfile,
  RestAdvantage,
  ScoringTrend,
  SituationalAngle,
  Team,
  TeamId,
  TeamStats,
  TotalsConfidenceReport,
} from "@/backend";

export type {
  Game,
  Team,
  GameStatus,
  OddsLine,
  Discrepancy,
  GameInvestigation,
  LineMovement,
  RestAdvantage,
  SituationalAngle,
  PlayerProp,
  PropLine,
  PlayerRecentGame,
  ConfidenceReport,
  PlayerPropsAnalysis,
  GameTotal,
  PaceProfile,
  ScoringTrend,
  InjuryReport,
  TeamStats,
  TotalsConfidenceReport,
  RefereeProfile,
  ApiError,
  ApiStatus,
  Player,
  GameId,
  TeamId,
  PlayerId,
  BetRecommendation,
  BetHistoryStats,
  GamesResponse,
};
export { BetStatus, BetType };

export type ConfidenceLevel = "high" | "medium" | "low";

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

export function formatMoneyline(ml: bigint | undefined): string {
  if (ml === undefined) return "N/A";
  const n = Number(ml);
  return n > 0 ? `+${n}` : `${n}`;
}

export function formatSpread(spread: number | undefined): string {
  if (spread === undefined) return "N/A";
  return spread > 0 ? `+${spread}` : `${spread}`;
}

export function getApiErrorMessage(err: ApiError): string {
  if (err.__kind__ === "networkError") return err.networkError;
  if (err.__kind__ === "notFound") return err.notFound;
  if (err.__kind__ === "parseError") return err.parseError;
  if (err.__kind__ === "rateLimited") return err.rateLimited;
  if (err.__kind__ === "unavailable") return err.unavailable;
  return "Unknown error";
}
