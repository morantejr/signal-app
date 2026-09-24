# Handoff: SIGNAL — AI investment research (Simple + Advanced)

## Overview
SIGNAL answers plain investment questions ("Should I buy ZETA?") with one clear view: stance, confidence, expected outcome, why, and risks. The design has two surfaces:
1. **Simple** (default, consumer): light, minimal, plain language. Four layers of progressive disclosure: Simple → Explain → Research → Professional.
2. **Advanced Research** (opt-in, professional): a dark terminal with research agents, evidence graph, scenarios, prediction model and calibration, analogies, investment committee, falsification triggers, portfolio risk, backtesting and architecture.

Product principle, shown in the UI: *AI does not make the investment decision. It organizes evidence, challenges assumptions and quantifies uncertainty.*

## About the design files
The files in this bundle are **design references made in HTML**. They are prototypes that show the intended look and behavior, not production code to copy. Rebuild them in the target codebase's environment (React, Vue, SwiftUI, etc.) using its own patterns. If there is no codebase yet, React + TypeScript is a good fit. Use a charting library for real charts and a graph library such as React Flow for the evidence graph.

The `.dc.html` files open directly in a browser (keep `support.js` next to them). Each file has a template (markup with `{{ }}` holes and `<sc-for>`/`<sc-if>` for loops and conditionals) and a `class Component` logic block. All data is hard-coded in `renderVals()`. That is the fixture data to replace with API responses.

## Fidelity
**High fidelity.** Colors, type, spacing, copy and interactions are final. Recreate them closely. All numbers are **illustrative mock data**, not real market data.

---

## Surface 1 — Simple (`SIGNAL Simple.dc.html`)

### Global chrome
- Sticky top bar, 60px tall, background `rgba(246,245,242,.86)` + `backdrop-filter: blur(14px)`, 1px bottom border `#e9e6e0`. Content max-width 960px, padding 0 24px, gap 28px.
- Wordmark "SIGNAL": 17px/500, letter-spacing .16em. Clicking it goes Home.
- Nav: Home · Watchlist · Portfolio · Research. 15px/400. Inactive `#9a9ea5`, active `#16181c` with a 2px inset bottom underline in ink. Hover goes to ink. Home stays active while on the thinking and asset screens.
- Avatar: 30px circle, `#e5e1d9` fill, border `#dbd6cc`, initials 11px/500 `#6b6f76`. Profile and settings live behind it (not built).
- Page background `#f6f5f2`. Font: Helvetica Neue / Helvetica / Arial.

### Home
- Vertically centered column, max-width 620px, padding 80px 24px 120px.
- Title "Ask SIGNAL": 40px/1.15, letter-spacing −.02em, margin-bottom 28px.
- Input card: white, 1px `#e2ded6`, radius 14px, height 62px, padding 0 20px, shadow `0 1px 2px rgba(20,22,26,.04)`. Input text 19px, placeholder "Should I buy NVDA?". The "Ask" button uses ink `#16181c` with white text, 16px, padding 13px 20px, radius 9px.
- "Recent" label 13px `#9a9ea5`. Rows have 14px vertical padding, a 1px bottom border `#e9e6e0` and hover opacity .6. Each row pairs a question (16px) with SIGNAL's short view on the right (15px, colored by stance):
  - Should I hold ZETA for the next 3 months? → Moderately bullish (green)
  - Is Apple expensive right now? → Fairly valued (amber)
  - Why is META falling today? → Answered (muted)
  - Compare MSFT and GOOG → MSFT preferred (green)
- Enter or Ask submits. An empty query falls back to "Should I buy ZETA for the next 3 months?".

### Thinking (transition state)
- Same centered 620px column. The question is echoed in 15px `#9a9ea5`.
- A status line (26px) steps through these every 520ms, with a breathing opacity animation (1.8s ease-in-out, .35↔1): "Reading the latest results…" → "Checking what analysts expect…" → "Weighing what could go wrong…" → "Putting it together…".
- Progress bar: 2px track `#e6e2da`, fill in ink at 55% opacity, width 25/50/75/100%, 0.5s transition. After step 4 it goes to the Asset screen.
- Never show agent names or model terms here.

