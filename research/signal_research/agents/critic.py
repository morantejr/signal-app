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


# Phrases that describe an input; flagged when the quant did not actually use that input.
_INPUT_PHRASES = {
    "forward_pe": r"forward\s*p/?e",
    "ev_to_ebitda": r"ev\s*/\s*ebitda|enterprise value",
    "revenue_growth": r"revenue growth|sales growth",
    "profit_margin": r"profit margin|net margin",
    "trailing_pe": r"trailing\s*p/?e|price[- ]to[- ]earnings",
    "price_to_sales": r"price[- ]to[- ]sales|p/s\b",
    "debt_to_equity": r"debt[- ]to[- ]equity|leverage",
    "current_ratio": r"current ratio|liquidity",
    "free_cash_flow": r"free cash flow|fcf",
    "max_drawdown_1y": r"drawdown",
    "vol_60d_ann": r"volatility",
    "fred_10y_change_3m": r"treasury|10[- ]year yield|interest rate|macro",
}
_STRUCTURE_VERBS = r"(uses|relies|relying|treats|includes|weights|weighting|incorporates|based on|accounts for|considers|penali[sz]es|rewards|inputs?)"
_UNUSED_CONCEPTS = {"peers": r"\bpeers?\b|sector comparison|relative to (the )?sector", "sharpe": r"sharpe", "earnings quality": r"earnings quality|accruals", "sentiment": r"sentiment"}


def quant_structure_flags(texts: list[str], quant: QuantResult) -> list[str]:
    """Statements about how the quant works must match how it actually works.

    Checks: "equal weighting" against the real weights; "the quant uses X" against the
    inputs each component recorded; concepts v0 does not model at all."""
    flags: list[str] = []
    weights = {round(c.weight, 4) for c in quant.components}
    used_inputs = {k for c in quant.components for k in c.inputs_used}
    # inputs_used keys are not always the raw field name; map the common aliases
    alias = {"ps_vs_own_median": "price_to_sales", "ret_12m_minus_1m": "ret_12m", "free_cash_flow_positive": "free_cash_flow"}
    used_inputs = {alias.get(k, k) for k in used_inputs}
    for text in texts:
        t = text.lower()
        if re.search(r"equal(ly)?[- ]weight", t) and len(weights) > 1:
            flags.append("quant_structure:equal_weighting_claimed")
        if re.search(_STRUCTURE_VERBS, t):
            for field, pat in _INPUT_PHRASES.items():
                if re.search(pat, t) and field not in used_inputs:
                    flags.append(f"quant_structure:claims_use_of_{field}")
        for name, pat in _UNUSED_CONCEPTS.items():
            if re.search(rf"(uses|includes|incorporates|based on|considers|compares?|relative to|against).{{0,40}}({pat})", t):
                flags.append(f"quant_structure:claims_use_of_{name}")
    return sorted(set(flags))


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
    quant_texts = [c.text for c in all_claims if any(s.startswith("quant:") for s in c.source_ids)] + list(brief.disagreement.quant_may_be_wrong_because)
    flags.extend(quant_structure_flags(quant_texts, quant))
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
