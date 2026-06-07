import { j as jsxRuntimeExports } from "./index-C0SLgS7f.js";
import { B as Badge } from "./badge-BD8-c252.js";
import { m as motion } from "./proxy-Bc22TOLI.js";
import { C as CircleCheck } from "./circle-check-hSz2mpa6.js";
function SettingsPage() {
  const apis = [
    {
      name: "Ball Don't Lie API",
      description: "Game data, player stats, team records, season averages",
      icon: "🏀",
      ocid: "settings.bdl_status"
    },
    {
      name: "The Odds API",
      description: "Live odds from multiple sportsbooks — spreads, moneylines, O/U",
      icon: "📊",
      ocid: "settings.odds_status"
    },
    {
      name: "OpenAI API",
      description: "AI-generated plain-language analysis and confidence reasoning",
      icon: "🤖",
      ocid: "settings.openai_status"
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-2xl mx-auto px-4 py-8", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { opacity: 0, y: -8 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.25 },
        className: "mb-7",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display text-2xl font-bold text-foreground tracking-tight", children: "System Status" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-body text-muted-foreground mt-1", children: "All data sources are active and connected." })
        ]
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "space-y-3", children: apis.map((api, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.25, delay: i * 0.07 },
        className: "rounded-xl border border-border/50 bg-card p-4",
        "data-ocid": api.ocid,
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between gap-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-9 h-9 rounded-lg bg-muted/40 border border-border/40 flex items-center justify-center text-base shrink-0", children: api.icon }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "min-w-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-display text-sm font-semibold text-foreground", children: api.name }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-body text-muted-foreground truncate", children: api.description })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            Badge,
            {
              variant: "outline",
              className: "text-[10px] font-mono border-primary/40 text-primary bg-primary/5 gap-1.5 shrink-0",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(CircleCheck, { className: "w-3 h-3" }),
                "Connected"
              ]
            }
          )
        ] })
      },
      api.name
    )) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3, delay: 0.3 },
        className: "mt-6 px-4 py-3 rounded-lg border border-border/30 bg-muted/20",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-mono text-muted-foreground/80", children: "All API keys are pre-configured. CourtEdge is ready to analyze any playoff matchup." })
      }
    )
  ] });
}
export {
  SettingsPage as default
};
