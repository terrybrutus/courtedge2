import { ConfidenceMeter } from "@/components/ConfidenceMeter";
import { InjuryBadge } from "@/components/InjuryBadge";
import { OddsCard } from "@/components/OddsCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useGameDetail,
  useGameTotal,
  usePlayerProps,
  usePropsAIAnalysis,
  useTotalsAIAnalysis,
} from "@/hooks/useBackend";
import { cn } from "@/lib/utils";
import type {
  ConfidenceReport,
  GameInvestigation,
  GameTotal,
  PaceProfile,
  PlayerProp,
  PlayerPropsAnalysis,
  PropLine,
  ScoringTrend,
} from "@/types";
import { formatMoneyline } from "@/types";
import {
  Link,
  useNavigate,
  useParams,
  useSearch,
} from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Brain,
  Clock,
  Flame,
  MapPin,
  RefreshCw,
  Swords,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

// ─── Team name helper ─────────────────────────────────────────────────────────
const teamFullName = (city: string, name: string): string => {
  if (!city || !name) return name || city || "";
  if (name.toLowerCase().startsWith(city.toLowerCase())) return name;
  return `${city} ${name}`;
};

// ─── Sparkline mini-chart ─────────────────────────────────────────────────────
function Sparkline({ values, max }: { values: number[]; max: number }) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {values.map((v, i) => (
        <div
          key={i}
          className="w-3 rounded-sm bg-primary/60 transition-all"
          style={{ height: `${Math.max(8, (v / max) * 32)}px` }}
          title={`${v} pts`}
        />
      ))}
    </div>
  );
}

// ─── Stat cell ────────────────────────────────────────────────────────────────
function StatCell({
  label,
  value,
  highlight,
  sub,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  sub?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "font-display font-bold text-base",
          highlight ? "text-accent" : "text-foreground",
        )}
      >
        {value}
      </span>
      {sub && (
        <span className="text-[10px] font-mono text-muted-foreground">
          {sub}
        </span>
      )}
    </div>
  );
}

