import { c as createLucideIcon, u as useQueryClient, a as useTodayGames, j as jsxRuntimeExports, b as cn, r as reactExports, S as Skeleton, L as Link } from "./index-C0SLgS7f.js";
import { m as motion } from "./proxy-Bc22TOLI.js";
import { T as Trophy, R as RefreshCw, C as Clock } from "./trophy-DYw45Noq.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M3 10h18", key: "8toen8" }]
];
const Calendar = createLucideIcon("calendar", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]];
const ChevronRight = createLucideIcon("chevron-right", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["line", { x1: "12", x2: "12", y1: "8", y2: "12", key: "1pkeuh" }],
  ["line", { x1: "12", x2: "12.01", y1: "16", y2: "16", key: "4dfq90" }]
];
const CircleAlert = createLucideIcon("circle-alert", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M12 20h.01", key: "zekei9" }],
  ["path", { d: "M2 8.82a15 15 0 0 1 20 0", key: "dnpr2z" }],
  ["path", { d: "M5 12.859a10 10 0 0 1 14 0", key: "1x1e6c" }],
  ["path", { d: "M8.5 16.429a5 5 0 0 1 7 0", key: "1bycff" }]
];
const Wifi = createLucideIcon("wifi", __iconNode);
const STATUS_MAP = {
  scheduled: {
    label: "Upcoming",
    dotClass: "bg-muted-foreground",
    badgeClass: "text-muted-foreground border-border/50 bg-muted/30"
  },
  inProgress: {
    label: "Live",
    dotClass: "bg-primary animate-pulse",
    badgeClass: "text-primary border-primary/50 bg-primary/10"
  },
  final: {
    label: "Final",
    dotClass: "bg-muted-foreground/50",
    badgeClass: "text-muted-foreground/70 border-border/30 bg-transparent"
  },
  postponed: {
    label: "Postponed",
    dotClass: "bg-accent",
    badgeClass: "text-accent border-accent/40 bg-accent/5"
  }
};
const teamFullName = (city, name) => {
  if (!city || !name) return name || city || "";
  if (name.toLowerCase().startsWith(city.toLowerCase())) return name;
  return `${city} ${name}`;
};
function getStatusConfig(status) {
  const key = status;
  return STATUS_MAP[key] ?? {
    label: key,
    dotClass: "bg-muted-foreground",
    badgeClass: "text-muted-foreground border-border/40"
  };
}
function OddsTeaser({
  homeAbbr,
  awayAbbr
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[9px] font-mono uppercase tracking-widest text-muted-foreground/50", children: [
      awayAbbr,
      " @ ",
      homeAbbr
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-mono text-muted-foreground/40", children: "— Spreads · O/U · Moneylines inside" })
  ] });
}
function GameCard({
  game,
  index,
  gamesDate
}) {
  const statusConfig = getStatusConfig(game.status);
  const statusStr = game.status ?? "";
  const isLive = statusStr === "inProgress" || statusStr.toUpperCase().includes("IN_PROGRESS");
  const isFinal = statusStr === "final" || statusStr.startsWith("final_");
  const gameTime = game.displayTime || "TBD";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    motion.div,
    {
      initial: { opacity: 0, y: 18 },
      animate: { opacity: 1, y: 0 },
      transition: { duration: 0.28, delay: index * 0.06 },
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        Link,
        {
          to: "/game/$gameId",
          params: { gameId: game.id },
          search: { gameDate: gamesDate },
          "data-ocid": `games.item.${index + 1}`,
          className: "block group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl",
          children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: cn(
                "relative rounded-xl border bg-card cursor-pointer overflow-hidden",
                "transition-all duration-200",
                isLive ? "border-primary/30 shadow-[0_0_20px_oklch(0.65_0.18_145_/_0.08)] group-hover:border-primary/60 group-hover:shadow-[0_0_30px_oklch(0.65_0.18_145_/_0.15)]" : "border-border/50 group-hover:border-primary/35 group-hover:bg-card/90"
              ),
              children: [
                isLive && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3 gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "span",
                        {
                          className: cn(
                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[10px] font-mono uppercase tracking-widest shrink-0",
                            statusConfig.badgeClass
                          ),
                          children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "span",
                              {
                                className: cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  statusConfig.dotClass
                                )
                              }
                            ),
                            statusConfig.label
                          ]
                        }
                      ),
                      game.series && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono text-muted-foreground uppercase tracking-wide truncate", children: game.series })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 shrink-0", children: [
                      !isFinal && /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3 h-3 text-muted-foreground/60" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] font-mono font-semibold text-foreground/80", children: gameTime })
                      ] }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { className: "w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors ml-1" })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-1.5 mb-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2.5 min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-[22px] font-bold text-foreground tracking-tight leading-none", children: game.awayTeam.abbreviation }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-body text-muted-foreground truncate", children: teamFullName(game.awayTeam.city, game.awayTeam.name) }),
                      game.awayTeam.record && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono text-muted-foreground/60 ml-auto shrink-0", children: game.awayTeam.record })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-px bg-border/30" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono text-muted-foreground/50 uppercase", children: "at" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 h-px bg-border/30" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2.5 min-w-0", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-display text-[22px] font-bold text-foreground tracking-tight leading-none", children: game.homeTeam.abbreviation }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-body text-muted-foreground truncate", children: teamFullName(game.homeTeam.city, game.homeTeam.name) }),
                      game.homeTeam.record && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono text-muted-foreground/60 ml-auto shrink-0", children: game.homeTeam.record })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2.5 border-t border-border/30", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                    OddsTeaser,
                    {
                      homeAbbr: game.homeTeam.abbreviation,
                      awayAbbr: game.awayTeam.abbreviation
                    }
                  ) })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-2 border-t border-border/20 bg-muted/10 flex items-center justify-between", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/50", children: game.venue }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[9px] font-mono text-primary opacity-0 group-hover:opacity-100 transition-opacity", children: "Investigate →" })
                ] })
              ]
            }
          )
        }
      )
    }
  );
}
function LoadingSkeleton() {
  return /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-3 sm:grid-cols-2 lg:grid-cols-3", children: [1, 2, 3].map((i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-xl border border-border/40 bg-card overflow-hidden",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "p-4 space-y-3", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-5 w-20 rounded" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-16 rounded" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "space-y-2", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-7 w-12 rounded" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-32 rounded" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-px w-full" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-baseline gap-2", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-7 w-12 rounded" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-28 rounded" })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-4 w-full rounded" })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-2 border-t border-border/20", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Skeleton, { className: "h-3 w-24 rounded" }) })
      ]
    },
    i
  )) });
}
function RefreshIndicator({ dataUpdatedAt }) {
  const [label, setLabel] = reactExports.useState("Just now");
  reactExports.useEffect(() => {
    const update = () => {
      const diff = Math.floor((Date.now() - dataUpdatedAt) / 1e3);
      if (diff < 60) setLabel("Just now");
      else if (diff < 120) setLabel("1 min ago");
      else setLabel(`${Math.floor(diff / 60)} min ago`);
    };
    update();
    const timer = setInterval(update, 3e4);
    return () => clearInterval(timer);
  }, [dataUpdatedAt]);
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(Wifi, { className: "w-3 h-3 text-muted-foreground/50" }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] font-mono text-muted-foreground/60", children: [
      "Refreshed ",
      label
    ] })
  ] });
}
function GamesPage() {
  const queryClient = useQueryClient();
  const {
    data: gamesResponse,
    isLoading,
    isError,
    error,
    dataUpdatedAt,
    refetch,
    isFetching
  } = useTodayGames();
  const games = (gamesResponse == null ? void 0 : gamesResponse.games) ?? [];
  const gamesDate = (gamesResponse == null ? void 0 : gamesResponse.gamesDate) ?? "";
  const isUpcomingDate = (gamesResponse == null ? void 0 : gamesResponse.isUpcomingDate) ?? false;
  const sortedGames = [...games].sort((a, b) => {
    const parseTime = (t) => {
      if (!t) return Number.POSITIVE_INFINITY;
      const d = new Date(t);
      return Number.isNaN(d.getTime()) ? Number.POSITIVE_INFINITY : d.getTime();
    };
    return parseTime(a.gameTime) - parseTime(b.gameTime);
  });
  const formatGamesDate = (dateStr) => {
    if (!dateStr) return "";
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric"
    });
  };
  const pageTitle = isUpcomingDate ? `Next Games: ${formatGamesDate(gamesDate)}` : "Today's Games";
  const todayLabel = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
  const handleRetry = () => {
    queryClient.invalidateQueries({ queryKey: ["today-games"] });
    refetch();
  };
  const devDebug = null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "max-w-screen-2xl mx-auto px-4 py-6", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "mb-7", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: -8 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3 },
          className: "flex items-start justify-between gap-4 flex-wrap",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-1.5", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "w-3.5 h-3.5 text-primary" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono uppercase tracking-[0.25em] text-primary font-semibold", children: "NBA Playoffs" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "w-1 h-1 rounded-full bg-border/60" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] font-mono uppercase tracking-[0.15em] text-muted-foreground", children: todayLabel })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "font-display text-2xl font-bold text-foreground tracking-tight", children: pageTitle }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-body text-muted-foreground mt-0.5", children: isUpcomingDate ? `No games today — next slate on ${formatGamesDate(gamesDate)}` : "Select a game to open the investigation room" })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 pt-1", children: [
              dataUpdatedAt > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshIndicator, { dataUpdatedAt }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  onClick: handleRetry,
                  disabled: isFetching,
                  "data-ocid": "games.refresh_button",
                  className: cn(
                    "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border/40 text-[10px] font-mono uppercase tracking-widest",
                    "text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors",
                    isFetching && "opacity-50 cursor-not-allowed"
                  ),
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      RefreshCw,
                      {
                        className: cn("w-3 h-3", isFetching && "animate-spin")
                      }
                    ),
                    "Refresh"
                  ]
                }
              )
            ] })
          ]
        }
      ),
      devDebug,
      isUpcomingDate && gamesDate && !isLoading && !isError && /* @__PURE__ */ jsxRuntimeExports.jsxs(
        motion.div,
        {
          initial: { opacity: 0, y: 6 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, delay: 0.1 },
          className: "mt-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-accent/30 bg-accent/5",
          "data-ocid": "games.upcoming_banner",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { className: "w-4 h-4 text-accent shrink-0" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-mono font-semibold text-accent", children: [
                "No games today — Next Games: ",
                formatGamesDate(gamesDate)
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-[11px] font-body text-muted-foreground", children: "Showing the upcoming playoff slate · Check back on game day" })
            ] })
          ]
        }
      ),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-4 h-px bg-gradient-to-r from-primary/30 via-border/40 to-transparent" })
    ] }),
    isLoading && /* @__PURE__ */ jsxRuntimeExports.jsx(LoadingSkeleton, {}),
    isError && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { opacity: 0, scale: 0.97 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.25 },
        className: "flex flex-col items-center justify-center py-16 space-y-4",
        "data-ocid": "games.error_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 h-14 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(CircleAlert, { className: "w-6 h-6 text-destructive" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-base font-semibold text-foreground", children: "Could not load today's games" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-mono text-muted-foreground max-w-sm", children: error instanceof Error ? error.message : "Connection error — check your network" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: handleRetry,
              "data-ocid": "games.retry_button",
              className: "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-mono uppercase tracking-widest hover:bg-primary/10 hover:border-primary/60 transition-all",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(RefreshCw, { className: "w-3.5 h-3.5" }),
                "Retry"
              ]
            }
          )
        ]
      }
    ),
    !isLoading && !isError && sortedGames.length === 0 && !isUpcomingDate && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      motion.div,
      {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        transition: { duration: 0.3, delay: 0.1 },
        className: "flex flex-col items-center justify-center py-20 space-y-4",
        "data-ocid": "games.empty_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-2xl bg-muted/40 border border-border/40 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trophy, { className: "w-7 h-7 text-muted-foreground/60" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-card border border-border/40 flex items-center justify-center", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { className: "w-3.5 h-3.5 text-muted-foreground/60" }) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-center space-y-1.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-display text-lg font-semibold text-foreground", children: "No NBA Games Today" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-body text-muted-foreground", children: "No games scheduled for today's slate." }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-mono text-muted-foreground/60", children: "Check back on the next game day" })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: handleRetry,
              disabled: isFetching,
              "data-ocid": "games.empty_refresh_button",
              className: cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border/40 text-[10px] font-mono uppercase tracking-widest",
                "text-muted-foreground hover:text-foreground hover:border-border/70 transition-colors",
                isFetching && "opacity-50 cursor-not-allowed"
              ),
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  RefreshCw,
                  {
                    className: cn("w-3 h-3", isFetching && "animate-spin")
                  }
                ),
                "Refresh"
              ]
            }
          )
        ]
      }
    ),
    !isLoading && sortedGames.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid gap-4 sm:grid-cols-2 lg:grid-cols-3", children: sortedGames.map((game, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      GameCard,
      {
        game,
        index: i,
        gamesDate
      },
      game.id
    )) })
  ] });
}
export {
  GamesPage as default
};
