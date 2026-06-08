import type { BetRecommendation } from "@/backend";
import { BetStatus, BetType } from "@/backend";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useBetHistory,
  useBetHistoryStats,
  useUpdateBetOutcome,
} from "@/hooks/useBackend";
import { cn } from "@/lib/utils";
import {
  Activity,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(ts: bigint): string {
  const d = new Date(Number(ts));
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusColor(status: BetStatus): string {
  switch (status) {
    case BetStatus.won:
      return "border-primary/40 text-primary bg-primary/5";
    case BetStatus.lost:
      return "border-destructive/40 text-destructive bg-destructive/5";
    case BetStatus.push:
      return "border-accent/40 text-accent bg-accent/5";
    case BetStatus.cancelled:
      return "border-border/40 text-muted-foreground bg-muted/20";
    default:
      return "border-border/50 text-muted-foreground/80 bg-transparent";
  }
}

function getStatusLabel(status: BetStatus): string {
  switch (status) {
    case BetStatus.won:
      return "Won";
    case BetStatus.lost:
      return "Lost";
    case BetStatus.push:
      return "Push";
    case BetStatus.cancelled:
      return "Cancelled";
    default:
      return "Pending";
  }
}

function getBetTypeLabel(type: BetType): string {
  switch (type) {
    case BetType.playerProp:
      return "Player Prop";
    case BetType.gameTotal:
      return "Game Total";
    case BetType.spread:
      return "Spread";
    default:
      return String(type);
  }
}

function ConfidenceMeter({ score }: { score: bigint }) {
  const n = Number(score);
  const color =
    n >= 70 ? "bg-primary" : n >= 45 ? "bg-accent" : "bg-destructive/60";
  const label = n >= 70 ? "High" : n >= 45 ? "Medium" : "Low";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
          Confidence
        </span>
        <span className="text-[10px] font-mono font-semibold text-foreground">
          {n}% {label}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${n}%` }}
        />
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatsBar() {
  const { data: stats, isLoading } = useBetHistoryStats();

  const statItems = stats
    ? [
        {
          label: "Total Bets",
          value: String(stats.totalBets),
          icon: Target,
          color: "text-foreground",
        },
        {
          label: "Won",
          value: String(stats.wonBets),
          icon: TrendingUp,
          color: "text-primary",
        },
        {
          label: "Lost",
          value: String(stats.lostBets),
          icon: TrendingDown,
          color: "text-destructive",
        },
        {
          label: "Pending",
          value: String(stats.pendingBets),
          icon: Activity,
          color: "text-accent",
        },
        {
          label: "Win Rate",
          value: `${(stats.winRate * 100).toFixed(1)}%`,
          icon: CheckCircle2,
          color: "text-primary",
        },
      ]
    : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-20 rounded-xl" />
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div
      className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-7"
      data-ocid="history.stats_panel"
    >
      {statItems.map((item, i) => (
        <motion.div
          key={item.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: i * 0.05 }}
          className="rounded-xl border border-border/50 bg-card p-3 space-y-1.5"
        >
          <div className="flex items-center gap-1.5">
            <item.icon className={cn("w-3 h-3", item.color)} />
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              {item.label}
            </span>
          </div>
          <p className={cn("font-display text-2xl font-bold", item.color)}>
            {item.value}
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Outcome updater ─────────────────────────────────────────────────────────

function OutcomeUpdater({ bet }: { bet: BetRecommendation }) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<BetStatus>(
    BetStatus.won,
  );
  const [result, setResult] = useState("");
  const updateOutcome = useUpdateBetOutcome();

  const handleSubmit = () => {
    updateOutcome.mutate(
      { id: bet.id, status: selectedStatus, gameResult: result.trim() || null },
      {
        onSuccess: () => {
          toast.success("Bet outcome updated", {
            description: `Marked as ${getStatusLabel(selectedStatus)}`,
          });
          setOpen(false);
          setResult("");
        },
        onError: (err) =>
          toast.error("Failed to update", { description: err.message }),
      },
    );
  };

  if (bet.status !== BetStatus.pending) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/25">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        data-ocid="history.outcome_toggle"
        className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? (
          <ChevronUp className="w-3 h-3" />
        ) : (
          <ChevronDown className="w-3 h-3" />
        )}
        Update Outcome
      </button>

      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.2 }}
          className="mt-3 space-y-3"
        >
          {/* Status selector */}
          <div className="flex gap-2 flex-wrap">
            {[BetStatus.won, BetStatus.lost, BetStatus.push].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedStatus(s)}
                data-ocid={`history.outcome_status_${s}`}
                className={cn(
                  "px-3 py-1 rounded-md border text-[10px] font-mono uppercase tracking-widest transition-colors",
                  selectedStatus === s
                    ? getStatusColor(s)
                    : "border-border/40 text-muted-foreground hover:border-border/60",
                )}
              >
                {getStatusLabel(s)}
              </button>
            ))}
          </div>

          {/* Result text */}
          <input
            type="text"
            value={result}
            onChange={(e) => setResult(e.target.value)}
            placeholder="e.g. LeBron scored 31 pts (optional)"
            data-ocid="history.outcome_result_input"
            className="w-full px-3 py-2 rounded-md border border-border/50 bg-background text-xs font-mono text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus-visible:border-primary/60 focus-visible:ring-1 focus-visible:ring-primary/40"
          />

          <button
            type="button"
            onClick={handleSubmit}
            disabled={updateOutcome.isPending}
            data-ocid="history.outcome_save_button"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary/40 bg-primary/5 text-primary text-[10px] font-mono uppercase tracking-widest hover:bg-primary/10 hover:border-primary/60 transition-all disabled:opacity-50"
          >
            {updateOutcome.isPending ? "Saving…" : "Save Outcome"}
          </button>
        </motion.div>
      )}
    </div>
  );
}

// ─── Bet card ─────────────────────────────────────────────────────────────────

function BetCard({ bet, index }: { bet: BetRecommendation; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const isWon = bet.status === BetStatus.won;
  const isLost = bet.status === BetStatus.lost;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.05 }}
      className={cn(
        "rounded-xl border bg-card overflow-hidden transition-colors",
        isWon && "border-primary/30",
        isLost && "border-destructive/25",
        !isWon && !isLost && "border-border/50",
      )}
      data-ocid={`history.item.${index + 1}`}
    >
      {/* Win/Loss accent bar */}
      {(isWon || isLost) && (
        <div
          className={cn(
            "h-[2px]",
            isWon
              ? "bg-gradient-to-r from-transparent via-primary to-transparent"
              : "bg-gradient-to-r from-transparent via-destructive/60 to-transparent",
          )}
        />
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] font-mono uppercase tracking-widest shrink-0",
                getStatusColor(bet.status),
              )}
            >
              {getStatusLabel(bet.status)}
            </Badge>
            <Badge
              variant="outline"
              className="text-[9px] font-mono uppercase tracking-widest border-border/40 text-muted-foreground bg-transparent shrink-0"
            >
              {getBetTypeLabel(bet.betType)}
            </Badge>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0">
            {formatDate(bet.recommendedAt)}
          </span>
        </div>

        {/* Matchup */}
        <div className="mb-3">
          <p className="text-[11px] font-mono text-muted-foreground mb-1">
            {bet.awayTeam} @ {bet.homeTeam}
          </p>
          <p className="font-display text-base font-bold text-foreground tracking-tight">
            {bet.description}
          </p>
        </div>

        {/* Confidence + odds row */}
        <div className="space-y-2 mb-3">
          <ConfidenceMeter score={bet.confidence} />
          {bet.preGameOdds && (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
                Pre-game odds
              </span>
              <span className="text-[11px] font-mono font-semibold text-foreground">
                {bet.preGameOdds}
              </span>
            </div>
          )}
        </div>

        {/* Reasoning — expandable */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            data-ocid={`history.reasoning_toggle.${index + 1}`}
            className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
          >
            {expanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
            {expanded ? "Hide reasoning" : "Show reasoning"}
          </button>
          {expanded && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              transition={{ duration: 0.2 }}
              className="text-xs font-body text-muted-foreground leading-relaxed pt-1"
            >
              {bet.reasoning}
            </motion.p>
          )}
        </div>

        {/* Game result */}
        {bet.gameResult && (
          <div className="mt-3 pt-3 border-t border-border/25">
            <p className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground mb-0.5">
              Result
            </p>
            <p className="text-xs font-body text-foreground">
              {bet.gameResult}
            </p>
          </div>
        )}

        {/* CLV score */}
        {bet.clvScore !== undefined && bet.clvScore !== null && (
          <div className="mt-3 pt-3 border-t border-border/25 flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              Closing Line Value
            </span>
            <span
              className={cn(
                "text-[11px] font-mono font-semibold",
                bet.clvScore > 0 ? "text-primary" : "text-destructive",
              )}
            >
              {bet.clvScore > 0 ? "+" : ""}
              {bet.clvScore.toFixed(1)} CLV
            </span>
          </div>
        )}

        {/* Closing line */}
        {bet.closingLine && (
          <div className="flex items-center justify-between mt-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              Closing Line
            </span>
            <span className="text-[11px] font-mono text-muted-foreground">
              {bet.closingLine}
            </span>
          </div>
        )}

        {/* Outcome updater for pending */}
        <OutcomeUpdater bet={bet} />
      </div>
    </motion.div>
  );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterKey =
  | "all"
  | "playerProp"
  | "gameTotal"
  | "won"
  | "lost"
  | "pending";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "playerProp", label: "Player Props" },
  { key: "gameTotal", label: "Game Totals" },
  { key: "won", label: "Won" },
  { key: "lost", label: "Lost" },
  { key: "pending", label: "Pending" },
];

function filterBets(
  bets: BetRecommendation[],
  filter: FilterKey,
): BetRecommendation[] {
  switch (filter) {
    case "playerProp":
      return bets.filter((b) => b.betType === BetType.playerProp);
    case "gameTotal":
      return bets.filter((b) => b.betType === BetType.gameTotal);
    case "won":
      return bets.filter((b) => b.status === BetStatus.won);
    case "lost":
      return bets.filter((b) => b.status === BetStatus.lost);
    case "pending":
      return bets.filter((b) => b.status === BetStatus.pending);
    default:
      return bets;
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const { data: bets = [], isLoading } = useBetHistory();

  // Sort by most recent first
  const sorted = [...bets].sort(
    (a, b) => Number(b.recommendedAt) - Number(a.recommendedAt),
  );
  const filtered = filterBets(sorted, activeFilter);

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-primary font-semibold">
            EdgeStack
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
          Bet History
        </h1>
        <p className="text-sm font-body text-muted-foreground mt-0.5">
          All past recommendations with outcomes and performance tracking
        </p>
      </motion.div>

      {/* Stats */}
      <StatsBar />

      {/* Filter tabs */}
      <div
        className="flex items-center gap-1.5 flex-wrap mb-5"
        data-ocid="history.filter_tabs"
      >
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setActiveFilter(f.key)}
            data-ocid={`history.filter.${f.key}`}
            className={cn(
              "px-3 py-1.5 rounded-md border text-[10px] font-mono uppercase tracking-widest transition-colors",
              activeFilter === f.key
                ? "border-primary/50 text-primary bg-primary/8"
                : "border-border/40 text-muted-foreground hover:border-border/60 hover:text-foreground",
            )}
          >
            {f.label}
            {f.key !== "all" &&
              filtered.length > 0 &&
              activeFilter === f.key && (
                <span className="ml-1.5 text-[9px] opacity-70">
                  {filtered.length}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="mb-5 h-px bg-gradient-to-r from-primary/30 via-border/40 to-transparent" />

      {/* Loading */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-44 rounded-xl" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center justify-center py-20 space-y-4"
          data-ocid="history.empty_state"
        >
          <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center">
            <BookOpen className="w-7 h-7 text-muted-foreground/60" />
          </div>
          <div className="text-center space-y-1.5">
            <p className="font-display text-lg font-semibold text-foreground">
              {activeFilter === "all"
                ? "No bet recommendations yet"
                : `No ${activeFilter} bets`}
            </p>
            <p className="text-sm font-body text-muted-foreground">
              {activeFilter === "all"
                ? "Investigate a game to generate recommendations"
                : `No bets match the ${activeFilter} filter`}
            </p>
          </div>
        </motion.div>
      )}

      {/* Bets grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bet, i) => (
            <BetCard key={bet.id} bet={bet} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
