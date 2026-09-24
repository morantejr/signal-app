from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

import httpx

from signal_research.agents.critic import quant_claim_mismatches
from signal_research.calibration import evaluate, log_prediction
from signal_research.data.edgar import EdgarClient, extract_section, html_to_text
from signal_research.evidence.store import EvidenceStore
from signal_research.pipeline import run
from signal_research.quant.score import compute_quant
from signal_research.schemas import Claim, Source
from tests.conftest import bundle_for, completion, fake_client, load_inputs, memo_json, synthesis_json

TENK = """<html><body>
<p>TABLE OF CONTENTS</p><p>Item 1A. Risk Factors 12</p><p>Item 1B. Unresolved Staff Comments 30</p><p>Item 7. Management's Discussion 40</p>
<p>ITEM 1A. RISK FACTORS</p><p>""" + ("Our business depends on advertising budgets remaining generous. " * 60) + """</p>
<p>ITEM 1B. UNRESOLVED STAFF COMMENTS</p><p>None.</p>
<p>ITEM 7. MANAGEMENT'S DISCUSSION AND ANALYSIS</p><p>""" + ("Revenue increased 38% driven by platform adoption. " * 60) + """</p>
<p>ITEM 7A. QUANTITATIVE AND QUALITATIVE DISCLOSURES</p></body></html>"""


def test_html_to_text_and_sections_skip_table_of_contents():
    text = html_to_text(TENK)
    risk = extract_section(text, r"item\s*1a\.?\s*[\-–—:]?\s*risk\s+factors", r"item\s*1b\b")
    assert risk and risk.lower().startswith("item 1a. risk factors") and "advertising budgets" in risk and "UNRESOLVED" not in risk
    mdna = extract_section(text, r"item\s*7\.?\s*[\-–—:]?\s*management", r"item\s*7a\b")
    assert mdna and "Revenue increased 38%" in mdna


def test_filing_excerpts_become_citable_sources():
    def handler(req: httpx.Request) -> httpx.Response:
        return httpx.Response(200, text=TENK)

    ed = EdgarClient("test agent", client=httpx.Client(transport=httpx.MockTransport(handler)))
    filings = [Source(source_id="edgar:0001-25-1", kind="filing", title="10-K filed 2026-02-25", url="https://www.sec.gov/x.htm", accession="0001-25-1", data={"form": "10-K", "filed": "2026-02-25"})]
    ex = ed.filing_excerpts(filings)
    assert [e.source_id for e in ex] == ["edgar:0001-25-1#risk-factors", "edgar:0001-25-1#mdna"]
    assert all(e.kind == "filing" and e.excerpt and e.accession == "0001-25-1" for e in ex)


def test_quant_claim_mismatch_rule():
    q = compute_quant(load_inputs("growth"))  # ret_6m 22.0, max_drawdown -28.0
    ok = Claim(claim_id="a", text="The 6-month return is 22.0% and the 1-year drawdown was 28%.", stance="bull", support="sourced", source_ids=["quant:v0.1"], confidence=0.9)
    bad = Claim(claim_id="b", text="The quant shows a forward P/E of 24.65 driving the score.", stance="bear", support="sourced", source_ids=["quant:v0.1"], confidence=0.9)
    unrelated = Claim(claim_id="c", text="Revenue was $1,234.5 million.", stance="bull", support="sourced", source_ids=["yf:info:ZETA"], confidence=0.9)
    assert quant_claim_mismatches([ok, bad, unrelated], q) == ["b"]


