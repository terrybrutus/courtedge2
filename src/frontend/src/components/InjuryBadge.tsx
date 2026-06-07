import { cn } from "@/lib/utils";

interface InjuryBadgeProps {
  status: string;
  playerName?: string;
  description?: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  out: {
    label: "OUT",
    className: "bg-destructive/15 border-destructive/50 text-destructive",
  },
  Out: {
    label: "OUT",
    className: "bg-destructive/15 border-destructive/50 text-destructive",
  },
  questionable: {
    label: "GTD",
    className: "bg-accent/15 border-accent/50 text-accent",
  },
  Questionable: {
    label: "GTD",
    className: "bg-accent/15 border-accent/50 text-accent",
  },
  probable: {
    label: "PROB",
    className: "bg-accent/15 border-accent/50 text-accent",
  },
  Probable: {
    label: "PROB",
    className: "bg-accent/15 border-accent/50 text-accent",
  },
  active: {
    label: "ACTIVE",
    className: "bg-primary/15 border-primary/50 text-primary",
  },
  Active: {
    label: "ACTIVE",
    className: "bg-primary/15 border-primary/50 text-primary",
  },
};

function getStatusConfig(status: string) {
  const normalized = status.toLowerCase();
  return (
    STATUS_CONFIG[status] ??
    STATUS_CONFIG[normalized] ?? {
      label: status.toUpperCase(),
      className: "bg-muted border-border text-muted-foreground",
    }
  );
}

export function InjuryBadge({
  status,
  playerName,
  description,
  className,
}: InjuryBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border tracking-wider",
          config.className,
        )}
      >
        {config.label}
      </span>
      {playerName && (
        <span className="text-xs font-body text-foreground truncate max-w-[140px]">
          {playerName}
        </span>
      )}
      {description && (
        <span className="text-xs text-muted-foreground font-body truncate">
          {description}
        </span>
      )}
    </div>
  );
}
