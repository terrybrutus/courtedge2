import { CONFIG } from "./config";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export async function claudeAnalyze(
  systemPrompt: string,
  userContent: string,
  maxTokens = 800,
): Promise<string> {
  const res = await fetch(`${CONFIG.CLAUDE_BASE}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": CONFIG.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } })?.error?.message ??
        `Claude API error ${res.status}`,
    );
  }

  const json = await res.json();
  return json.content?.[0]?.text ?? "";
}

// ── Prompt builders ───────────────────────────────────────────────────────────

export function buildNbaPropsPrompt(
  gameId: string,
  playerData: string,
): string {
  return `Analyze props for NBA game ${gameId}:\n${playerData}\n\nFor each player: confidence 0-100, plain reasoning. Focus on multiple signal convergence — only flag confidence ≥65. Return well-structured text.`;
}

export function buildNbaTotalsPrompt(
  gameId: string,
  totalsData: string,
): string {
  return `Analyze this NBA game total for game ${gameId}:\n${totalsData}\n\nGive: confidence (0-100), OVER/UNDER/PASS recommendation, projected total, and plain-language reasoning explaining the key signals.`;
}

export function buildNbaEdgePrompt(gameId: string, edgeData: string): string {
  return `Analyze edge signals for NBA game ${gameId}:\n${edgeData}\n\nStack all signals (line movement, rest, situational, referee). Only recommend when 3+ signals align. Give confidence 0-100 and plain reasoning.`;
}

export function buildMlbEdgePrompt(gameId: string, edgeData: string): string {
  return `Analyze edge signals for MLB game ${gameId}:\n${edgeData}\n\nStack all available signals (pitcher fatigue, umpire tendencies, weather, park factors, bullpen, line movement). Only recommend when multiple independent signals converge. Give confidence 0-100, OVER/UNDER/HOME/AWAY/PASS, and plain reasoning.`;
}
