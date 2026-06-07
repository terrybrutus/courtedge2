# Design Brief

## Direction

Sports Betting Research War Room — an immersive investigation platform for NBA playoff props and totals that feels like a Bloomberg terminal for sports analytics.

## Tone

Brutalist, data-obsessed, no-nonsense: every pixel serves analysis. Flat design with precise borders, monospace typography for headlines, electric green for confidence signals, amber for market discrepancies.

## Differentiation

Confidence meter bars with animated fills, card-based investigation rooms, and stat-dense layouts that make micro-data visible without clutter — like a live trading floor for sports betting research.

## Color Palette

| Token        | OKLCH        | Role |
| ------------ | ------------ | ---- |
| background   | 0.13 0 0     | Near-black base, deep focus |
| foreground   | 0.92 0 0     | Cool white text for data readability |
| card         | 0.16 0 0     | Slightly elevated card surface |
| primary      | 0.65 0.18 145| Electric green for confidence/positive signals |
| accent       | 0.7 0.15 85  | Amber/yellow for warnings and line discrepancies |
| muted        | 0.22 0 0     | Mid-grey for disabled/secondary states |
| destructive  | 0.55 0.22 25 | Red for negatives and errors |
| border       | 0.25 0 0     | Subtle dark borders for structure |

## Typography

- Display: JetBrains Mono — tech-forward, precise, terminal aesthetic for all headings and labels
- Body: Figtree — humanized sans for readable body text and data labels
- Mono: Geist Mono — consistent with display; used for numerical data and stats
- Scale: hero `text-4xl font-bold tracking-tight`, labels `text-xs font-semibold uppercase tracking-widest`, values `text-lg font-mono font-bold`

## Elevation & Depth

No shadows; hierarchy through subtle inset borders (1px oklch(border)) and background-color shifts. Cards have dark borders on near-black background. Stat cells have lighter borders with reduced opacity for data density.

## Structural Zones

| Zone    | Background | Border                        | Notes |
| ------- | ---------- | ----------------------------- | ----- |
| Header  | 0.15 0 0   | 1px bottom oklch(border)      | Game selector and stat tabs |
| Content | 0.13 0 0   | —                             | Main investigation room, card-based layout |
| Sidebar | 0.15 0 0   | 1px right oklch(border)       | Game list, matchup quick stats |
| Footer  | 0.15 0 0   | 1px top oklch(border)         | Meta info, data refresh time |

## Spacing & Rhythm

Compact vertical rhythm (0.5rem, 1rem, 1.5rem gaps) to maximize data density. Stat cards in 3-col grid on desktop, full-width mobile. Confidence bars sit atop numerical predictions with tight spacing (0.5rem). No breathing room — intentional density is the aesthetic.

## Component Patterns

- Stat Card: dark border (inset), monospace labels (uppercase, 0.75rem), large values (1.5rem mono bold), confidence bar below
- Confidence Meter: 8px bar, electric green fill animating from 0%, text label below (percentage + label)
- Line Discrepancy Alert: amber accent text, bordered warning zone, matches odds side-by-side
- Player Prop Card: header with name/position, stat grid (3 cols), confidence meter, matchup notes

## Motion

- Confidence bars: 0.6s ease-out fill animation on load
- Hover: stat cards brighten border to oklch(border / 0.6), slight scale to 1.01
- Pulse on warnings: subtle opacity pulse on amber discrepancy text (2s ease-in-out)

## Constraints

- No shadows, no blur, no gradients — flat is intentional
- Monospace preferred for all numbers and labels; Figtree for prose only
- Min contrast AA+ (0.92 light text on 0.13 background = delta 0.79)
- No rounded corners except utility radii (2px, 4px max) — sharp edges for terminal feel

## Signature Detail

Confidence meter bars that animate on card load (0–100% fill in 0.6s) using oklch(primary) green; they become the primary visual signal for user decision-making, making abstract probability tangible and scannable.
