// Signal stacking analysis engine — runs entirely in the browser.
// Combines multiple independent signals into a convergence score.

export type SignalDirection = "HOME" | "AWAY" | "OVER" | "UNDER" | "PASS";
export type SignalStrength = "STRONG" | "MODERATE" | "WEAK";

export interface Signal {
  category: string;       // "Line Movement", "Rest Advantage", "Weather", etc.
  direction: SignalDirection;
  strength: SignalStrength;
  description: string;
  confidence: number;     // 0-100
}

export interface StackedEdge {
  signals: Signal[];
  recommendation: SignalDirection;
  stackConfidence: number;   // 0-100 composite
  convergenceCount: number;  // how many signals agree
  summary: string;
}

// ── NBA Analysis ──────────────────────────────────────────────────────────────

export interface NbaEdgeInputs {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homeRestDays: number;
  awayRestDays: number;
  openSpread: number | null;
  currentSpread: number | null;
  openTotal: number | null;
  currentTotal: number | null;
  homeML: number | null;
  awayML: number | null;
  refereeName: string | null;
  refereeOverRate: number | null;    // % of games going over
  refereeFoulRate: number | null;    // fouls per game
  isPlayoffs: boolean;
}

export function analyzeNbaEdge(inputs: NbaEdgeInputs): StackedEdge {
  const signals: Signal[] = [];

  // 1. Rest advantage
  const restDiff = inputs.homeRestDays - inputs.awayRestDays;
  if (Math.abs(restDiff) >= 1) {
    const favored = restDiff > 0 ? "HOME" : "AWAY";
    const team = restDiff > 0 ? inputs.homeTeam : inputs.awayTeam;
    const days = Math.abs(restDiff);
    signals.push({
      category: "Rest Advantage",
      direction: favored as SignalDirection,
      strength: days >= 2 ? "STRONG" : "MODERATE",
      description: `${team} has ${days}-day rest edge (${inputs.homeRestDays}d vs ${inputs.awayRestDays}d)`,
      confidence: days >= 2 ? 70 : 58,
    });
  }

  // 2. Spread line movement
  if (inputs.openSpread !== null && inputs.currentSpread !== null) {
    const move = inputs.currentSpread - inputs.openSpread;
    if (Math.abs(move) >= 0.5) {
      const dir = move < 0 ? "HOME" : "AWAY"; // spread moved toward home = sharp on home
      const isSteam = Math.abs(move) >= 2;
      signals.push({
        category: "Spread Line Movement",
        direction: dir as SignalDirection,
        strength: isSteam ? "STRONG" : "MODERATE",
        description: `Spread moved ${move > 0 ? "+" : ""}${move.toFixed(1)} (${inputs.openSpread > 0 ? "+" : ""}${inputs.openSpread} → ${inputs.currentSpread > 0 ? "+" : ""}${inputs.currentSpread})${isSteam ? " — STEAM" : ""}`,
        confidence: isSteam ? 75 : 62,
      });
    }
  }

  // 3. Total line movement
  if (inputs.openTotal !== null && inputs.currentTotal !== null) {
    const move = inputs.currentTotal - inputs.openTotal;
    if (Math.abs(move) >= 0.5) {
      const dir = move > 0 ? "OVER" : "UNDER";
      signals.push({
        category: "Total Line Movement",
        direction: dir as SignalDirection,
        strength: Math.abs(move) >= 2 ? "STRONG" : "MODERATE",
        description: `Total moved ${move > 0 ? "+" : ""}${move.toFixed(1)} (${inputs.openTotal} → ${inputs.currentTotal})`,
        confidence: Math.abs(move) >= 2 ? 72 : 60,
      });
    }
  }

  // 4. Referee tendency on totals
  if (inputs.refereeOverRate !== null) {
    const deviation = inputs.refereeOverRate - 50;
    if (Math.abs(deviation) >= 5) {
      const dir = deviation > 0 ? "OVER" : "UNDER";
      const name = inputs.refereeName ?? "This referee";
      signals.push({
        category: "Referee Tendency",
        direction: dir as SignalDirection,
        strength: Math.abs(deviation) >= 10 ? "STRONG" : "MODERATE",
        description: `${name}: ${inputs.refereeOverRate}% over rate (${deviation > 0 ? "+" : ""}${deviation.toFixed(0)}% from neutral)`,
        confidence: Math.abs(deviation) >= 10 ? 68 : 57,
      });
    }
  }

  // 5. Playoffs rest factor (back-to-back in playoffs is heavily punished)
  if (inputs.isPlayoffs) {
    const minRest = Math.min(inputs.homeRestDays, inputs.awayRestDays);
    if (minRest === 0) {
      signals.push({
        category: "Playoff B2B Penalty",
        direction: "UNDER",
        strength: "MODERATE",
        description: "Back-to-back in playoffs — fatigue suppresses scoring, under lean",
        confidence: 62,
      });
    }
  }

  return stackSignals(signals, inputs.homeTeam, inputs.awayTeam);
}

