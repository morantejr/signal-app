"""Critic: deterministic checks on claim → source backing. Flags; never rewrites."""

from __future__ import annotations

from ..schemas import Brief, CriticReport, Memo, QuantResult, Source


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
    if bull.is_stub or bear.is_stub or brief.is_stub:
        flags.append("stub_outputs_present")
    if quant.quant_band == "unknown":
        flags.append("quant_unknown")
    if not brief.disagreement.agree:
        flags.append("quant_narrative_disagree")
    return CriticReport(flags=flags, unsupported_claim_ids=unsupported, dangling_source_ids=dangling, sourced_share_high_conf=share)
