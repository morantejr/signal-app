from __future__ import annotations

import json

from signal_research.evidence.store import EvidenceStore
from signal_research.pipeline import run
from signal_research.quant.score import compute_quant
from tests.conftest import bundle_for, completion, fake_client, memo_json, synthesis_json


def test_stub_run_without_llm(no_llm_settings, runs_root, tmp_path):
    store = EvidenceStore(tmp_path / "db.sqlite")
    r = run("zeta", settings=no_llm_settings, evidence_fn=lambda t, s, tr: bundle_for("growth"), store=store, runs_root=runs_root)
    assert r.bull.is_stub and r.bear.is_stub and r.brief.is_stub
    assert r.quant == compute_quant(bundle_for("growth").quant_inputs, now=r.quant.computed_at)
    assert "stub_outputs_present" in r.critic.flags
    assert (runs_root / r.run_id / "result.json").exists() and (runs_root / r.run_id / "trace.jsonl").exists()
    assert store.load_run(r.run_id) == r


def test_llm_run_traces_each_generation(no_llm_settings, runs_root):
    client = fake_client([completion(memo_json("bull")), completion(memo_json("bear")), completion(synthesis_json("bullish"))])
    r = run("ZETA", settings=no_llm_settings, client=client, evidence_fn=lambda t, s, tr: bundle_for("growth"), runs_root=runs_root)
    assert not r.bull.is_stub and r.models["bull"] == "google/gemma-4-31b-it:free" and r.bull.provider == "TestProvider"
    events = [json.loads(l) for l in (runs_root / r.run_id / "trace.jsonl").read_text().splitlines()]
    gens = [e for e in events if e["kind"] == "generation"]
    assert [g["name"] for g in gens] == ["bull_memo", "bear_memo", "synthesis"]
    assert all(g["model"] and g["usage"]["input"] == 10 for g in gens)
    spans = [e["name"] for e in events if e["kind"] == "span_start"]
    assert spans == ["evidence", "quant", "bull_memo", "bear_memo", "synthesis", "critic"]