// ── MLB Analysis ──────────────────────────────────────────────────────────────

export interface MlbEdgeInputs {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  homePitcherName: string | null;
  awayPitcherName: string | null;
  homePitcherEra: number | null;
  awayPitcherEra: number | null;
  homePitcherHomeEra: number | null;   // pitcher's home/away split
  awayPitcherAwayEra: number | null;
  homePitcherDaysSinceStart: number | null;
  awayPitcherDaysSinceStart: number | null;
  homeBullpenFatigue: "HIGH" | "MEDIUM" | "LOW";
  awayBullpenFatigue: "HIGH" | "MEDIUM" | "LOW";
  umpireKZone: "LARGE" | "AVERAGE" | "SMALL" | null;
  umpireOverRate: number | null;
  umpireName: string | null;
  parkRunFactor: number;  // 100 = neutral
  weatherSignal: "OVER" | "UNDER" | "NEUTRAL";
  weatherDescription: string;
  openTotal: number | null;
  currentTotal: number | null;
  homeML: number | null;
  awayML: number | null;
}

export function analyzeMlbEdge(inputs: MlbEdgeInputs): StackedEdge {
  const signals: Signal[] = [];

  // 1. Starting pitcher matchup
  if (inputs.homePitcherEra !== null && inputs.awayPitcherEra !== null) {
    const eraDiff = inputs.awayPitcherEra - inputs.homePitcherEra;
    if (Math.abs(eraDiff) >= 0.75) {
      const dir = eraDiff > 0 ? "HOME" : "AWAY";
      const better = eraDiff > 0 ? inputs.homePitcherName : inputs.awayPitcherName;
      signals.push({
        category: "Pitcher Matchup",
        direction: dir as SignalDirection,
        strength: Math.abs(eraDiff) >= 1.5 ? "STRONG" : "MODERATE",
        description: `${better ?? "Starter"} ERA advantage (${inputs.homePitcherEra?.toFixed(2)} vs ${inputs.awayPitcherEra?.toFixed(2)})`,
        confidence: Math.abs(eraDiff) >= 1.5 ? 68 : 58,
      });
    }
  }

  // 2. Home/away pitcher split
  if (inputs.homePitcherHomeEra !== null && inputs.homePitcherEra !== null) {
    const split = inputs.homePitcherHomeEra - inputs.homePitcherEra;
    if (split <= -0.75) {
      signals.push({
        category: "Pitcher Home Split",
        direction: "HOME",
        strength: "MODERATE",
        description: `${inputs.homePitcherName ?? "Home starter"} significantly better at home (${inputs.homePitcherHomeEra.toFixed(2)} home ERA vs ${inputs.homePitcherEra.toFixed(2)} overall)`,
        confidence: 63,
      });
    } else if (split >= 0.75) {
      signals.push({
        category: "Pitcher Home Split",
        direction: "AWAY",
        strength: "MODERATE",
        description: `${inputs.homePitcherName ?? "Home starter"} struggles at home (${inputs.homePitcherHomeEra.toFixed(2)} home ERA vs ${inputs.homePitcherEra.toFixed(2)} overall)`,
        confidence: 60,
      });
    }
  }

  // 3. Pitcher fatigue (days since last start — ideal is 4-5 days)
  for (const [side, days, name] of [
    ["HOME", inputs.homePitcherDaysSinceStart, inputs.homePitcherName],
    ["AWAY", inputs.awayPitcherDaysSinceStart, inputs.awayPitcherName],
  ] as const) {
    if (days !== null && days < 4) {
      signals.push({
        category: "Pitcher Fatigue",
        direction: side === "HOME" ? "AWAY" : "HOME",
        strength: days <= 2 ? "STRONG" : "MODERATE",
        description: `${name ?? side + " starter"} on short rest (${days}d) — fatigue risk`,
        confidence: days <= 2 ? 70 : 60,
      });
    }
  }

  // 4. Bullpen fatigue
  for (const [side, fatigue] of [
    ["HOME", inputs.homeBullpenFatigue],
    ["AWAY", inputs.awayBullpenFatigue],
  ] as const) {
    if (fatigue === "HIGH") {
      signals.push({
        category: "Bullpen Fatigue",
        direction: side === "HOME" ? "AWAY" : "HOME",
        strength: "MODERATE",
        description: `${side} bullpen heavily used last 3 days — opponent advantage`,
        confidence: 61,
      });
    }
  }

  // 5. Umpire tendency
  if (inputs.umpireKZone !== null && inputs.umpireKZone !== "AVERAGE") {
    const dir = inputs.umpireKZone === "LARGE" ? "UNDER" : "OVER";
    const name = inputs.umpireName ?? "Umpire";
    signals.push({
      category: "Umpire Zone",
      direction: dir as SignalDirection,
      strength: "MODERATE",
      description: `${name}: ${inputs.umpireKZone.toLowerCase()} strike zone — ${inputs.umpireKZone === "LARGE" ? "more Ks, less scoring" : "tight zone, more walks and contact"}`,
      confidence: 60,
    });
  }
  if (inputs.umpireOverRate !== null) {
    const dev = inputs.umpireOverRate - 50;
    if (Math.abs(dev) >= 5) {
      signals.push({
        category: "Umpire Over/Under Tendency",
        direction: dev > 0 ? "OVER" : "UNDER",
        strength: Math.abs(dev) >= 10 ? "STRONG" : "MODERATE",
        description: `${inputs.umpireName ?? "Umpire"}: ${inputs.umpireOverRate}% over rate`,
        confidence: Math.abs(dev) >= 10 ? 65 : 57,
      });
    }
  }

  // 6. Park factors
  if (inputs.parkRunFactor !== 100) {
    const dev = inputs.parkRunFactor - 100;
    if (Math.abs(dev) >= 5) {
      const dir = dev > 0 ? "OVER" : "UNDER";
      signals.push({
        category: "Park Factor",
        direction: dir as SignalDirection,
        strength: Math.abs(dev) >= 10 ? "STRONG" : "MODERATE",
        description: `Park run factor ${inputs.parkRunFactor} (${dev > 0 ? "hitter-friendly" : "pitcher-friendly"})`,
        confidence: Math.abs(dev) >= 10 ? 65 : 58,
      });
    }
  }

  // 7. Weather
  if (inputs.weatherSignal !== "NEUTRAL") {
    signals.push({
      category: "Weather",
      direction: inputs.weatherSignal as SignalDirection,
      strength: "MODERATE",
      description: inputs.weatherDescription,
      confidence: 62,
    });
  }

  // 8. Total line movement
  if (inputs.openTotal !== null && inputs.currentTotal !== null) {
    const move = inputs.currentTotal - inputs.openTotal;
    if (Math.abs(move) >= 0.5) {
      signals.push({
        category: "Total Line Movement",
        direction: move > 0 ? "OVER" : "UNDER",
        strength: Math.abs(move) >= 1 ? "STRONG" : "MODERATE",
        description: `Total moved ${move > 0 ? "+" : ""}${move.toFixed(1)} (${inputs.openTotal} → ${inputs.currentTotal})`,
        confidence: Math.abs(move) >= 1 ? 70 : 60,
      });
    }
  }

  return stackSignals(signals, inputs.homeTeam, inputs.awayTeam);
}

