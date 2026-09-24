"""CLI: python -m signal_research.run --ticker ZETA [--thesis "..."] [--horizon 3m] [--no-llm] [--json]"""

from __future__ import annotations

import argparse
import json
import sys

from .config import load_settings
from .evidence.store import EvidenceStore
from .pipeline import run
from .schemas import RunResult


def report(r: RunResult) -> str:
    q, d = r.quant, r.brief.disagreement
    out = [
        f"SIGNAL research — {r.ticker}  run {r.run_id}  [PROTOTYPE: agents may be stubbed; quant, schemas and traces are real]",
        "",
        f"QUANT ({q.quant_version}, code only): score={q.quant_score} band={q.quant_band}  flags={q.freshness_flags}",
    ]
    out += [f"  - {dr}" for dr in q.drivers]
    for memo in (r.bull, r.bear):
        out += ["", f"{memo.side.upper()} MEMO  model={memo.model or 'stub'} provider={memo.provider or '-'}", f"  {memo.summary}"]
        out += [f"  [{c.claim_id}] ({c.support}, conf {c.confidence:.2f}) {c.text}  ← {', '.join(c.source_ids) or 'no sources'}" for c in memo.claims]
        out.append(f"  steelman: {memo.steelman_of_other_side}")
    out += ["", f"SYNTHESIS  model={r.brief.model or 'stub'}", f"  {r.brief.one_view}", f"  kill criteria: {r.brief.kill_criteria}"]
    out += ["", f"DISAGREEMENT  agree={d.agree}  quant={d.quant_band}({d.quant_score})  narrative={d.narrative_lean}", f"  {d.disagreement_summary}", f"  quant may be wrong: {d.quant_may_be_wrong_because}", f"  narrative may be wrong: {d.narrative_may_be_wrong_because}"]
    out += ["", f"CRITIC  flags={r.critic.flags}  sourced share (high conf)={r.critic.sourced_share_high_conf}  dangling={r.critic.dangling_source_ids}"]
    out += ["", f"SOURCES ({len(r.sources)}):"] + [f"  [{s.source_id}] {s.title} {s.url or ''}" for s in r.sources]
    out += ["", f"trace: runs/{r.run_id}/trace.jsonl   result: runs/{r.run_id}/result.json"]
    return "\n".join(out)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Run the SIGNAL research pipeline for one ticker")
    p.add_argument("--ticker", required=True)
    p.add_argument("--thesis", default=None)
    p.add_argument("--horizon", default="3m")
    p.add_argument("--no-llm", action="store_true", help="skip OpenRouter even if a key is set (stub memos)")
    p.add_argument("--json", action="store_true", help="print the full RunResult as JSON")
    p.add_argument("--db", default="signal_research.sqlite")
    a = p.parse_args(argv)
    s = load_settings()
    if a.no_llm:
        s = type(s)(**{**s.__dict__, "openrouter_api_key": ""})
    store = EvidenceStore(a.db)
    try:
        r = run(a.ticker, settings=s, thesis=a.thesis, horizon=a.horizon, store=store)
    finally:
        store.close()
    print(json.dumps(r.model_dump(mode="json"), indent=2) if a.json else report(r))
    return 0


if __name__ == "__main__":
    sys.exit(main())
