# SIGNAL

Consumer investing companion — *complex underneath, effortless on the surface.*

Ask a question like **"Should I hold ZETA for the next 3 months?"** and get an
answer-first view: the stance, confidence, expected return, three reasons, two
risks, and a bottom line — in plain language, no jargon.

Implemented from the Claude Design project **"SIGNAL workspace interface tour"**
(`SIGNAL Simple.dc.html`). The original design files are kept verbatim in
[`design-reference/`](design-reference/).

## Structure

- **Consumer surface** (React + TypeScript + Vite): Home ("Ask SIGNAL"),
  answer-first asset view with Overview / Why / Risks / Research subtabs,
  Watchlist, Portfolio, and Research history.
- **Advanced Research**: the full professional terminal (research agents,
  evidence graph, prediction model, calibration, historical analogies,
  investment committee) lives behind a single "Open Advanced Research" door.
  It is the original `SIGNAL.dc.html` design file, served as-is from
  [`public/advanced/`](public/advanced/) in a full-screen iframe with a
  "Back to the simple view" bar.
- **Settings** (behind the avatar): show/hide expected return, short vs full
  answer depth — the two tweaks the design exposes.

All market data is illustrative mock data from the design.

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## Live data

Every number on the Simple surface is read live from [Finnhub](https://finnhub.io) (free tier, 60 calls a minute): price, company profile, twelve-month fundamentals, analyst recommendation trends, the last four earnings surprises and two weeks of company news. The stance is a deterministic weight of six checks computed in `src/analysis.ts`; no language model is involved and the copy is templated from the numbers.

The site is static, so the key is bring-your-own: create a free account at [finnhub.io/register](https://finnhub.io/register) and paste the key into the avatar menu (Market data). It is stored in `localStorage` and only ever sent to Finnhub. For local development you can instead put it in `.env.local`:

```
VITE_FINNHUB_KEY=your_key
```

Setting a `FINNHUB_KEY` repository secret bakes a key into the GitHub Pages build so the deployed site works without a prompt. That key is then visible in the bundle, so only do it with a throwaway free key.

If you'd rather not ask visitors for a key, `proxy/` holds a Cloudflare Worker that keeps the key server-side; set `VITE_FINNHUB_PROXY` (or the `FINNHUB_PROXY` repo secret) to its URL.

## Full research

The quick read is one engine. The canonical one is the Python research system in `research/`: evidence from Yahoo Finance and SEC filings (risk factors and MD&A excerpts), a versioned quant score computed in code, bull and bear memos written by a model through OpenRouter, a synthesis, and a disagreement object built in code from the quant band and the narrative lean. The web app reads its output two ways:

- **Static export.** `public/runs/<TICKER>.json` plus `index.json`, produced by `make export` in `research/` and refreshed by the Pages workflow on every deploy and each weekday evening. The five default watchlist tickers ship this way.
- **Local API.** `make api` in `research/` serves `GET /research/<TICKER>` on port 8000; set `VITE_RESEARCH_API=http://localhost:8000` in `.env.local` and any ticker you ask about gets a fresh run (about a minute, cached for a day).

When a run exists the asset screen shows a Full Research card under the quick read: the quant band, the narrative lean, and whether they agree, with the reasons each could be wrong. The Research tab shows both memos with every claim labelled sourced, inference or unsupported and linked to its source, the synthesis with kill criteria, the quant components, and the critic's flags.

The Advanced Research terminal (`public/advanced/`) is still the design prototype with illustrative numbers.
