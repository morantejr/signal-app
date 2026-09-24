"""Quant score v0.1. A pure function of `QuantInputs`. No network, no LLM.

Score: −100 (expensive / weak) … +100 (attractive / strong). Bands: attractive ≥ +20,
expensive ≤ −20, fair in between, unknown when fewer than two components have data.

Components, each in [−1, +1], weighted; missing components are excluded from the
weight sum (not treated as zero) and flagged:

  valuation      0.35  trailing P/E vs a fixed reference band; P/S when unprofitable;
                       P/S vs the company's own multi-year median when available
  momentum       0.25  6-month return; 12-month return minus the last month
  risk           0.20  1-year max drawdown; 60-day realised volatility (annualised)
  balance_sheet  0.20  debt/equity, current ratio, free cash flow sign
  macro          0.10  3-month change in the US 10-year yield (FRED DGS10), only if provided

The formula is deliberately simple and fully visible in `components[*].note`.
"""

from __future__ import annotations

from datetime import datetime, timezone

from ..schemas import QuantComponent, QuantInputs, QuantResult

QUANT_VERSION = "v0.1"
WEIGHTS = {"valuation": 0.35, "momentum": 0.25, "risk": 0.20, "balance_sheet": 0.20, "macro": 0.10}
BAND_ATTRACTIVE = 20
BAND_EXPENSIVE = -20


