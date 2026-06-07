import { cn } from "@/lib/utils";
import type { Discrepancy, OddsLine } from "@/types";
import { formatMoneyline, formatSpread } from "@/types";
import { AlertTriangle } from "lucide-react";

interface OddsCardProps {
  odds: OddsLine[];
  discrepancies?: Discrepancy[];
  awayTeam: string;
}

function hasDiscrepancy(
  bookmaker: string,
  betType: string,
  discrepancies: Discrepancy[],
) {
  return discrepancies.some(
    (d) =>
      (d.minBook === bookmaker || d.maxBook === bookmaker) &&
      d.betType === betType,
  );
}

function DiscrepancyBadge({ gap }: { gap: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border border-accent/50 text-accent bg-accent/10">
      <AlertTriangle className="w-2.5 h-2.5" />+{gap.toFixed(1)}
    </span>
  );
}

export function OddsCard({
  odds,
  discrepancies = [],
  awayTeam,
}: OddsCardProps) {
  if (!odds.length) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 text-center text-sm text-muted-foreground font-mono">
        No odds data available
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="grid grid-cols-[140px_1fr_1fr_1fr] gap-2 px-3 py-1.5">
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          Book
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-center">
          {awayTeam} ML
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-center">
          Spread
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground text-center">
          O/U
        </span>
      </div>

      {odds.map((line) => {
        const mlDisc = hasDiscrepancy(
          line.bookmaker,
          "moneyline",
          discrepancies,
        );
        const spreadDisc = hasDiscrepancy(
          line.bookmaker,
          "spread",
          discrepancies,
        );
        const ouDisc = hasDiscrepancy(
          line.bookmaker,
          "overUnder",
          discrepancies,
        );

        return (
          <div
            key={line.bookmaker}
            className={cn(
              "grid grid-cols-[140px_1fr_1fr_1fr] gap-2 px-3 py-2.5 rounded-lg border transition-colors",
              mlDisc || spreadDisc || ouDisc
                ? "border-accent/40 bg-accent/5"
                : "border-border/50 bg-card/60 hover:bg-card",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wide">
                {line.bookmaker}
              </span>
            </div>

            {/* Away Moneyline */}
            <div className={cn("flex flex-col items-center gap-0.5")}>
              <span
                className={cn(
                  "font-mono text-sm font-bold",
                  mlDisc ? "text-accent" : "text-foreground",
                )}
              >
                {formatMoneyline(line.awayMoneyline)}
              </span>
              {mlDisc && (
                <DiscrepancyBadge
                  gap={
                    discrepancies.find(
                      (d) =>
                        (d.minBook === line.bookmaker ||
                          d.maxBook === line.bookmaker) &&
                        d.betType === "moneyline",
                    )?.gap ?? 0
                  }
                />
              )}
            </div>

            {/* Spread */}
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  "font-mono text-sm font-bold",
                  spreadDisc ? "text-accent" : "text-foreground",
                )}
              >
                {formatSpread(line.awaySpread)}
              </span>
              {line.awaySpreadOdds !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({formatMoneyline(line.awaySpreadOdds)})
                </span>
              )}
            </div>

            {/* Over/Under */}
            <div className="flex flex-col items-center gap-0.5">
              <span
                className={cn(
                  "font-mono text-sm font-bold",
                  ouDisc ? "text-accent" : "text-foreground",
                )}
              >
                {line.overUnder?.toFixed(1) ?? "N/A"}
              </span>
              {line.overOdds !== undefined && (
                <span className="text-[10px] font-mono text-muted-foreground">
                  ({formatMoneyline(line.overOdds)})
                </span>
              )}
            </div>
          </div>
        );
      })}

      {discrepancies.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-accent/30 bg-accent/5">
          <AlertTriangle className="w-3.5 h-3.5 text-accent shrink-0" />
          <span className="text-xs font-mono text-accent">
            {discrepancies.length} line discrepanc
            {discrepancies.length === 1 ? "y" : "ies"} detected — potential
            market edge
          </span>
        </div>
      )}
    </div>
  );
}
