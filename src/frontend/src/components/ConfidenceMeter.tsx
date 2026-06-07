import { cn } from "@/lib/utils";
import { motion } from "motion/react";

interface ConfidenceMeterProps {
  score: number;
  grade: string;
  description?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

function getColor(score: number): string {
  if (score >= 70) return "bg-primary";
  if (score >= 40) return "bg-accent";
  return "bg-destructive";
}

function getTextColor(score: number): string {
  if (score >= 70) return "text-primary";
  if (score >= 40) return "text-accent";
  return "text-destructive";
}

function getGlowColor(score: number): string {
  if (score >= 70) return "shadow-[0_0_12px_oklch(0.65_0.18_145/0.5)]";
  if (score >= 40) return "shadow-[0_0_12px_oklch(0.7_0.15_85/0.4)]";
  return "shadow-[0_0_12px_oklch(0.55_0.22_25/0.4)]";
}

export function ConfidenceMeter({
  score,
  grade,
  description,
  size = "md",
  className,
}: ConfidenceMeterProps) {
  const barHeight = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  const labelSize =
    size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm";
  const scoreSize =
    size === "sm" ? "text-lg" : size === "lg" ? "text-3xl" : "text-xl";

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "font-mono uppercase tracking-widest text-muted-foreground",
            labelSize,
          )}
        >
          Confidence
        </span>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-display font-bold",
              scoreSize,
              getTextColor(score),
            )}
          >
            {score}
          </span>
          <span
            className={cn(
              "px-1.5 py-0.5 rounded text-xs font-mono font-bold border",
              score >= 70
                ? "border-primary/40 text-primary bg-primary/10"
                : score >= 40
                  ? "border-accent/40 text-accent bg-accent/10"
                  : "border-destructive/40 text-destructive bg-destructive/10",
            )}
          >
            {grade}
          </span>
        </div>
      </div>

      <div className="relative w-full bg-muted rounded-full overflow-hidden">
        <div className={cn("absolute inset-0 opacity-10", getColor(score))} />
        <motion.div
          className={cn(
            "relative rounded-full",
            barHeight,
            getColor(score),
            getGlowColor(score),
          )}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
        />
      </div>

      <div className="flex justify-between">
        <span className="text-xs font-mono text-muted-foreground">0</span>
        <span className="text-xs font-mono text-muted-foreground">100</span>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground leading-relaxed font-body">
          {description}
        </p>
      )}
    </div>
  );
}
