"""BullAgent and BearAgent. Same code path, opposite side. Read quant; never write it."""

from __future__ import annotations

from ..llm.openrouter import OpenRouterClient
from ..schemas import Claim, ClaimOut, EvidenceBundle, Memo, MemoOut, QuantResult
from ..tracing import Tracer
from .prompts import memo_messages


def label_claims(prefix: str, outs: list[ClaimOut], known_source_ids: set[str]) -> list[Claim]:
    claims: list[Claim] = []
    for n, c in enumerate(outs, 1):
        cited = [s for s in c.source_ids if s in known_source_ids]
        if c.is_inference:
            support = "inference"
        elif cited:
            support = "sourced"
        else:
            support = "unsupported"
        claims.append(Claim(claim_id=f"{prefix}-{n}", text=c.text.strip(), stance=c.stance, support=support, source_ids=list(c.source_ids), confidence=c.confidence))
    return claims


def stub_memo(side: str, b: EvidenceBundle, q: QuantResult) -> Memo:
    want = 1 if side == "bull" else -1
    outs: list[ClaimOut] = []
    for c in q.components:
        if c.value is None:
            continue
        if (c.value > 0) == (want > 0) and abs(c.value) >= 0.15:
            outs.append(ClaimOut(text=f"{c.name}: {c.note}", stance=side, source_ids=list(q.quant_inputs.source_ids), confidence=0.5, is_inference=False))
    if not outs:
        outs.append(ClaimOut(text=f"No quant component clearly supports the {side} case right now.", stance="context", source_ids=[], confidence=0.4, is_inference=True))
    known = {s.source_id for s in b.sources}
    return Memo(
        side=side,  # type: ignore[arg-type]
        summary=f"[STUB — no OPENROUTER_API_KEY] {side.title()} case assembled from quant components only. Set a key to get a sourced memo.",
        claims=label_claims(side, outs, known),
        steelman_of_other_side="(stub)",
        missing_data=["LLM memo not generated"],
        model=None,
        provider=None,
        is_stub=True,
    )


def write_memo(side: str, b: EvidenceBundle, q: QuantResult, *, client: OpenRouterClient | None, model: str, thesis: str | None, horizon: str, tracer: Tracer | None = None) -> Memo:
    if client is None:
        return stub_memo(side, b, q)
    out, res = client.chat_json(memo_messages(side, b, q, thesis, horizon), MemoOut, model=model, tracer=tracer, name=f"{side}_memo")
    known = {s.source_id for s in b.sources}
    return Memo(side=side, summary=out.summary, claims=label_claims(side, out.claims, known), steelman_of_other_side=out.steelman_of_other_side, missing_data=out.missing_data, model=res.model, provider=res.provider, is_stub=False)  # type: ignore[arg-type]