def clamp(x: float, lo: float = -1.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def _mean(xs: list[float]) -> float | None:
    return sum(xs) / len(xs) if xs else None


def valuation(i: QuantInputs) -> QuantComponent:
    parts: list[float] = []
    used: dict = {}
    notes: list[str] = []
    pe = i.trailing_pe
    if pe is not None and pe > 0:
        v = -1.0 if pe > 60 else -0.7 if pe > 40 else -0.4 if pe > 28 else 0.0 if pe > 18 else 0.4 if pe > 10 else 0.6
        parts.append(v)
        used["trailing_pe"] = pe
        notes.append(f"P/E {pe:.1f} → {v:+.1f} (reference band 18–28× ≈ neutral)")
    elif i.price_to_sales is not None and i.price_to_sales > 0:
        ps = i.price_to_sales
        v = -1.0 if ps > 20 else -0.6 if ps > 10 else -0.3 if ps > 5 else 0.0 if ps > 2 else 0.3
        parts.append(v)
        used["price_to_sales"] = ps
        notes.append(f"no positive earnings; P/S {ps:.1f} → {v:+.1f}")
    if i.price_to_sales and i.ps_hist_median and i.ps_hist_median > 0:
        rel = i.price_to_sales / i.ps_hist_median
        v = -0.6 if rel > 1.5 else -0.3 if rel > 1.2 else 0.5 if rel < 0.7 else 0.25 if rel < 0.85 else 0.0
        parts.append(v)
        used["ps_vs_own_median"] = round(rel, 2)
        notes.append(f"P/S is {rel:.2f}× its own median → {v:+.2f}")
    return QuantComponent(name="valuation", value=_mean(parts), weight=WEIGHTS["valuation"], inputs_used=used, note="; ".join(notes) or "no valuation data")


def momentum(i: QuantInputs) -> QuantComponent:
    parts: list[float] = []
    used: dict = {}
    notes: list[str] = []
    if i.ret_6m is not None:
        v = clamp(i.ret_6m / 30)
        parts.append(v)
        used["ret_6m"] = i.ret_6m
        notes.append(f"6m return {i.ret_6m:+.1f}% → {v:+.2f}")
    if i.ret_12m is not None and i.ret_1m is not None:
        v = clamp((i.ret_12m - i.ret_1m) / 40)
        parts.append(v)
        used["ret_12m_minus_1m"] = round(i.ret_12m - i.ret_1m, 2)
        notes.append(f"12m−1m {i.ret_12m - i.ret_1m:+.1f}% → {v:+.2f}")
    return QuantComponent(name="momentum", value=_mean(parts), weight=WEIGHTS["momentum"], inputs_used=used, note="; ".join(notes) or "no price history")


def risk(i: QuantInputs) -> QuantComponent:
    parts: list[float] = []
    used: dict = {}
    notes: list[str] = []
    if i.max_drawdown_1y is not None:
        dd = abs(i.max_drawdown_1y)
        v = 0.3 if dd < 15 else clamp(0.3 - (dd - 15) / 35 * 1.3, -1.0, 0.3)
        parts.append(v)
        used["max_drawdown_1y"] = i.max_drawdown_1y
        notes.append(f"1y drawdown {dd:.0f}% → {v:+.2f}")
    if i.vol_60d_ann is not None:
        vol = i.vol_60d_ann
        v = 0.3 if vol < 25 else clamp(0.3 - (vol - 25) / 45 * 1.3, -1.0, 0.3)
        parts.append(v)
        used["vol_60d_ann"] = vol
        notes.append(f"60d vol {vol:.0f}% ann. → {v:+.2f}")
    return QuantComponent(name="risk", value=_mean(parts), weight=WEIGHTS["risk"], inputs_used=used, note="; ".join(notes) or "no risk data")


def balance_sheet(i: QuantInputs) -> QuantComponent:
    parts: list[float] = []
    used: dict = {}
    notes: list[str] = []
    if i.debt_to_equity is not None:
        de = i.debt_to_equity
        v = 0.5 if de < 50 else 0.2 if de < 100 else -0.2 if de < 200 else -0.7
        parts.append(v)
        used["debt_to_equity"] = de
        notes.append(f"D/E {de:.0f}% → {v:+.1f}")
    if i.current_ratio is not None:
        cr = i.current_ratio
        v = 0.3 if cr >= 1.5 else 0.0 if cr >= 1.0 else -0.5
        parts.append(v)
        used["current_ratio"] = cr
        notes.append(f"current ratio {cr:.2f} → {v:+.1f}")
    if i.free_cash_flow is not None:
        v = 0.3 if i.free_cash_flow > 0 else -0.4
        parts.append(v)
        used["free_cash_flow_positive"] = i.free_cash_flow > 0
        notes.append(f"FCF {'positive' if i.free_cash_flow > 0 else 'negative'} → {v:+.1f}")
    return QuantComponent(name="balance_sheet", value=_mean(parts), weight=WEIGHTS["balance_sheet"], inputs_used=used, note="; ".join(notes) or "no balance sheet data")


def macro(i: QuantInputs) -> QuantComponent:
    if i.fred_10y_change_3m is None:
        return QuantComponent(name="macro", value=None, weight=WEIGHTS["macro"], inputs_used={}, note="no FRED data (optional)")
    v = clamp(-i.fred_10y_change_3m / 1.0, -0.5, 0.5)
    return QuantComponent(name="macro", value=v, weight=WEIGHTS["macro"], inputs_used={"fred_10y_change_3m": i.fred_10y_change_3m}, note=f"10y yield {i.fred_10y_change_3m:+.2f}pp over 3m → {v:+.2f}")


def compute_quant(inputs: QuantInputs, *, now: datetime | None = None) -> QuantResult:
    comps = [valuation(inputs), momentum(inputs), risk(inputs), balance_sheet(inputs), macro(inputs)]
    have = [c for c in comps if c.value is not None]
    flags = [f"missing:{c.name}" for c in comps if c.value is None and c.name != "macro"]
    if inputs.data_age_days is not None and inputs.data_age_days > 5:
        flags.append(f"stale:price_data_{inputs.data_age_days:.0f}d")
    if len(have) < 2:
        score: int | None = None
        band = "unknown"
    else:
        wsum = sum(c.weight for c in have)
        score = int(round(100 * sum(c.weight * (c.value or 0.0) for c in have) / wsum))
        band = "attractive" if score >= BAND_ATTRACTIVE else "expensive" if score <= BAND_EXPENSIVE else "fair"
    drivers = [f"{c.name}: {c.note}" for c in sorted(have, key=lambda c: -abs(c.weight * (c.value or 0.0)))]
    return QuantResult(
        ticker=inputs.ticker,
        quant_score=score,
        quant_band=band,  # type: ignore[arg-type]
        components=comps,
        quant_inputs=inputs,
        quant_version=QUANT_VERSION,
        computed_at=now or datetime.now(timezone.utc),
        freshness_flags=flags,
        drivers=drivers,
    )