def test_one_sided_synthesis_and_mismatch_are_flagged(no_llm_settings, runs_root):
    syn = synthesis_json("bullish", extra={"claims": [{"text": "Drawdown was 99.9% per the quant.", "stance": "bull", "source_ids": ["quant:v0.1"], "confidence": 0.9}, {"text": "More bull.", "stance": "bull", "source_ids": ["yf:info:ZETA"], "confidence": 0.8}]})
    client = fake_client([completion(memo_json("bull")), completion(memo_json("bear")), completion(syn)])
    r = run("ZETA", settings=no_llm_settings, client=client, evidence_fn=lambda t, s, tr: bundle_for("growth"), runs_root=runs_root)
    assert "synthesis_one_sided" in r.critic.flags
    assert any(f.startswith("quant_claim_mismatch:syn-1") for f in r.critic.flags)


def test_memos_run_in_parallel_but_synthesis_waits(no_llm_settings, runs_root):
    client = fake_client([completion(memo_json("bull")), completion(memo_json("bear")), completion(synthesis_json())])
    r = run("ZETA", settings=no_llm_settings, client=client, evidence_fn=lambda t, s, tr: bundle_for("growth"), runs_root=runs_root)
    events = [json.loads(l) for l in (runs_root / r.run_id / "trace.jsonl").read_text().splitlines()]
    spans = [e["name"] for e in events if e["kind"] == "span_start"]
    assert spans == ["evidence", "quant", "memos", "synthesis", "critic"]
    gens = [e["name"] for e in events if e["kind"] == "generation"]
    assert set(gens[:2]) == {"bull_memo", "bear_memo"} and gens[2] == "synthesis"


def test_prediction_logged_and_calibration_report(no_llm_settings, runs_root):
    r = run("ZETA", settings=no_llm_settings, evidence_fn=lambda t, s, tr: bundle_for("growth"), runs_root=runs_root)
    path = runs_root / "predictions.jsonl"
    rec = json.loads(path.read_text().splitlines()[-1])
    assert rec["run_id"] == r.run_id and rec["quant_band"] == r.quant.quant_band and rec["horizon_end"] > rec["at"][:10]
    # nothing matured yet
    assert evaluate(path, price_fn=lambda t, d: 99.0)["matured"] == 0
    # pretend 91 days passed: price up 20% → attractive-band hit
    later = datetime.now(timezone.utc) + timedelta(days=91)
    rep = evaluate(path, price_fn=lambda t, d: rec["price"] * 1.2, today=later)
    assert rep["matured"] == 1 and rep["by_quant_band"][rec["quant_band"]]["avg_return_pct"] == 20.0


def test_store_latest_run(no_llm_settings, runs_root, tmp_path):
    store = EvidenceStore(tmp_path / "db.sqlite")
    r = run("ZETA", settings=no_llm_settings, evidence_fn=lambda t, s, tr: bundle_for("growth"), store=store, runs_root=runs_root)
    assert store.latest_run("zeta").run_id == r.run_id
    assert store.latest_run("ZETA", max_age_hours=0) is None
    assert store.latest_run("NOPE") is None


def test_api_serves_cached_and_fresh_runs(no_llm_settings, runs_root, tmp_path, monkeypatch):
    from fastapi.testclient import TestClient

    from signal_research import api

    monkeypatch.setattr(api, "_DB", str(tmp_path / "api.sqlite"))
    monkeypatch.setattr(api, "load_settings", lambda: no_llm_settings)
    monkeypatch.setattr(api, "run", lambda ticker, **kw: run(ticker, evidence_fn=lambda t, s, tr: bundle_for("growth"), runs_root=runs_root, **kw))
    c = TestClient(api.app)
    assert c.get("/health").json()["ok"] is True
    first = c.get("/research/zeta").json()
    assert first["ticker"] == "ZETA" and first["quant"]["quant_version"] == "v0.1"
    assert c.get("/research/ZETA").json()["run_id"] == first["run_id"]  # cached
    assert c.get("/research/ZETA?refresh=1").json()["run_id"] != first["run_id"]
    assert len(c.get("/runs").json()) == 2 and c.get(f"/runs/{first['run_id']}").json()["run_id"] == first["run_id"]
    assert c.get("/runs/nope").status_code == 404
