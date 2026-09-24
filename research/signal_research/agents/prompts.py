"""Prompts for the OpenRouter agents. The quant result is rendered read-only."""

from __future__ import annotations

import json

from ..schemas import EvidenceBundle, Memo, QuantResult

RULES = """Rules you must follow:
- Prefer primary sources (filings, reported numbers). Separate fact from interpretation.
- Every claim must cite source_ids from the EVIDENCE list. If you cannot cite one, set is_inference=true.
- A claim about the quant components (momentum, drawdown, valuation multiple vs history, etc.) cites the quant source id shown in the QUANT block, plus the underlying data source ids.
- confidence is a number between 0 and 1: how sure YOU are that the claim is true given the evidence. 0.9 = the number is read straight from a source; 0.5 = a reasonable inference; never leave it at 0.
- Never invent prices, multiples, dates or filing quotes. If a number is not in the evidence, say it is missing.
- No price targets. No "sure thing" language. State what data is missing and where you might be biased.
- The QUANT block is read-only context computed by code. Do not restate it as your own number, do not adjust it, do not output any score field.
- Output only a JSON object matching the schema. No prose outside the JSON."""

MEMO_SCHEMA = {
    "summary": "3-6 sentences",
    "claims": [{"text": "one factual or interpretive claim", "stance": "bull|bear|neutral|context", "source_ids": ["ids from EVIDENCE"], "confidence": 0.85, "is_inference": False}],
    "steelman_of_other_side": "2-4 sentences giving the strongest opposing point",
    "missing_data": ["what you wanted but did not have"],
}

SYNTHESIS_SCHEMA = {
    "one_view": "4-8 sentences: what a careful reader should take away, acknowledging both memos",
    "narrative_lean": "bullish|bearish|neutral|mixed",
    "kill_criteria": ["observable events or numbers that would falsify the prevailing case"],
    "claims": [{"text": "...", "stance": "bull|bear|neutral|context", "source_ids": ["..."], "confidence": 0.85, "is_inference": False}],
    "quant_may_be_wrong_because": ["reasons the code-computed score could mislead here"],
    "narrative_may_be_wrong_because": ["reasons the memos could mislead here"],
}


def render_quant(q: QuantResult) -> str:
    lines = [f"QUANT (read-only, {q.quant_version}, computed {q.computed_at.isoformat()}; cite as source_id quant:{q.quant_version}):", f"  score={q.quant_score} band={q.quant_band}"]
    for c in q.components:
        lines.append(f"  {c.name} (w={c.weight}): value={c.value} — {c.note}")
    if q.freshness_flags:
        lines.append(f"  flags: {', '.join(q.freshness_flags)}")
    return "\n".join(lines)


def render_evidence(b: EvidenceBundle) -> str:
    lines = [f"COMPANY: {json.dumps(b.company)}", "NUMERIC INPUTS (source_ids: " + ", ".join(b.quant_inputs.source_ids) + "):"]
    lines.append("  " + json.dumps({k: v for k, v in b.quant_inputs.model_dump(mode="json").items() if v is not None and k not in ("source_ids",)}))
    lines.append("EVIDENCE:")
    for s in b.sources:
        extra = f" data={json.dumps(s.data)[:400]}" if s.data else ""
        lines.append(f"  [{s.source_id}] ({s.kind}) {s.title} {s.url or ''}{extra}")
    if b.notes:
        lines.append("NOTES: " + "; ".join(b.notes))
    return "\n".join(lines)


def memo_messages(side: str, b: EvidenceBundle, q: QuantResult, thesis: str | None, horizon: str) -> list[dict[str, str]]:
    role = "the strongest honest BULL case" if side == "bull" else "the strongest honest BEAR case"
    other = "bear" if side == "bull" else "bull"
    system = f"You are an equity research analyst writing {role} for {b.ticker} over a {horizon} horizon. You also steelman the {other} case briefly.\n{RULES}\nSchema: {json.dumps(MEMO_SCHEMA)}"
    user = f"USER THESIS: {thesis or '(none given)'}\n\n{render_quant(q)}\n\n{render_evidence(b)}"
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def synthesis_messages(b: EvidenceBundle, q: QuantResult, bull: Memo, bear: Memo, thesis: str | None, horizon: str) -> list[dict[str, str]]:
    system = f"You are the synthesis desk. You have a bull memo and a bear memo for {b.ticker} ({horizon} horizon) plus a read-only quant score. Produce one view WITHOUT averaging the two memos into mush: say what each side gets right, what would settle it, and where the quant score and the narrative disagree. List kill criteria.\n{RULES}\nSchema: {json.dumps(SYNTHESIS_SCHEMA)}"
    user = f"USER THESIS: {thesis or '(none given)'}\n\n{render_quant(q)}\n\nBULL MEMO ({bull.model or 'stub'}):\n{bull.model_dump_json(include={'summary', 'claims', 'steelman_of_other_side', 'missing_data'})}\n\nBEAR MEMO ({bear.model or 'stub'}):\n{bear.model_dump_json(include={'summary', 'claims', 'steelman_of_other_side', 'missing_data'})}\n\n{render_evidence(b)}"
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]
