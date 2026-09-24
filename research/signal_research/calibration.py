"""Prediction log and calibration report.

Every run appends one line to predictions.jsonl. Nothing here changes the score;
it only makes "was 'attractive' actually followed by gains?" answerable later.

    python -m signal_research.calibration            # evaluate matured predictions
"""

from __future__ import annotations

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable

from .schemas import RunResult

HORIZON_DAYS = {"1m": 30, "3m": 90, "6m": 180, "1y": 365}


def horizon_days(h: str) -> int:
    return HORIZON_DAYS.get(h, 90)


def log_prediction(r: RunResult, path: Path) -> dict:
    rec = {
        "run_id": r.run_id,
        "ticker": r.ticker,
        "at": r.created_at.isoformat(),
        "price": r.quant.quant_inputs.price,
        "quant_score": r.quant.quant_score,
        "quant_band": r.quant.quant_band,
        "quant_version": r.quant.quant_version,
        "narrative_lean": r.brief.narrative_lean,
        "agree": r.brief.disagreement.agree,
        "horizon": r.horizon,
        "horizon_end": (r.created_at + timedelta(days=horizon_days(r.horizon))).date().isoformat(),
        "models": r.models,
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(rec) + "\n")
    return rec


def _yf_price_on(ticker: str, day: str) -> float | None:
    import yfinance as yf

    d = datetime.fromisoformat(day)
    hist = yf.Ticker(ticker).history(start=(d - timedelta(days=5)).date().isoformat(), end=(d + timedelta(days=1)).date().isoformat(), auto_adjust=True)
    if hist is None or hist.empty:
        return None
    return float(hist["Close"].dropna().iloc[-1])


def evaluate(path: Path, *, price_fn: Callable[[str, str], float | None] = _yf_price_on, today: datetime | None = None) -> dict:
    today = today or datetime.now(timezone.utc)
    matured: list[dict] = []
    pending = 0
    if path.exists():
        for line in path.read_text().splitlines():
            if not line.strip():
                continue
            rec = json.loads(line)
            if rec["horizon_end"] > today.date().isoformat() or rec.get("price") is None:
                pending += 1
                continue
            px = price_fn(rec["ticker"], rec["horizon_end"])
            if px is None:
                pending += 1
                continue
            rec["realized_return"] = (px / rec["price"] - 1.0) * 100.0
            matured.append(rec)

    def bucket(key: str) -> dict:
        groups: dict[str, list[float]] = defaultdict(list)
        for rec in matured:
            groups[str(rec.get(key))].append(rec["realized_return"])
        out = {}
        for k, rets in groups.items():
            hit = {"attractive": lambda r: r > 0, "expensive": lambda r: r < 0, "fair": lambda r: abs(r) < 10, "bullish": lambda r: r > 0, "bearish": lambda r: r < 0}.get(k)
            out[k] = {"n": len(rets), "avg_return_pct": round(sum(rets) / len(rets), 2), "hit_rate": round(sum(1 for r in rets if hit(r)) / len(rets), 2) if hit else None}
        return out

    return {"matured": len(matured), "pending": pending, "by_quant_band": bucket("quant_band"), "by_narrative_lean": bucket("narrative_lean"), "by_agreement": bucket("agree")}


def main(argv: list[str] | None = None) -> int:
    path = Path((argv or sys.argv[1:])[0]) if (argv or sys.argv[1:]) else Path("runs/predictions.jsonl")
    print(json.dumps(evaluate(path), indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
