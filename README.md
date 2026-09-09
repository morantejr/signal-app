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
