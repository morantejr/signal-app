"""Static export: one JSON per ticker plus an index, for the web app to read
without a server. Failures are per ticker so one bad symbol never blocks the rest.

    python -m signal_research.export --tickers ZETA,NVDA --out ../public/runs
"""

from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from .config import load_settings
from .calibration import log_prediction
from .evidence.store import EvidenceStore
from .pipeline import run


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--tickers", default="", help="comma-separated")
    p.add_argument("--tickers-file", default=None, help="one ticker per line; # comments allowed")
    p.add_argument("--out", required=True)
    p.add_argument("--horizon", default="3m")
    p.add_argument("--db", default="signal_research.sqlite")
    p.add_argument("--no-llm", action="store_true")
    a = p.parse_args(argv)
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    s = load_settings()
    if a.no_llm:
        s = type(s)(**{**s.__dict__, "openrouter_api_key": ""})
    store = EvidenceStore(a.db)
    index_path = out / "index.json"
    index: dict[str, dict] = {}
    if index_path.exists():
        index = {e["ticker"]: e for e in json.loads(index_path.read_text()).get("runs", [])}
    failures = 0
    tickers = [x.strip().upper() for x in a.tickers.split(",") if x.strip()]
    if a.tickers_file:
        for line in Path(a.tickers_file).read_text().splitlines():
            line = line.split("#", 1)[0].strip().upper()
            if line and line not in tickers:
                tickers.append(line)
    if not tickers:
        print("no tickers given", file=sys.stderr)
        return 2
    for t in tickers:
        try:
            r = run(t, settings=s, horizon=a.horizon, store=store)
        except Exception as exc:  # noqa: BLE001
            failures += 1
            print(f"{t}: FAILED {exc}", file=sys.stderr)
            continue
        existing = out / f"{t}.json"
        if r.brief.is_stub and existing.exists() and not json.loads(existing.read_text()).get("brief", {}).get("is_stub", True):
            print(f"{t}: new run is a stub (no LLM key); keeping the existing non-stub export", file=sys.stderr)
            continue
        existing.write_text(json.dumps(r.model_dump(mode="json"), indent=1))
        log_prediction(r, out / "predictions.jsonl")  # committed back by CI so calibration survives the runner
        index[t] = {"ticker": t, "run_id": r.run_id, "created_at": r.created_at.isoformat(), "quant_score": r.quant.quant_score, "quant_band": r.quant.quant_band, "narrative_lean": r.brief.narrative_lean, "agree": r.brief.disagreement.agree, "is_stub": r.brief.is_stub, "models": r.models}
        print(f"{t}: {r.quant.quant_band} ({r.quant.quant_score}) vs {r.brief.narrative_lean} agree={r.brief.disagreement.agree} stub={r.brief.is_stub}")
    store.close()
    index_path.write_text(json.dumps({"generated_at": datetime.now(timezone.utc).isoformat(), "runs": sorted(index.values(), key=lambda e: e["ticker"])}, indent=1))
    return 1 if failures and failures == len(index) else 0


if __name__ == "__main__":
    sys.exit(main())
