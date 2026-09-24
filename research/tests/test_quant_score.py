from __future__ import annotations

from signal_research.quant.score import QUANT_VERSION, compute_quant
from signal_research.schemas import QuantInputs
from tests.conftest import load_inputs


def test_deterministic_and_versioned():
    a, b = compute_quant(load_inputs("growth")), compute_quant(load_inputs("growth"))
    assert a.quant_score == b.quant_score and a.quant_version == QUANT_VERSION == "v0.1"
    assert a.quant_inputs == load_inputs("growth")


def test_ordering_across_fixtures():
    g, m, f = (compute_quant(load_inputs(k)).quant_score for k in ("growth", "megacap", "faller"))
    assert g is not None and m is not None and f is not None
    assert g > f and m > f
    assert compute_quant(load_inputs("faller")).quant_band == "expensive"


def test_missing_data_rules():
    r = compute_quant(load_inputs("sparse"))
    assert r.quant_score is None and r.quant_band == "unknown"
    assert {"missing:valuation", "missing:momentum", "missing:risk", "missing:balance_sheet"} <= set(r.freshness_flags)
    assert next(c for c in r.components if c.name == "macro").value is None  # optional, not flagged
    assert "missing:macro" not in r.freshness_flags


def test_macro_overlay_only_when_present():
    base = load_inputs("megacap")
    with_macro = base.model_copy(update={"fred_10y_change_3m": 0.8})
    assert compute_quant(with_macro).quant_score < compute_quant(base).quant_score  # rising yields drag


def test_stale_data_flagged():
    r = compute_quant(QuantInputs(ticker="X", price=1.0, ret_6m=10.0, trailing_pe=15.0, data_age_days=9))
    assert any(f.startswith("stale:") for f in r.freshness_flags)


def test_components_expose_inputs_and_notes():
    r = compute_quant(load_inputs("megacap"))
    val = next(c for c in r.components if c.name == "valuation")
    assert val.inputs_used["trailing_pe"] == 33.0 and "P/E" in val.note
    assert r.drivers and r.drivers[0].split(":")[0] in {"valuation", "momentum", "risk", "balance_sheet", "macro"}