### Asset screen (ZETA)
Column max-width 720px, padding 44px 24px 120px.
- Header: "ZETA" 34px on the left; "Zeta Global" 15px `#8e939a` below it. On the right: "$18.42" 28px and "+2.1% today" 15px green.
- Sub-tabs: Overview · Why · Risks · Research. 15px, gap 26px, 14px vertical padding, 2px active underline, 1px bottom border `#e9e6e0`.

**Overview (Layer 1 — "What does SIGNAL think?")**
1. View card: white, 1px `#e6e2da`, radius 16px, padding 32px.
   - "SIGNAL VIEW" 13px, letter-spacing .06em, `#9a9ea5`.
   - "Moderately Bullish" 40px/1.1, −.02em, green `#2f8f6b`.
   - Stats row (gap 44px): "Confidence" / **72%** (26px). "Expected over 3 months" / **+9%** (26px green). The expected-return stat can be hidden with the `showExpectedReturn` setting.
   - Bearish ↔ Bullish scale: 6px track `#eeebe5`, green fill from 50% to 72% (grows from the left over 0.7s), and a 3×16px ink marker at 72%. Labels Bearish / Neutral / Bullish in 12px `#a5a9af`.
   - Headline, 19px/1.55 `#2c2f35`: "Revenue trends and analyst expectations are improving, but the stock is expensive enough that downside risk remains meaningful."
2. "Why" (22px), three rows. Each has a green ✓, a title (17px) and a detail line (14px `#8e939a`):
   - Revenue growth is stronger than expected — Sales grew 38% last quarter — ahead of what analysts had modelled.
   - Analysts are raising their estimates — Nine have raised forecasts in the last three months; two lowered them.
   - AI advertising demand remains strong — The largest ad platforms all guided their own spending higher.
   - (with `answerDepth: full`, a fourth row) Cash generation is improving — The company now funds its own growth without raising money.
3. "Biggest risks": amber ⚠ `#b78330`.
   - Valuation is expensive — The share price already assumes several more strong quarters.
   - A slowdown in ad spending would hurt the thesis — Most of the growth story depends on marketing budgets staying generous.
   - (full depth) Big platforms could compete directly — Google and Meta can bundle similar tools at lower cost.
4. "BOTTOM LINE" card (radius 16px, padding 26px 28px, 17px/1.6): "SIGNAL currently sees more upside than downside, but the stock is expensive enough that expectations need to remain strong."
5. Buttons (gap 10px, 16px text, padding 15px 22px, radius 11px): **Why?** (primary: ink fill, white text) goes to the Why tab. **What could change this?** (ghost: 1px `#dcd7cd`) goes to Risks. **See full research** (ghost) goes to the Research tab.
6. Footnote, 13px `#a5a9af`: "SIGNAL organises evidence and weighs it against the opposite case. It does not make the decision for you."

**Why (Layer 2 — Explain)**
- A 64/36 split bar: 10px tall, radius 6px, green and red `#c0563f`, grows in over 0.7s. Labels below: "Could go up · 64%" and "Could go down · 36%", no wrapping.
- Two cards in a grid (`repeat(auto-fit, minmax(280px,1fr))`, gap 16px):
  - **Why it could go up** (20px green), 64% (34px). Sales growing faster than expected / Analysts lifting their forecasts / Companies keep spending on AI advertising. "If this plays out" **+18% to +30%** (24px green).
  - **Why it could go down** (20px red), 36%. The stock is expensive / Advertising budgets could tighten / A weaker economy would slow growth. **−21% to −25%**.
- "SIGNAL'S INTERPRETATION" card: "Upside is currently more likely, but the downside is meaningful if growth disappoints. That is why the view is moderate rather than strong."
- Disclosure row "Show a little more detail" (16px link color `#2f6f8f`). It toggles four plain-language items: where the numbers come from, how the odds are set, why not a stronger view, and what SIGNAL is unsure about. Copy is in the file.

**Risks — "What could change our mind?"**
- Intro, 16px `#8e939a`: "These are the few things SIGNAL watches. If any of them stops looking healthy, the view changes on its own — and you get told."
- Health cards (white, radius 16px, padding 24px 26px, gap 14px): name (19px), status pill (13px, radius 20px; Healthy is green on `rgba(47,143,107,.1)`, Watching is amber on `rgba(183,131,48,.12)`), "Now" and "Worrying if" values (22px), an 8px gauge (red danger zone on the left 26% at `rgba(192,86,63,.16)`, a 3px marker at `26% + position × 66%`), and one plain sentence.
  - Revenue growth — Now 38% — Worrying if below 20% — Healthy
  - Profit margin — 62% — below 55% — Healthy
  - Analyst expectations — Rising — analysts start cutting — Healthy
  - Ad spending across the industry — Growing — growth stalls — Watching
