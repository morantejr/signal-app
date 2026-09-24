"""Critic: deterministic checks on claim → source backing. Flags; never rewrites."""

from __future__ import annotations

import re

from ..schemas import Brief, Claim, CriticReport, Memo, QuantResult, Source

# Numbers not glued to a word or any kind of dash ("60-day", "60‑day", "10‑year" are labels, not metrics).
_DASH = "\\-\u2010\u2011\u2012\u2013\u2014"
_NUM = re.compile(rf"(?<![\w.{_DASH}])-?\d+(?:\.\d+)?(?![\w{_DASH}])")


def _quant_numbers(q: QuantResult) -> list[float]:
    nums: list[float] = []
    for v in q.quant_inputs.model_dump().values():
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            nums.append(float(v))
    if q.quant_score is not None:
        nums.append(float(q.quant_score))
    for c in q.components:
        if c.value is not None:
            nums.append(float(c.value))
        nums.extend(float(x) for x in _NUM.findall(c.note))
        for v in c.inputs_used.values():
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                nums.append(float(v))
    return nums


def quant_claim_mismatches(claims: list[Claim], quant: QuantResult) -> list[str]:
    """A claim that cites the quant result must not carry numbers the quant never produced."""
    known = _quant_numbers(quant)
    bad: list[str] = []
    for c in claims:
        if not any(sid.startswith("quant:") for sid in c.source_ids):
            continue
        for tok in _NUM.findall(c.text):
            n = abs(float(tok))
            if n < 13 and "." not in tok:  # "3 months", "1-year", "6-month": not a metric
                continue
            if not any(abs(n - abs(k)) <= max(0.6, 0.01 * abs(k)) for k in known):
                bad.append(c.claim_id)
                break
    return bad


def critique(sources: list[Source], quant: QuantResult, bull: Memo, bear: Memo, brief: Brief, *, high_conf: float = 0.7, min_sourced_share: float = 0.8) -> CriticReport:
    known = {s.source_id for s in sources}
    all_claims = bull.claims + bear.claims + brief.claims
    dangling = sorted({sid for c in all_claims for sid in c.source_ids if sid not in known})
    unsupported = [c.claim_id for c in all_claims if c.support == "unsupported"]
    high = [c for c in all_claims if c.confidence >= high_conf]
    share = (sum(1 for c in high if c.support == "sourced") / len(high)) if high else None
    flags: list[str] = []
    if share is not None and share < min_sourced_share:
        flags.append(f"high_confidence_claims_undersourced:{share:.2f}")
    if dangling:
        flags.append(f"dangling_source_ids:{len(dangling)}")
    if unsupported:
        flags.append(f"unsupported_claims:{len(unsupported)}")
    zero = [c.claim_id for c in all_claims if c.confidence == 0.0]
    if zero:
        flags.append(f"zero_confidence_claims:{len(zero)}")
    mismatched = quant_claim_mismatches(all_claims, quant)
    if mismatched:
        flags.append(f"quant_claim_mismatch:{','.join(mismatched)}")
    stances = {c.stance for c in brief.claims if c.stance in ("bull", "bear")}
    if brief.claims and not brief.is_stub and len(stances) == 1:
        flags.append("synthesis_one_sided")
    if bull.is_stub or bear.is_stub or brief.is_stub:
        flags.append("stub_outputs_present")
    if quant.quant_band == "unknown":
        flags.append("quant_unknown")
    if not brief.disagreement.agree:
        flags.append("quant_narrative_disagree")
    return CriticReport(flags=flags, unsupported_claim_ids=unsupported, dangling_source_ids=dangling, sourced_share_high_conf=share)
