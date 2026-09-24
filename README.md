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

The Advanced Research terminal (`public/advanced/`) is still the design prototype with illustrative numbers. The Python research system that will feed it lives in `research/`.