- Summary: "Right now: three healthy, one worth watching."

**Research tab (Layer 3)**
- A card titled "The work behind the answer", with plain copy and stats: 6 research agents · 41 sources read · 3 disagreeing opinions · 3m 41s to reach the answer. Then the primary button **Open Advanced Research**.
- A claim list with strength and sources:
  - AI advertising demand is strong — Very strong
  - Growth is beating expectations — Strong
  - The stock is expensive — Very strong

### Watchlist
Title 32px. Subtitle: "SIGNAL keeps watching these and tells you when its view changes." Each row shows ticker + price, the view (colored) + a one-line note, and confidence. Clicking a row opens the asset screen. Data: ZETA, NVDA, AAPL, META, BTC. Copy is in the file.

### Portfolio
- Stats: Value $2.41M · Expected over 3 months +8.6% · Ups and downs "Bumpy". Use words, not volatility numbers.
- "ONE THING TO KNOW" card: "Four of your five holdings rise and fall with the same thing: how much companies spend on AI advertising and software." Below it: "It looks like five separate bets. It behaves like about two…" and an amber bar at "71% linked".
- Holdings rows: ticker, weight, plain-language driver, view.

### Research (top-level)
A history of questions asked, each with its view and a timestamp, plus an Advanced Research card and button.

### Advanced Research (Layer 4)
A full-screen overlay (fixed, inset 0, z 50, `#08090a`, fades in over 0.3s). It has a 1px-bordered top strip with "ADVANCED RESEARCH" and a **Back to the simple view** button, and mounts the terminal from `SIGNAL.dc.html`. In a real app this is a separate route or mode (for example, `/research/advanced`, or a "Developer Mode"-style toggle in settings).

---

## Surface 2 — Advanced terminal (`SIGNAL.dc.html`)
Dark, dense, modular. Layout grid: 216px sidebar + fluid main area, 56px top bar.
- Tokens: bg `#08090a`, panel `#0e1012`, inset `#0b0d0f`, border `#1e2328`, divider `#171b1f`, text `#e6e8ea` / `#c3c9ce` / `#8b949c` / `#5b636b` / `#454d54`. Bull `#4ec99a`, bear `#e0645c`, amber `#d9a53f`, cyan `#63a8c9`, link `#7fb4cc`. Fonts: IBM Plex Sans + IBM Plex Mono (Google Fonts). Panel radius 4px, padding 18px 20px, gap 14px. Labels are 9px mono, letter-spacing .14em, uppercase.
- Top bar: wordmark, question input with an INVESTIGATE button (Enter runs it), a rotating agent-trace ticker (every 3.2s), price and timestamp.
- Sidebar (10 views): Dashboard, Research Agents, Evidence Graph, Thesis / Scenarios, Prediction Engine, Historical Analogies, Investment Committee, Falsification, Portfolio, Architecture. The active item gets a 2px inset left bar in cyan.
- **Dashboard**: stance card (72% confidence, EV), synthesis path, evidence-agreement bars, and five signal rows on a −100…+100 diverging bar (clicking a row expands a 6-input grid). There is also a Claim → Evidence → Source → Confidence inspector; click a claim to expand its evidence, sources and verification stamp.
- **Research Agents**: planner chips (10 sub-questions), then 5 agent cards that stream stage by stage (620ms per stage when re-run), prediction-market translations, and a critic log.
- **Evidence Graph**: a fixed 1160×540 canvas (scrolls horizontally when narrow) with absolutely positioned nodes and SVG bezier edges. Clicking a node highlights its lineage and dims everything else to 0.42 opacity. The node inspector sits on the side. Both the bull and bear hypotheses stay visible.
- **Thesis / Scenarios**: bull and bear cards, plus three scenario sliders. The probability-weighted expected return is `Σ(pᵢ·rᵢ)/Σpᵢ` (returns +30 / +10 / −25) and updates live.
- **Prediction Engine**: P(higher) at 7/30/90 days with confidence intervals, a return histogram, calibration bands (predicted vs actual marker), and SHAP-style attributions.
- **Analogies**: 3 regime cards labelled "Analogies — not predictions", plus a 14-variable state grid.
- **Committee**: 3 agent cards (BUY / HOLD / REDUCE). Clicking a card shows its dissent. The PM synthesis toggle reveals the final text and table.
- **Falsification**: 5 triggers. Clicking one toggles it as breached, and the stance re-derives through 6 levels (Moderately Bullish → … → Bearish) with confidence.
- **Portfolio**: positions table, 5×5 correlation heatmap (amber intensity above 0.7), analytics, and a "hidden risk" reveal.
- **Backtesting** (built but not in the nav; add a nav item to expose it): natural-language hypothesis → strategy spec → metrics with out-of-sample figures → equity bars → bias audit.
- **Architecture**: a vertical pipeline from User Question to Continuous Monitoring, with the parallel data agents in a 6-column row.
- Settings on this surface: `dataDensity` (standard/compact), `showAgentTrace`, `probabilityNotation` (percent/odds).