// ─── Efficiency comparison bar ────────────────────────────────────────────────
function EfficiencyBar({
  label,
  homeVal,
  awayVal,
  homeTeam,
  awayTeam,
}: {
  label: string;
  homeVal: number;
  awayVal: number;
  homeTeam: string;
  awayTeam: string;
}) {
  const total = homeVal + awayVal;
  const homePct = total > 0 ? (homeVal / total) * 100 : 50;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
        <span>
          {awayTeam} {awayVal.toFixed(1)}
        </span>
        <span className="text-center">{label}</span>
        <span>
          {homeVal.toFixed(1)} {homeTeam}
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden">
        <div
          className="bg-chart-4 transition-all"
          style={{ width: `${100 - homePct}%` }}
        />
        <div className="bg-muted w-0.5" />
        <div
          className="bg-primary transition-all flex-1"
          style={{ width: `${homePct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Trend mini-bars ──────────────────────────────────────────────────────────
function TrendBars({ trends }: { trends: ScoringTrend[] }) {
  const vals = trends.map((t) => t.teamTotal);
  const max = Math.max(...vals, 1);
  return (
    <div className="flex items-end gap-1 h-10">
      {trends.map((t, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 rounded-sm transition-all",
            t.result === "W" ? "bg-primary/70" : "bg-muted-foreground/40",
          )}
          style={{ height: `${Math.max(6, (t.teamTotal / max) * 40)}px` }}
          title={`${t.opponent}: ${t.teamTotal} pts (${t.result})`}
        />
      ))}
    </div>
  );
}

// ─── PropLine row ─────────────────────────────────────────────────────────────
function PropLinesRow({
  lines,
  playerName,
}: { lines: PropLine[]; playerName: string }) {
  if (!lines.length) return null;
  const vals = lines.map((l) => l.line);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const hasDisc = max - min >= 0.5;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Prop Lines
        </span>
        {hasDisc && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-accent/50 text-accent bg-accent/10">
            <AlertTriangle className="w-2.5 h-2.5" />
            {(max - min).toFixed(1)} gap
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {lines.map((line) => (
          <div
            key={line.bookmaker}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded border text-xs font-mono",
              (line.line === max && hasDisc) || (line.line === min && hasDisc)
                ? "border-accent/50 bg-accent/10 text-accent"
                : "border-border/50 bg-card/60 text-foreground",
            )}
          >
            <span className="text-muted-foreground uppercase">
              {line.bookmaker}
            </span>
            <span className="font-bold">{line.line}</span>
            <span className="text-muted-foreground text-[10px]">
              o{formatMoneyline(line.overOdds)} u
              {formatMoneyline(line.underOdds)}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-mono text-muted-foreground">
        Lines shown for {playerName} — O/U points prop
      </p>
    </div>
  );
}

// ─── Player Prop Card ─────────────────────────────────────────────────────────
function PlayerPropCard({ prop, index }: { prop: PlayerProp; index: number }) {
  const { player, confidenceReport } = prop;
  const recentPts = prop.recentGames.slice(0, 5).map((g) => g.points);
  const maxPts = Math.max(...recentPts, 1);
  const report = confidenceReport as ConfidenceReport | undefined;
  const score = report ? Number(report.score) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4 }}
      className="rounded-xl border border-border/60 bg-card overflow-hidden"
      data-ocid={`investigation.player_card.${index + 1}`}
    >
      {/* Card header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="font-display font-bold text-xl text-foreground tracking-tight">
              {player.name}
            </span>
            <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              #{player.jerseyNumber}
            </span>
            {prop.backToBack && (
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-accent/50 text-accent bg-accent/10 px-1.5"
              >
                <Flame className="w-2.5 h-2.5 mr-1" />
                B2B
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <span>{player.team}</span>
            <span className="text-border">·</span>
            <span>{player.position}</span>
            <InjuryBadge status={player.injuryStatus} className="ml-1" />
          </div>
        </div>
        {report && (
          <div className="text-right">
            <div
              className={cn(
                "font-display font-bold text-2xl",
                score >= 70
                  ? "text-primary"
                  : score >= 40
                    ? "text-accent"
                    : "text-destructive",
              )}
            >
              {score}
            </div>
            <div className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
              Confidence
            </div>
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border/30">
        <div className="bg-card px-4 py-3">
          <StatCell
            label="Season Avg"
            value={`${prop.seasonAvgPoints.toFixed(1)} PPG`}
          />
        </div>
        <div className="bg-card px-4 py-3">
          <StatCell
            label="Usage Rate"
            value={`${(prop.seasonUsageRate * 100).toFixed(1)}%`}
            highlight={prop.seasonUsageRate > 0.28}
          />
        </div>
        <div className="bg-card px-4 py-3">
          <StatCell
            label="Matchup Def Rtg"
            value={
              prop.matchupDefRating ? prop.matchupDefRating.toFixed(1) : "N/A"
            }
            highlight={!!prop.matchupDefRating && prop.matchupDefRating > 110}
            sub={
              prop.matchupDefRating && prop.matchupDefRating > 110
                ? "Soft matchup"
                : prop.matchupDefRating
                  ? "Tough matchup"
                  : undefined
            }
          />
        </div>
        <div className="bg-card px-4 py-3">
          <StatCell
            label="Home/Away Split"
            value={`${prop.homeAwaySplit.toFixed(1)} PPG`}
          />
        </div>
      </div>

      {/* Recent form */}
      <div className="px-5 py-3 border-t border-border/30 bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Last {recentPts.length} Games
          </span>
          <div className="flex gap-2 text-xs font-mono text-muted-foreground">
            {prop.recentGames.slice(0, 5).map((g, i) => (
              <span key={i} className="text-foreground font-bold">
                {g.points}
              </span>
            ))}
          </div>
        </div>
        <Sparkline values={recentPts} max={maxPts} />
      </div>

      {/* Prop lines */}
      <div className="px-5 py-3 border-t border-border/30">
        <PropLinesRow lines={prop.propLines} playerName={player.name} />
      </div>

      {/* Confidence meter */}
      {report && (
        <div className="px-5 py-4 border-t border-border/30 bg-card/60">
          <ConfidenceMeter score={score} grade={report.grade} size="md" />
          {/* Key factors */}
          {report.keyFactors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {report.keyFactors.map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-border/60 bg-muted/60 text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
          {/* Recommendation badge */}
          <div className="mt-2.5 flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-xs font-mono font-bold text-primary">
              {report.recommendation}
            </span>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {report?.reasoning && (
        <div className="px-5 py-4 border-t border-border/30 bg-muted/20">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-3.5 h-3.5 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
              AI Analysis
            </span>
          </div>
          <blockquote className="border-l-2 border-primary/40 pl-3">
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {report.reasoning}
            </p>
          </blockquote>
          {report.projectedPoints !== undefined && (
            <div className="mt-2.5 flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Projected:
              </span>
              <span className="font-display font-bold text-primary text-sm">
                {report.projectedPoints.toFixed(1)} pts
              </span>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Player Props Tab ─────────────────────────────────────────────────────────
function PlayerPropsTab({
  gameId,
  injuries,
  isActiveTab,
}: {
  gameId: string;
  injuries: GameInvestigation["injuries"];
  isActiveTab: boolean;
}) {
  const [hasFetched, setHasFetched] = useState(false);
  const shouldFetch = isActiveTab || hasFetched;
  const { data, isLoading, isError, refetch } = usePlayerProps(
    gameId,
    shouldFetch,
  );
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const propsAI = usePropsAIAnalysis();

  // Mark as fetched once tab is first activated
  if (isActiveTab && !hasFetched) setHasFetched(true);

  const handleAIAnalyze = () => {
    if (!data) return;
    const summary = data.players
      .map(
        (p) =>
          `${p.player.name}: avg ${p.seasonAvgPoints.toFixed(1)} PPG, usage ${(p.seasonUsageRate * 100).toFixed(1)}%`,
      )
      .join("\n");
    propsAI.mutate(
      { gameId, playerData: summary },
      { onSuccess: (result) => setAiAnalysis(result) },
    );
  };
  const propsData = data as PlayerPropsAnalysis | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4" data-ocid="investigation.props.loading_state">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-card p-5 space-y-3"
          >
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-12" />
              ))}
            </div>
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Only show hard error for actual network/API failures, not missing data
  if (isError) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-16"
        data-ocid="investigation.props.error_state"
      >
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="font-mono text-sm text-muted-foreground">
          Failed to load player props
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="font-mono text-xs"
          data-ocid="investigation.props.retry_button"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Data still loading or not yet available — show skeleton
  if (!propsData) {
    return (
      <div className="space-y-4" data-ocid="investigation.props.loading_state">
        <div className="rounded-xl border border-border/40 bg-card/50 px-5 py-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            Player props loading — this may take a moment
          </p>
        </div>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-card p-5 space-y-3"
          >
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-12" />
              ))}
            </div>
            <Skeleton className="h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  const sorted = [...propsData.players].sort((a, b) => {
    const sa = a.confidenceReport ? Number(a.confidenceReport.score) : 0;
    const sb = b.confidenceReport ? Number(b.confidenceReport.score) : 0;
    return sb - sa;
  });

  const injuryPlayers = injuries.filter(
    (inj) => inj.status.toLowerCase() !== "active",
  );

  return (
    <div className="space-y-4">
      {/* Injury callout */}
      {injuryPlayers.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex flex-wrap gap-3 items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-destructive">
            Injury Watch
          </span>
          {injuryPlayers.map((inj) => (
            <InjuryBadge
              key={inj.playerId}
              status={inj.status}
              playerName={inj.playerName}
              description={inj.description}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {sorted.length} players analyzed · sorted by confidence
        </span>
        <span className="text-[10px] font-mono text-muted-foreground">
          Generated {propsData.analysisGeneratedAt}
        </span>
      </div>

      {sorted.map((prop, i) => (
        <PlayerPropCard key={prop.player.id} prop={prop} index={i} />
      ))}

      {sorted.length === 0 && (
        <div
          className="flex flex-col items-center gap-3 py-20"
          data-ocid="investigation.props.empty_state"
        >
          <BarChart3 className="w-10 h-10 text-muted-foreground/40" />
          <p className="font-mono text-sm text-muted-foreground">
            No player props available yet
          </p>
        </div>
      )}

      {/* On-demand deeper AI analysis */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
              Deeper AI Analysis
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAIAnalyze}
            disabled={propsAI.isPending || !data}
            className="font-mono text-xs"
            data-ocid="investigation.props.ai_analyze_button"
          >
            <Brain className="w-3 h-3 mr-1.5" />
            {propsAI.isPending
              ? "Analyzing…"
              : aiAnalysis
                ? "Re-analyze"
                : "Analyze with AI"}
          </Button>
        </div>
        {aiAnalysis && (
          <blockquote className="border-l-2 border-primary/40 pl-4">
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {aiAnalysis}
            </p>
          </blockquote>
        )}
        {propsAI.isError && (
          <p
            className="text-xs font-mono text-destructive"
            data-ocid="investigation.props.ai_error_state"
          >
            AI analysis failed — contact support if this persists
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Pace card ────────────────────────────────────────────────────────────────
function PaceCard({ pace, teamName }: { pace: PaceProfile; teamName: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Swords className="w-4 h-4 text-primary" />
        <span className="font-display font-bold text-base text-foreground tracking-tight">
          {teamName}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <StatCell
          label="Pace"
          value={pace.pace.toFixed(1)}
          sub="possessions/48"
        />
        <StatCell
          label="Off Eff"
          value={pace.offensiveEfficiency.toFixed(1)}
          highlight={pace.offensiveEfficiency > 112}
        />
        <StatCell
          label="Def Eff"
          value={pace.defensiveEfficiency.toFixed(1)}
          highlight={pace.defensiveEfficiency > 112}
        />
        <StatCell label="PPG" value={pace.avgPointsFor.toFixed(1)} />
        <StatCell label="Opp PPG" value={pace.avgPointsAgainst.toFixed(1)} />
        <StatCell label="Last 5 Avg" value={pace.last5Avg.toFixed(1)} />
      </div>
    </div>
  );
}

// ─── Game Total Tab ───────────────────────────────────────────────────────────
function GameTotalTab({
  gameId,
  homeTeamName,
  awayTeamName,
  isActiveTab,
}: {
  gameId: string;
  homeTeamName: string;
  awayTeamName: string;
  isActiveTab: boolean;
}) {
  const [hasFetched, setHasFetched] = useState(false);
  const shouldFetch = isActiveTab || hasFetched;
  const { data, isLoading, isError, refetch } = useGameTotal(
    gameId,
    homeTeamName,
    awayTeamName,
    shouldFetch,
  );
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const totalsAI = useTotalsAIAnalysis();

  // Mark as fetched once tab is first activated
  if (isActiveTab && !hasFetched) setHasFetched(true);

  const handleAIAnalyze = () => {
    if (!data) return;
    const summary = `Home: ${homeTeamName} pace ${data.homePace.pace.toFixed(1)}, off ${data.homePace.offensiveEfficiency.toFixed(1)}, def ${data.homePace.defensiveEfficiency.toFixed(1)}. Away: ${awayTeamName} pace ${data.awayPace.pace.toFixed(1)}, off ${data.awayPace.offensiveEfficiency.toFixed(1)}, def ${data.awayPace.defensiveEfficiency.toFixed(1)}. Projected total: ${(data.projectedTotal ?? data.impliedTotal ?? 0).toFixed(1)}.`;
    totalsAI.mutate(
      { gameId, totalsData: summary },
      { onSuccess: (result) => setAiAnalysis(result) },
    );
  };
  const total = data as GameTotal | undefined;

  if (isLoading) {
    return (
      <div className="space-y-4" data-ocid="investigation.total.loading_state">
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-32" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (isError) {
    return (
      <div
        className="flex flex-col items-center gap-4 py-16"
        data-ocid="investigation.total.error_state"
      >
        <AlertTriangle className="w-8 h-8 text-destructive" />
        <p className="font-mono text-sm text-muted-foreground">
          Failed to load game totals
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="font-mono text-xs"
          data-ocid="investigation.total.retry_button"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  // Still waiting for data — show loading skeleton
  if (!total) {
    return (
      <div className="space-y-4" data-ocid="investigation.total.loading_state">
        <div className="rounded-xl border border-border/40 bg-card/50 px-5 py-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            Loading game totals analysis…
          </p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-32" />
      </div>
    );
  }

  const report = total.confidenceReport;
  const score = report ? Number(report.score) : 0;
  const isOver = report?.overUnderEdge?.toLowerCase().includes("over");
  const isUnder = report?.overUnderEdge?.toLowerCase().includes("under");

  // Split trends: last 5 for each team by alternating or team-based
  const homeTrends = total.recentTrends.slice(0, 5);
  const awayTrends = total.recentTrends.slice(5, 10);

  return (
    <div className="space-y-5">
      {/* Projected total hero */}
      {(total.projectedTotal ?? total.impliedTotal) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-xl border border-primary/30 bg-primary/5 p-6 text-center space-y-2"
        >
          <div className="text-[10px] font-mono uppercase tracking-widest text-primary">
            Projected Total
          </div>
          <div className="font-display font-bold text-5xl text-primary">
            {(total.projectedTotal ?? total.impliedTotal)?.toFixed(1)}
          </div>
          {report?.overUnderEdge && (
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono font-bold text-sm",
                isOver
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : isUnder
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border text-muted-foreground",
              )}
            >
              {isOver ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {report.overUnderEdge}
            </div>
          )}
        </motion.div>
      )}

      {/* Pace cards side by side */}
      <div className="grid sm:grid-cols-2 gap-4">
        <PaceCard pace={total.awayPace} teamName={awayTeamName} />
        <PaceCard pace={total.homePace} teamName={homeTeamName} />
      </div>

      {/* Efficiency comparison bars */}
      <div className="rounded-xl border border-border/60 bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Efficiency Comparison
          </span>
        </div>
        <EfficiencyBar
          label="Off Eff"
          homeVal={total.homePace.offensiveEfficiency}
          awayVal={total.awayPace.offensiveEfficiency}
          homeTeam={homeTeamName}
          awayTeam={awayTeamName}
        />
        <EfficiencyBar
          label="Def Eff"
          homeVal={total.homePace.defensiveEfficiency}
          awayVal={total.awayPace.defensiveEfficiency}
          homeTeam={homeTeamName}
          awayTeam={awayTeamName}
        />
        <EfficiencyBar
          label="Pace"
          homeVal={total.homePace.pace}
          awayVal={total.awayPace.pace}
          homeTeam={homeTeamName}
          awayTeam={awayTeamName}
        />
      </div>

      {/* Scoring trends */}
      {(homeTrends.length > 0 || awayTrends.length > 0) && (
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Last 5 Games Scoring Trend
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {homeTrends.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono text-foreground">
                  {homeTeamName}
                </span>
                <TrendBars trends={homeTrends} />
                <div className="flex gap-2 text-[10px] font-mono text-muted-foreground">
                  {homeTrends.map((t, i) => (
                    <span
                      key={i}
                      className={
                        t.result === "W"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {t.teamTotal}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {awayTrends.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono text-foreground">
                  {awayTeamName}
                </span>
                <TrendBars trends={awayTrends} />
                <div className="flex gap-2 text-[10px] font-mono text-muted-foreground">
                  {awayTrends.map((t, i) => (
                    <span
                      key={i}
                      className={
                        t.result === "W"
                          ? "text-primary"
                          : "text-muted-foreground"
                      }
                    >
                      {t.teamTotal}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Injury impact */}
      {total.injuryImpact && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
              Injury Impact
            </span>
          </div>
          <p className="text-sm font-body text-muted-foreground leading-relaxed">
            {total.injuryImpact}
          </p>
        </div>
      )}

      {/* Referee profile */}
      {total.refereeProfile && (
        <div className="rounded-lg border border-border/40 bg-card/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Referee · {total.refereeProfile.name}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-mono">
            {total.refereeProfile.avgFoulsPerGame !== undefined && (
              <span className="text-muted-foreground">
                Fouls/game:{" "}
                <span className="text-foreground font-bold">
                  {total.refereeProfile.avgFoulsPerGame.toFixed(1)}
                </span>
              </span>
            )}
            {total.refereeProfile.avgFreeThrowsPerGame !== undefined && (
              <span className="text-muted-foreground">
                FT/game:{" "}
                <span className="text-foreground font-bold">
                  {total.refereeProfile.avgFreeThrowsPerGame.toFixed(1)}
                </span>
              </span>
            )}
            {total.refereeProfile.overRate !== undefined && (
              <span className="text-muted-foreground">
                Over rate:{" "}
                <span
                  className={cn(
                    "font-bold",
                    total.refereeProfile.overRate > 0.55
                      ? "text-primary"
                      : total.refereeProfile.overRate < 0.45
                        ? "text-accent"
                        : "text-foreground",
                  )}
                >
                  {(total.refereeProfile.overRate * 100).toFixed(0)}%
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Confidence meter */}
      {report && (
        <div className="rounded-xl border border-border/60 bg-card p-5 space-y-4">
          <ConfidenceMeter score={score} grade={report.grade} size="lg" />
          {report.keyFactors.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {report.keyFactors.map((f, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-border/60 bg-muted/60 text-muted-foreground"
                >
                  {f}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-primary" />
            <span className="text-xs font-mono font-bold text-primary">
              {report.recommendation}
            </span>
          </div>
        </div>
      )}

      {/* AI Analysis */}
      {report?.reasoning && (
        <div className="rounded-xl border border-border/60 bg-muted/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
              AI Analysis
            </span>
          </div>
          <blockquote className="border-l-2 border-primary/40 pl-4">
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {report.reasoning}
            </p>
          </blockquote>
          {report.projectedTotal !== undefined && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                Projected total:
              </span>
              <span className="font-display font-bold text-primary">
                {report.projectedTotal.toFixed(1)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* On-demand deeper AI analysis */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">
              Deeper AI Analysis
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAIAnalyze}
            disabled={totalsAI.isPending || !data}
            className="font-mono text-xs"
            data-ocid="investigation.total.ai_analyze_button"
          >
            <Brain className="w-3 h-3 mr-1.5" />
            {totalsAI.isPending
              ? "Analyzing…"
              : aiAnalysis
                ? "Re-analyze"
                : "Analyze with AI"}
          </Button>
        </div>
        {aiAnalysis && (
          <blockquote className="border-l-2 border-primary/40 pl-4">
            <p className="text-sm font-body text-muted-foreground leading-relaxed">
              {aiAnalysis}
            </p>
          </blockquote>
        )}
        {totalsAI.isError && (
          <p
            className="text-xs font-mono text-destructive"
            data-ocid="investigation.total.ai_error_state"
          >
            AI analysis failed — contact support if this persists
          </p>
        )}
      </div>
    </div>
  );
}

// ─── All Odds Tab ─────────────────────────────────────────────────────────────
function AllOddsTab({
  investigation,
}: {
  investigation: GameInvestigation;
}) {
  const { odds, discrepancies } = investigation;
  const awayAbbr = investigation.game.awayTeam.abbreviation;
  const lastUpdated = odds[0]?.updatedAt ?? "—";

  const topDiscs = [...discrepancies].sort((a, b) => b.gap - a.gap).slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Discrepancy highlights */}
      {topDiscs.length > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-accent" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-accent">
              Line Discrepancies
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              — biggest gaps across books
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {topDiscs.map((d, i) => (
              <div
                key={i}
                className="rounded-lg border border-accent/30 bg-card/80 p-3 space-y-1"
                data-ocid={`investigation.discrepancy.${i + 1}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                    {d.betType}
                  </span>
                  <span className="font-mono font-bold text-accent text-sm">
                    +{d.gap.toFixed(1)} gap
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="text-muted-foreground">{d.minBook}</span>
                  <span className="text-muted-foreground">{d.minValue}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-bold text-foreground">{d.maxBook}</span>
                  <span className="font-bold text-foreground">
                    {d.maxValue}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-body">
                  {d.minBook} offers {d.minValue} while {d.maxBook} offers{" "}
                  {d.maxValue} — {d.gap.toFixed(1)} point gap suggests market
                  uncertainty
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full odds table */}
      {odds.length > 0 ? (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              All Books · {odds.length} sources
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated}
            </span>
          </div>
          <div className="p-4">
            <OddsCard
              odds={odds}
              discrepancies={discrepancies}
              awayTeam={awayAbbr}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/40 p-6 text-center space-y-2">
          <p className="text-sm font-body text-muted-foreground">
            Enter your Odds API key in Settings to see live odds from multiple
            sportsbooks.
          </p>
          <Link
            to="/settings"
            className="inline-flex items-center gap-1 text-xs font-mono text-primary hover:text-primary/80 transition-colors"
            data-ocid="investigation.odds_go_to_settings_link"
          >
            Go to Settings
            <ArrowLeft className="w-3 h-3 rotate-180" />
          </Link>
        </div>
      )}

      {odds.length > 0 && discrepancies.length === 0 && (
        <div className="rounded-lg border border-border/40 bg-card/40 p-4 text-center">
          <p className="text-xs font-mono text-muted-foreground">
            No significant line discrepancies detected across books
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Edge Tab ─────────────────────────────────────────────────────────────────
function EdgeTab({ investigation }: { investigation: GameInvestigation }) {
  const { lineMovement, restAdvantage, situationalAngles, refereeProfile } =
    investigation;

  return (
    <div className="space-y-5" data-ocid="investigation.edge_tab">
      {/* Line Movement */}
      {lineMovement ? (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="w-3 h-3" />
              Line Movement
            </span>
            {lineMovement.steamAlert && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded border border-destructive/50 text-destructive bg-destructive/10 text-[9px] font-mono uppercase tracking-widest">
                <Flame className="w-2.5 h-2.5" />
                Steam Alert
              </span>
            )}
          </div>
          <div className="p-4 grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                Spread
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-mono text-muted-foreground/60">
                  Open: {lineMovement.openingSpread !== undefined && lineMovement.openingSpread !== null ? (lineMovement.openingSpread > 0 ? `+${lineMovement.openingSpread}` : String(lineMovement.openingSpread)) : "—"}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">→</span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {lineMovement.currentSpread !== undefined && lineMovement.currentSpread !== null ? (lineMovement.currentSpread > 0 ? `+${lineMovement.currentSpread}` : String(lineMovement.currentSpread)) : "—"}
                </span>
              </div>
              {lineMovement.spreadMove !== 0 && (
                <p className={cn("text-[10px] font-mono", lineMovement.spreadMove < 0 ? "text-primary" : "text-destructive")}>
                  {lineMovement.spreadMove > 0 ? "+" : ""}{lineMovement.spreadMove.toFixed(1)} pts moved
                </p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                Total (O/U)
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-[11px] font-mono text-muted-foreground/60">
                  Open: {lineMovement.openingTotal !== undefined && lineMovement.openingTotal !== null ? lineMovement.openingTotal : "—"}
                </span>
                <span className="text-[10px] font-mono text-muted-foreground">→</span>
                <span className="text-sm font-mono font-semibold text-foreground">
                  {lineMovement.currentTotal !== undefined && lineMovement.currentTotal !== null ? lineMovement.currentTotal : "—"}
                </span>
              </div>
              {lineMovement.totalMove !== 0 && (
                <p className={cn("text-[10px] font-mono", lineMovement.totalMove > 0 ? "text-primary" : "text-destructive")}>
                  {lineMovement.totalMove > 0 ? "+" : ""}{lineMovement.totalMove.toFixed(1)} pts moved
                </p>
              )}
            </div>
          </div>
          {lineMovement.sharpSide !== "NONE" && (
            <div className="px-4 pb-4">
              <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                Sharp Action
              </p>
              <p className="text-xs font-mono text-accent font-semibold">
                {lineMovement.sharpSide} side getting sharp money
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/40 p-5 text-center">
          <TrendingUp className="w-5 h-5 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-xs font-mono text-muted-foreground">
            Line movement data available after first odds fetch
          </p>
        </div>
      )}

      {/* Rest Advantage */}
      {restAdvantage ? (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Rest Advantage
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                  Away Rest
                </p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {String(restAdvantage.awayRestDays)}
                </p>
                <p className="text-[9px] font-mono text-muted-foreground">days</p>
              </div>
              <div className="flex flex-col items-center justify-center">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] font-mono uppercase tracking-widest",
                    restAdvantage.advantage === "HOME"
                      ? "border-primary/40 text-primary bg-primary/5"
                      : restAdvantage.advantage === "AWAY"
                        ? "border-accent/40 text-accent bg-accent/5"
                        : "border-border/40 text-muted-foreground",
                  )}
                >
                  {restAdvantage.advantage === "NONE" ? "Even" : `${restAdvantage.advantage} Edge`}
                </Badge>
              </div>
              <div>
                <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
                  Home Rest
                </p>
                <p className="text-2xl font-display font-bold text-foreground">
                  {String(restAdvantage.homeRestDays)}
                </p>
                <p className="text-[9px] font-mono text-muted-foreground">days</p>
              </div>
            </div>
            <p className="text-xs font-body text-muted-foreground leading-relaxed">
              {restAdvantage.impactDescription}
            </p>
          </div>
        </div>
      ) : null}

      {/* Situational Angles */}
      {situationalAngles.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Situational Angles · {situationalAngles.length}
            </span>
          </div>
          <div className="divide-y divide-border/25">
            {situationalAngles.map((angle, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-xs font-mono font-semibold text-foreground">
                    {angle.name}
                  </p>
                  <span className="shrink-0 text-[9px] font-mono px-2 py-0.5 rounded border border-accent/40 text-accent bg-accent/5">
                    {String(angle.confidence)}% conf
                  </span>
                </div>
                <p className="text-[11px] font-body text-muted-foreground leading-relaxed">
                  {angle.description}
                </p>
                <p className="text-[10px] font-mono font-semibold text-primary">
                  {angle.edge}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Referee Profile */}
      {refereeProfile ? (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
          <div className="px-5 py-3 border-b border-border/40">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Referee Profile
            </span>
          </div>
          <div className="p-4 space-y-3">
            <p className="font-display text-base font-bold text-foreground">
              {refereeProfile.name}
            </p>
            <div className="grid grid-cols-3 gap-3 text-center">
              {refereeProfile.avgFoulsPerGame !== undefined && refereeProfile.avgFoulsPerGame !== null && (
                <div className="rounded-lg border border-border/40 bg-muted/20 p-2 space-y-0.5">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    Fouls/Game
                  </p>
                  <p className="text-lg font-display font-bold text-foreground">
                    {refereeProfile.avgFoulsPerGame.toFixed(1)}
                  </p>
                </div>
              )}
              {refereeProfile.avgFreeThrowsPerGame !== undefined && refereeProfile.avgFreeThrowsPerGame !== null && (
                <div className="rounded-lg border border-border/40 bg-muted/20 p-2 space-y-0.5">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    FT/Game
                  </p>
                  <p className="text-lg font-display font-bold text-foreground">
                    {refereeProfile.avgFreeThrowsPerGame.toFixed(1)}
                  </p>
                </div>
              )}
              {refereeProfile.overRate !== undefined && refereeProfile.overRate !== null && (
                <div className="rounded-lg border border-border/40 bg-muted/20 p-2 space-y-0.5">
                  <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                    Over Rate
                  </p>
                  <p className={cn("text-lg font-display font-bold", refereeProfile.overRate >= 0.52 ? "text-primary" : "text-muted-foreground")}>
                    {(refereeProfile.overRate * 100).toFixed(0)}%
                  </p>
                </div>
              )}
            </div>
            <p className="text-xs font-body text-muted-foreground leading-relaxed">
              {refereeProfile.tendency}
            </p>
          </div>
        </div>
      ) : null}

      {!lineMovement && !restAdvantage && situationalAngles.length === 0 && !refereeProfile && (
        <div className="rounded-xl border border-border/40 bg-card/40 p-8 text-center space-y-2">
          <Zap className="w-6 h-6 text-muted-foreground/30 mx-auto" />
          <p className="text-sm font-body text-muted-foreground">
            Edge data loads when the game investigation runs with live odds.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Game status badge ────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const isLive =
    status === "inProgress" || status.toUpperCase().includes("IN_PROGRESS");
  const isFinal =
    status === "final_" || status === "final" || status.startsWith("final_");
  return (
    <span
      className={cn(
        "px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-widest",
        isLive
          ? "border-primary/60 text-primary bg-primary/10 animate-pulse"
          : isFinal
            ? "border-muted-foreground/40 text-muted-foreground bg-muted/30"
            : "border-border/50 text-muted-foreground bg-card/60",
      )}
    >
      {isLive ? "LIVE" : isFinal ? "FINAL" : "UPCOMING"}
    </span>
  );
}

// ─── Tab button ───────────────────────────────────────────────────────────────
function TabButton({
  active,
  onClick,
  children,
  ocid,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  ocid: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-ocid={ocid}
      className={cn(
        "relative px-4 py-2.5 text-xs font-mono uppercase tracking-widest transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <motion.div
          layoutId="tab-indicator"
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"
        />
      )}
    </button>
  );
}

// ─── Skeleton layout ──────────────────────────────────────────────────────────
function InvestigationSkeleton() {
  return (
    <div
      className="space-y-4 max-w-screen-xl mx-auto px-4 py-6"
      data-ocid="investigation.loading_state"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="rounded-xl border border-border/40 bg-card p-6 space-y-3">
        <Skeleton className="h-8 w-96" />
        <div className="flex gap-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
      <div className="flex gap-1 border-b border-border/40">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-28 mb-px" />
        ))}
      </div>
      <div className="space-y-4">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border/40 bg-card p-5 space-y-3"
          >
            <Skeleton className="h-6 w-48" />
            <div className="grid grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-12" />
              ))}
            </div>
            <Skeleton className="h-24 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
type TabId = "props" | "total" | "odds" | "edge";

export default function InvestigationPage() {
  const { gameId } = useParams({ from: "/game/$gameId" });
  const { gameDate } = useSearch({ from: "/game/$gameId" });
  const navigate = useNavigate();
  const {
    data: investigation,
    isLoading,
    isError,
    error,
    refetch,
  } = useGameDetail(gameId, gameDate ?? "");
  const [activeTab, setActiveTab] = useState<TabId>("props");

  // Fix 4: validate gameId and log for debugging
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log("[InvestigationPage] gameId:", gameId);
    }
    if (!gameId) {
      navigate({ to: "/" });
    }
  }, [gameId, navigate]);

  // Show skeleton while loading or while actor initializes
  if (isLoading) return <InvestigationSkeleton />;

  // Show error card with actual error message — never spin forever on failure
  if (isError) {
    const errMsg =
      error instanceof Error
        ? error.message
        : "Could not load investigation data for this game";
    return (
      <div
        className="max-w-screen-xl mx-auto px-4 py-20 flex flex-col items-center gap-6"
        data-ocid="investigation.error_state"
      >
        <div className="w-16 h-16 rounded-full border border-destructive/40 bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <div className="text-center space-y-2 max-w-sm">
          <p className="font-display font-bold text-foreground">
            Investigation data failed to load
          </p>
          <p className="text-sm font-body text-destructive font-mono">
            {errMsg}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/60 mt-1">
            gameId: {gameId}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground/50">
            Check DevTools → Console for [EdgeStack] logs
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="font-mono text-xs"
            data-ocid="investigation.retry_button"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Retry
          </Button>
          <Link to="/">
            <Button
              variant="ghost"
              size="sm"
              className="font-mono text-xs"
              data-ocid="investigation.back_link"
            >
              <ArrowLeft className="w-3 h-3 mr-2" />
              Back to Games
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // No data and no error means actor is still initializing — keep skeleton
  if (!investigation) return <InvestigationSkeleton />;

  const { game, injuries } = investigation;
  const homeTeam = game.homeTeam;
  const awayTeam = game.awayTeam;

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-0">
      {/* Back nav */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          data-ocid="investigation.back_link"
        >
          <ArrowLeft className="w-3 h-3" />
          Games
        </Link>
        <span className="text-muted-foreground/40">/</span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-foreground">
          {awayTeam.abbreviation} @ {homeTeam.abbreviation}
        </span>
      </div>

      {/* Sticky game header */}
      <div
        className="sticky top-0 z-10 rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm p-5 mb-0 space-y-3"
        data-ocid="investigation.game_header"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display font-bold text-2xl text-foreground tracking-tight">
                {teamFullName(awayTeam.city, awayTeam.name)}
                <span className="mx-3 text-muted-foreground/50">@</span>
                {teamFullName(homeTeam.city, homeTeam.name)}
              </h1>
              <StatusBadge status={game.status as string} />
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {game.displayTime || "TBD"}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {game.venue}
              </span>
              {game.series && (
                <span className="flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-accent" />
                  {game.series}
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="text-center">
              <div className="font-display font-bold text-lg text-foreground">
                {awayTeam.abbreviation}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {awayTeam.record}
              </div>
            </div>
            <div className="font-mono text-muted-foreground/40 text-xl self-center">
              @
            </div>
            <div className="text-center">
              <div className="font-display font-bold text-lg text-foreground">
                {homeTeam.abbreviation}
              </div>
              <div className="text-[10px] font-mono text-muted-foreground">
                {homeTeam.record}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div
        className="flex border-b border-border/40 mt-5 mb-5"
        data-ocid="investigation.tabs"
      >
        <TabButton
          active={activeTab === "props"}
          onClick={() => setActiveTab("props")}
          ocid="investigation.tab.props"
        >
          <span className="flex items-center gap-1.5">
            <BarChart3 className="w-3 h-3" />
            Player Props
          </span>
        </TabButton>
        <TabButton
          active={activeTab === "total"}
          onClick={() => setActiveTab("total")}
          ocid="investigation.tab.total"
        >
          <span className="flex items-center gap-1.5">
            <TrendingUp className="w-3 h-3" />
            Game Total
          </span>
        </TabButton>
        <TabButton
          active={activeTab === "odds"}
          onClick={() => setActiveTab("odds")}
          ocid="investigation.tab.odds"
        >
          <span className="flex items-center gap-1.5">
            <Swords className="w-3 h-3" />
            All Odds
          </span>
        </TabButton>
        <TabButton
          active={activeTab === "edge"}
          onClick={() => setActiveTab("edge")}
          ocid="investigation.tab.edge"
        >
          <span className="flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            Edge
          </span>
        </TabButton>
      </div>

      {/* Tab panels */}
      <div data-ocid="investigation.panel">
        {activeTab === "props" && (
          <PlayerPropsTab
            gameId={gameId}
            injuries={injuries}
            isActiveTab={activeTab === "props"}
          />
        )}
        {activeTab === "total" && (
          <GameTotalTab
            gameId={gameId}
            homeTeamName={teamFullName(homeTeam.city, homeTeam.name)}
            awayTeamName={teamFullName(awayTeam.city, awayTeam.name)}
            isActiveTab={activeTab === "total"}
          />
        )}
        {activeTab === "odds" && <AllOddsTab investigation={investigation} />}
        {activeTab === "edge" && <EdgeTab investigation={investigation} />}
      </div>
    </div>
  );
}
