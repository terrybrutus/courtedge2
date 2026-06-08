import { Badge } from "@/components/ui/badge";
import { CheckCircle2 } from "lucide-react";
import { motion } from "motion/react";

export default function SettingsPage() {
  const apis = [
    {
      name: "Ball Don't Lie API",
      description: "Game data, player stats, team records, season averages",
      icon: "🏀",
      ocid: "settings.bdl_status",
    },
    {
      name: "The Odds API",
      description:
        "Live odds from multiple sportsbooks — spreads, moneylines, O/U",
      icon: "📊",
      ocid: "settings.odds_status",
    },
    {
      name: "Claude AI",
      description:
        "AI-generated plain-language analysis and confidence reasoning",
      icon: "🤖",
      ocid: "settings.openai_status",
    },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-7"
      >
        <h1 className="font-display text-2xl font-bold text-foreground tracking-tight">
          System Status
        </h1>
        <p className="text-sm font-body text-muted-foreground mt-1">
          All data sources are active and connected.
        </p>
      </motion.div>

      <div className="space-y-3">
        {apis.map((api, i) => (
          <motion.div
            key={api.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.07 }}
            className="rounded-xl border border-border/50 bg-card p-4"
            data-ocid={api.ocid}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center text-base shrink-0">
                  {api.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm font-semibold text-foreground">
                    {api.name}
                  </h3>
                  <p className="text-[11px] font-body text-muted-foreground truncate">
                    {api.description}
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] font-mono border-primary/40 text-primary bg-primary/5 gap-1.5 shrink-0"
              >
                <CheckCircle2 className="w-3 h-3" />
                Connected
              </Badge>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Info footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mt-6 px-4 py-3 rounded-lg border border-border/30 bg-muted/20"
      >
        <p className="text-[11px] font-mono text-muted-foreground/80">
          All API keys are pre-configured. EdgeStack is ready to analyze any
          matchup.
        </p>
      </motion.div>
    </div>
  );
}