---

## Interactions and motion
- Screen entry: fade + 10px rise, 0.3–0.4s ease (`sIn`). Overlays: 0.3s fade.
- Bars grow from the left: `scaleX(0→1)`, 0.7s ease.
- Hover on list rows: opacity 0.6. Buttons: opacity or background shift, 0.2s.
- No modals or confirmations on the Simple surface. Aim for one obvious primary action per screen.

## State
Simple: `screen` (home | thinking | asset | watchlist | portfolio | research), `sub` (overview | why | risks | research), `q`, `askedQ`, `think` step (0–3), `deeperOpen`, `advanced` (overlay).
Advanced: `view`, `openSignal`, `claim`, `node`, `scen {bull, base, bear}`, `stage` (0–6), `member`, `pmOpen`, `breached {}`, `riskOpen`, `btRan`, `btQuery`.

Suggested API response for a question:
```ts
{ ticker, name, price, changePct,
  stance: 'Bearish'|'Moderately Bearish'|'Neutral'|'Moderately Bullish'|'Bullish',
  confidence: number, expectedReturn3m: number, headline: string, bottomLine: string,
  reasons: {title, detail}[], risks: {title, detail}[],
  upside: {probability, rangeLow, rangeHigh, reasons: string[]},
  downside: {probability, rangeLow, rangeHigh, reasons: string[]},
  watchItems: {name, now, dangerLabel, status: 'Healthy'|'Watching'|'At risk', position: 0..1, plain}[],
  research: { agents, sources, dissents, duration, claims: {claim, strength, sources}[] } }
```
Stream the thinking steps from the backend when possible, and keep the copy plain.

## Design tokens — Simple
- Background `#f6f5f2`. Surface `#ffffff`. Borders `#e6e2da` (card), `#e2ded6` (input), `#e9e6e0` (dividers), `#dcd7cd` (ghost button).
- Ink `#16181c`; body `#2c2f35`; muted `#8e939a`; subtle `#9a9ea5`; faint `#a5a9af`.
- Green `#2f8f6b` · red `#c0563f` · amber `#b78330` · link `#2f6f8f` (hover `#1d4d66`).
- Type scale: 40 / 34 / 32 / 28 / 26 / 24 / 22 / 20 / 19 / 17 / 16 / 15 / 14 / 13 / 12. Weight 400 throughout (500 only for the wordmark).
- Radius: 16 (cards), 14 (search), 11 (buttons), 9 (Ask), 20 (pills).
- Shadow: `0 1px 2px rgba(20,22,26,.04)` only.

## Copy rules
Consumer copy never uses: P(higher), SHAP, calibration, falsification, signal scores, factor, σ, or agent names. Write "68% chance the stock is higher in 3 months", not "P(Higher) 90D: 68%". Technical terms appear only inside Advanced Research.

## Assets
There are no images or icons beyond the Unicode glyphs ✓ ⚠ ▲ ▼. Fonts: system Helvetica Neue (Simple) and IBM Plex Sans / Mono from Google Fonts (Advanced).

## Files
- `SIGNAL Simple.dc.html` — consumer surface (the default entry point)
- `SIGNAL.dc.html` — Advanced Research terminal
- `support.js` — runtime needed only to open the prototypes in a browser; not needed for implementation
