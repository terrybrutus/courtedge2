import {
  type BetHistoryStats,
  type BetRecommendation,
  type BetStatus,
  type GamesResponse,
  createActor,
} from "@/backend";
import { getApiErrorMessage } from "@/types";
import type {
  Game,
  GameInvestigation,
  GameTotal,
  PlayerPropsAnalysis,
} from "@/types";
import { useActor } from "@caffeineai/core-infrastructure";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useTodayGames() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GamesResponse>({
    queryKey: ["today-games"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.getTodaysGames();
      console.log("[EdgeStack] Raw games response:", result);
      if (result.__kind__ === "err") {
        const msg = getApiErrorMessage(result.err);
        console.log("[EdgeStack] Empty state reason:", msg);
        throw new Error(msg);
      }
      console.log(
        "[EdgeStack] Parsed game count:",
        result.ok.games.length,
        "date:",
        result.ok.gamesDate,
        "upcoming:",
        result.ok.isUpcomingDate,
      );
      return result.ok;
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });
}

export function useGameDetail(gameId: string, gameDate = "") {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GameInvestigation>({
    queryKey: ["game-detail", gameId, gameDate],
    queryFn: async () => {
      if (!actor || !gameId)
        throw new Error("Actor not ready or missing game ID");
      const result = await actor.getGameInvestigation(gameId, gameDate);
      console.log("[EdgeStack] Raw investigation response:", result);
      if (result.__kind__ === "err") {
        const msg = getApiErrorMessage(result.err);
        console.log("[EdgeStack] Investigation error:", msg);
        throw new Error(msg);
      }
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!gameId,
    retry: 2,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export function usePlayerProps(gameId: string, enabled = true) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<PlayerPropsAnalysis | null>({
    queryKey: ["player-props", gameId],
    queryFn: async () => {
      if (!actor || !gameId) return null;
      const result = await actor.getPlayerPropsAnalysis(gameId);
      if (result.__kind__ === "err")
        throw new Error(getApiErrorMessage(result.err));
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!gameId && enabled,
    retry: 2,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export function useGameTotal(
  gameId: string,
  homeTeamName: string,
  awayTeamName: string,
  enabled = true,
) {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<GameTotal | null>({
    queryKey: ["game-total", gameId, homeTeamName, awayTeamName],
    queryFn: async () => {
      if (!actor || !gameId) return null;
      const result = await actor.getGameTotalsAnalysis(
        gameId,
        homeTeamName,
        awayTeamName,
      );
      if (result.__kind__ === "err")
        throw new Error(getApiErrorMessage(result.err));
      return result.ok;
    },
    enabled: !!actor && !isFetching && !!gameId && enabled,
    retry: 2,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60 * 1000,
  });
}

export function useBetHistory() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<BetRecommendation[]>({
    queryKey: ["bet-history"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getBetHistory();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useBetHistoryStats() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<BetHistoryStats>({
    queryKey: ["bet-history-stats"],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getBetHistoryStats();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useUpdateBetOutcome() {
  const queryClient = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation<
    boolean,
    Error,
    { id: string; status: BetStatus; gameResult: string | null }
  >({
    mutationFn: async ({ id, status, gameResult }) => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.updateBetOutcome(id, status, gameResult);
      if (result.__kind__ === "err")
        throw new Error(getApiErrorMessage(result.err));
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bet-history"] });
      queryClient.invalidateQueries({ queryKey: ["bet-history-stats"] });
    },
  });
}

export function useSaveBetRecommendation() {
  const queryClient = useQueryClient();
  const { actor } = useActor(createActor);
  return useMutation<string, Error, BetRecommendation>({
    mutationFn: async (rec: BetRecommendation) => {
      if (!actor) throw new Error("Actor not ready");
      const result = await actor.saveBetRecommendation(rec);
      if (result.__kind__ === "err")
        throw new Error(getApiErrorMessage(result.err));
      return result.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bet-history"] });
      queryClient.invalidateQueries({ queryKey: ["bet-history-stats"] });
    },
  });
}

export function useIsOpenAIConfigured() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["openai-configured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isOpenAIConfigured();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    initialData: true,
  });
}

export function useSetOpenAIApiKey() {
  return useMutation<void, Error, string>({
    mutationFn: async (_key: string) => {
      // Keys are hardcoded in backend — this is a no-op
    },
  });
}

export function useIsBdlApiConfigured() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["bdl-configured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isBdlApiConfigured();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
  });
}

export function useSetBdlApiKey() {
  return useMutation<void, Error, string>({
    mutationFn: async (_key: string) => {
      // Keys are hardcoded in backend — this is a no-op
    },
  });
}

export function useIsOddsApiConfigured() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<boolean>({
    queryKey: ["odds-api-configured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isOddsApiConfigured();
    },
    enabled: !!actor && !isFetching,
    staleTime: 30_000,
    initialData: true,
  });
}

export function useSetOddsApiKey() {
  return useMutation<void, Error, string>({
    mutationFn: async (_key: string) => {
      // Keys are hardcoded in backend — this is a no-op
    },
  });
}

export function usePropsAIAnalysis() {
  const { actor } = useActor(createActor);
  return useMutation<string, Error, { gameId: string; playerData: string }>({
    mutationFn: async ({ gameId, playerData }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getPropsAIAnalysis(gameId, playerData);
    },
  });
}

export function useTotalsAIAnalysis() {
  const { actor } = useActor(createActor);
  return useMutation<string, Error, { gameId: string; totalsData: string }>({
    mutationFn: async ({ gameId, totalsData }) => {
      if (!actor) throw new Error("Actor not ready");
      return actor.getTotalsAIAnalysis(gameId, totalsData);
    },
  });
}

export function useApiStatus() {
  const { actor, isFetching } = useActor(createActor);
  return useQuery<{
    oddsApiConfigured: boolean;
    openAiConfigured: boolean;
    bdlApiConfigured: boolean;
    lastOddsApiCallStatus: string | null;
    lastBdlCallStatus: string | null;
  } | null>({
    queryKey: ["api-status"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getApiStatus() as Promise<{
        oddsApiConfigured: boolean;
        openAiConfigured: boolean;
        bdlApiConfigured: boolean;
        lastOddsApiCallStatus: string | null;
        lastBdlCallStatus: string | null;
      }>;
    },
    enabled: !!actor && !isFetching,
    staleTime: 15_000,
  });
}
