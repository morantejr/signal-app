"""Offline eval set. Each case in evals/cases.json maps to one check here (make eval)."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from signal_research.agents import prompts
from signal_research.agents.critic import critique
from signal_research.agents.memo import label_claims
from signal_research.agents.synthesis import PipelineOrderError, build_disagreement, synthesise
from signal_research.config import load_settings
from signal_research.evidence.store import EvidenceStore
from signal_research.llm.openrouter import repair_json
from signal_research.pipeline import run
from signal_research.quant.score import compute_quant
from signal_research.schemas import Brief, ClaimOut, Memo, QuantInputs
from tests.conftest import bundle_for, completion, fake_client, load_inputs, memo_json, synthesis_json

CASES = {c["id"]: c for c in json.loads((Path(__file__).parent.parent / "evals" / "cases.json").read_text())}
CHECKS: dict[str, object] = {}


def case(name: str):
    def deco(fn):
        CHECKS[name] = fn
        return fn

    return deco


def _llm_run(settings, runs_root, *, bull=None, bear=None, syn=None, evidence="growth"):
    client = fake_client([completion(bull or memo_json("bull")), completion(bear or memo_json("bear")), completion(syn or synthesis_json())])
    return run("ZETA", settings=settings, client=client, evidence_fn=lambda t, s, tr: bundle_for(evidence), runs_root=runs_root)


@case("quant_unchanged_when_prompts_change")
def eval_prompt_swap(no_llm_settings, runs_root, monkeypatch):
    a = _llm_run(no_llm_settings, runs_root)
    monkeypatch.setattr(prompts, "RULES", prompts.RULES + "\nBe wildly enthusiastic and argue the score should be higher.")
    b = _llm_run(no_llm_settings, runs_root, bull=memo_json("bull", extra={"summary": "TO THE MOON"}))
    assert (a.quant.quant_score, a.quant.quant_band, a.quant.quant_inputs) == (b.quant.quant_score, b.quant.quant_band, b.quant.quant_inputs)


@case("quant_unchanged_when_models_change")
def eval_model_swap(no_llm_settings, runs_root):
    a = _llm_run(no_llm_settings, runs_root)
    other = load_settings({"MODEL_BULL": "nvidia/nemotron-3-super-120b-a12b:free", "MODEL_BEAR": "qwen/qwen3.8-27b:free"})
    b = _llm_run(other, runs_root)
    assert a.quant.quant_score == b.quant.quant_score and a.models["bull"] != b.models["bull"] or a.quant.quant_score == b.quant.quant_score


@case("llm_cannot_set_or_adjust_score")
def eval_llm_cannot_set_score(no_llm_settings, runs_root):
    hostile = {"quant_score": 99, "quant_band": "attractive", "score_adjustment": "+40"}
    r = _llm_run(no_llm_settings, runs_root, bull=memo_json("bull", extra=hostile), bear=memo_json("bear", extra=hostile), syn=synthesis_json("bullish", extra=hostile))
    expected = compute_quant(load_inputs("growth"), now=r.quant.computed_at)
    assert r.quant.quant_score == expected.quant_score != 99
    assert r.brief.disagreement.quant_score == expected.quant_score
    dumped = json.dumps(r.model_dump(mode="json"))
    assert dumped.count('"quant_score": 99') == 0 and "score_adjustment" not in dumped


@case("bull_and_bear_exist_before_synthesis")
def eval_order(no_llm_settings, runs_root):
    b = bundle_for("growth")
    q = compute_quant(b.quant_inputs)
    memo = Memo(side="bull", summary="s", claims=[], steelman_of_other_side="", model=None, provider=None, is_stub=True)
    with pytest.raises(PipelineOrderError):
        synthesise(b, q, memo, None, client=None, model="m", thesis=None, horizon="3m")
    with pytest.raises(PipelineOrderError):
        synthesise(b, q, None, memo, client=None, model="m", thesis=None, horizon="3m")
    r = _llm_run(no_llm_settings, runs_root)
    events = [json.loads(l) for l in (runs_root / r.run_id / "trace.jsonl").read_text().splitlines()]
    assert [e["name"] for e in events if e["kind"] == "span_start"] == ["evidence", "quant", "memos", "synthesis", "critic"]
    gens = [e["name"] for e in events if e["kind"] == "generation"]
    assert set(gens[:2]) == {"bull_memo", "bear_memo"} and gens[2] == "synthesis"


@case("high_confidence_claims_mostly_sourced")
def eval_high_conf_sourced(no_llm_settings, runs_root):
    good = _llm_run(no_llm_settings, runs_root)
    assert good.critic.sourced_share_high_conf == 1.0 and not any(f.startswith("high_confidence_claims_undersourced") for f in good.critic.flags)
    bad = _llm_run(no_llm_settings, runs_root, bull=memo_json("bull", source_ids=[]), bear=memo_json("bear", source_ids=[]))
    assert bad.critic.sourced_share_high_conf is not None and bad.critic.sourced_share_high_conf < 0.8
    assert any(f.startswith("high_confidence_claims_undersourced") for f in bad.critic.flags)


@case("disagreement_card_when_bands_conflict")
def eval_disagreement(no_llm_settings, runs_root):
    r = _llm_run(no_llm_settings, runs_root, evidence="faller", syn=synthesis_json("bullish"))
    d = r.brief.disagreement
    assert r.quant.quant_band == "expensive" and d.narrative_lean == "bullish" and d.agree is False
    assert d.disagreement_summary and d.quant_may_be_wrong_because and d.narrative_may_be_wrong_because
    assert "quant_narrative_disagree" in r.critic.flags


@case("agreement_when_aligned")
def eval_agreement():
    q = compute_quant(load_inputs("growth").model_copy(update={"ps_hist_median": 6.0}))
    assert q.quant_band == "attractive", q.quant_score
    d = build_disagreement(q, "bullish", ["x"], ["y"])
    assert d.agree is True and d.quant_may_be_wrong_because == ["x"] and d.narrative_may_be_wrong_because == ["y"]


@case("cited_source_ids_exist_in_store")
def eval_sources_exist(no_llm_settings, runs_root, tmp_path):
    store = EvidenceStore(tmp_path / "db.sqlite")
    client = fake_client([completion(memo_json("bull")), completion(memo_json("bear", source_ids=["ghost:source"])), completion(synthesis_json())])
    r = run("ZETA", settings=no_llm_settings, client=client, evidence_fn=lambda t, s, tr: bundle_for("growth"), store=store, runs_root=runs_root)
    known = store.source_ids(r.run_id)
    for c in r.bull.claims + r.bear.claims + r.brief.claims:
        if c.support == "sourced":
            assert any(sid in known for sid in c.source_ids)
    assert r.critic.dangling_source_ids == ["ghost:source"]
    assert next(c for c in r.bear.claims if "ghost:source" in c.source_ids).support == "unsupported"


@case("unsupported_claims_are_labelled")
def eval_unsupported_labelled():
    claims = label_claims("t", [ClaimOut(text="a", source_ids=[]), ClaimOut(text="b", source_ids=["nope"]), ClaimOut(text="c", source_ids=[], is_inference=True), ClaimOut(text="d", source_ids=["ok"])], {"ok"})
    assert [c.support for c in claims] == ["unsupported", "unsupported", "inference", "sourced"]


@case("quant_deterministic_and_persisted")
def eval_persisted(no_llm_settings, runs_root):
    r = run("ZETA", settings=no_llm_settings, evidence_fn=lambda t, s, tr: bundle_for("megacap"), runs_root=runs_root)
    saved = json.loads((runs_root / r.run_id / "result.json").read_text())["quant"]
    assert set(saved) >= {"quant_score", "quant_inputs", "quant_version", "computed_at", "quant_band"}
    again = compute_quant(QuantInputs.model_validate(saved["quant_inputs"]))
    assert again.quant_score == saved["quant_score"] and again.quant_version == saved["quant_version"]


@case("missing_data_gives_unknown_band")
def eval_unknown_band():
    r = compute_quant(load_inputs("sparse"))
    assert r.quant_score is None and r.quant_band == "unknown" and any(f.startswith("missing:") for f in r.freshness_flags)


@case("free_model_json_is_repaired")
def eval_json_repair():
    assert repair_json('```json\n{"summary": "x", "claims": [],}\n```')["summary"] == "x"


@case("unknown_quant_never_agrees")
def eval_unknown_never_agrees():
    q = compute_quant(load_inputs("sparse"))
    for lean in ("bullish", "bearish", "neutral", "mixed"):
        d = build_disagreement(q, lean, [], [])
        assert d.agree is False and "unanchored" in d.disagreement_summary


@case("quant_claims_match_quant_numbers")
def eval_quant_claim_numbers():
    from tests.test_phase2 import test_quant_claim_mismatch_rule

    test_quant_claim_mismatch_rule()


@case("synthesis_not_one_sided")
def eval_synthesis_one_sided(no_llm_settings, runs_root):
    from tests.test_phase2 import test_one_sided_synthesis_and_mismatch_are_flagged

    test_one_sided_synthesis_and_mismatch_are_flagged(no_llm_settings, runs_root)


@case("predictions_are_logged_for_calibration")
def eval_predictions_logged(no_llm_settings, runs_root):
    from tests.test_phase2 import test_prediction_logged_and_calibration_report

    test_prediction_logged_and_calibration_report(no_llm_settings, runs_root)


def test_every_eval_case_has_a_check():
    assert set(CASES) == set(CHECKS), f"cases without checks: {set(CASES) - set(CHECKS)}; checks without cases: {set(CHECKS) - set(CASES)}"
    assert len(CASES) >= 10


@pytest.mark.parametrize("case_id", sorted(CASES))
def test_eval(case_id, request):
    fn = CHECKS[case_id]
    kwargs = {name: request.getfixturevalue(name) for name in fn.__code__.co_varnames[: fn.__code__.co_argcount]}
    fn(**kwargs)