// ── Signal stacker (sport-agnostic) ──────────────────────────────────────────

function stackSignals(
  signals: Signal[],
  homeTeam: string,
  awayTeam: string,
): StackedEdge {
  if (signals.length === 0) {
    return { signals, recommendation: "PASS", stackConfidence: 0, convergenceCount: 0, summary: "No significant signals detected." };
  }

  // Count direction votes
  const votes: Record<string, number> = {};
  const confByDir: Record<string, number[]> = {};
  for (const s of signals) {
    votes[s.direction] = (votes[s.direction] ?? 0) + 1;
    confByDir[s.direction] = [...(confByDir[s.direction] ?? []), s.confidence];
  }

  // Find dominant direction
  const sorted = Object.entries(votes).sort((a, b) => b[1] - a[1]);
  const [topDir, topCount] = sorted[0];
  const convergenceCount = topCount;

  // Composite confidence = weighted average of aligned signals + convergence bonus
  const aligned = confByDir[topDir] ?? [];
  const avgConf = aligned.reduce((a, b) => a + b, 0) / aligned.length;
  const convergenceBonus = Math.min(20, (convergenceCount - 1) * 7);
  const stackConfidence = Math.min(95, Math.round(avgConf + convergenceBonus));

  const recommendation: SignalDirection =
    convergenceCount >= 2 ? (topDir as SignalDirection) : "PASS";

  const teamLabel =
    topDir === "HOME" ? homeTeam
    : topDir === "AWAY" ? awayTeam
    : topDir;

  const summary =
    convergenceCount >= 3
      ? `${convergenceCount} signals converging on ${teamLabel} — high conviction`
      : convergenceCount === 2
        ? `2 signals aligned on ${teamLabel} — moderate conviction`
        : `Only 1 signal (${teamLabel}) — insufficient convergence, PASS`;

  return { signals, recommendation, stackConfidence, convergenceCount, summary };
}
