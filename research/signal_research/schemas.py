"""Shared, persisted schemas. These are the contracts between stages.

Two rules are enforced by the shapes themselves:
- Nothing an LLM returns (MemoOut, SynthesisOut) carries a quant score field.
  Extra fields are dropped on validation, so a model that tries to emit one is ignored.
- Every claim carries a `support` label and `source_ids`; the critic checks them.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Stance = Literal["bull", "bear", "neutral", "context"]
Support = Literal["sourced", "inference", "unsupported"]
Band = Literal["attractive", "fair", "expensive", "unknown"]
Lean = Literal["bullish", "bearish", "neutral", "mixed"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Source(BaseModel):
    source_id: str
    kind: Literal["price", "fundamental", "filing", "facts", "news", "macro", "user", "derived"]
    title: str
    url: str | None = None
    accession: str | None = None
    retrieved_at: datetime = Field(default_factory=utcnow)
    excerpt: str | None = None
    data: dict = Field(default_factory=dict)


class Claim(BaseModel):
    claim_id: str
    text: str
    stance: Stance
    support: Support
    source_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(ge=0.0, le=1.0)


class QuantInputs(BaseModel):
    """Numeric inputs only. Anything the quant engine reads must be here, so the
    persisted `quant_inputs` fully determine `quant_score`."""

    ticker: str
    as_of: datetime = Field(default_factory=utcnow)
    price: float | None = None
    high_52w: float | None = None
    low_52w: float | None = None
    ret_1m: float | None = None
    ret_3m: float | None = None
    ret_6m: float | None = None
    ret_12m: float | None = None
    vol_60d_ann: float | None = None
    max_drawdown_1y: float | None = None
    trailing_pe: float | None = None
    forward_pe: float | None = None
    price_to_sales: float | None = None
    ps_hist_median: float | None = None
    ev_to_ebitda: float | None = None
    debt_to_equity: float | None = None
    current_ratio: float | None = None
    free_cash_flow: float | None = None
    revenue_growth: float | None = None
    profit_margin: float | None = None
    fred_10y_change_3m: float | None = None
    data_age_days: float | None = None
    source_ids: list[str] = Field(default_factory=list)


class QuantComponent(BaseModel):
    name: str
    value: float | None
    weight: float
    inputs_used: dict = Field(default_factory=dict)
    note: str


class QuantResult(BaseModel):
    ticker: str
    quant_score: int | None
    quant_band: Band
    components: list[QuantComponent]
    quant_inputs: QuantInputs
    quant_version: str
    computed_at: datetime
    freshness_flags: list[str] = Field(default_factory=list)
    drivers: list[str] = Field(default_factory=list)


class ClaimOut(BaseModel):
    """Claim as an LLM emits it (no id; ids are assigned in code)."""

    model_config = ConfigDict(extra="ignore")
    text: str
    stance: Stance = "context"
    source_ids: list[str] = Field(default_factory=list)
    confidence: float = Field(default=0.5, ge=0.0, le=1.0)
    is_inference: bool = False


class MemoOut(BaseModel):
    """What BullAgent / BearAgent must return. Extra fields (e.g. a score) are dropped."""

    model_config = ConfigDict(extra="ignore")
    summary: str
    claims: list[ClaimOut]
    steelman_of_other_side: str = ""
    missing_data: list[str] = Field(default_factory=list)


class Memo(BaseModel):
    side: Literal["bull", "bear"]
    summary: str
    claims: list[Claim]
    steelman_of_other_side: str
    missing_data: list[str] = Field(default_factory=list)
    model: str | None
    provider: str | None
    is_stub: bool


class SynthesisOut(BaseModel):
    model_config = ConfigDict(extra="ignore")
    one_view: str
    narrative_lean: Lean
    kill_criteria: list[str] = Field(default_factory=list)
    claims: list[ClaimOut] = Field(default_factory=list)
    quant_may_be_wrong_because: list[str] = Field(default_factory=list)
    narrative_may_be_wrong_because: list[str] = Field(default_factory=list)


class Disagreement(BaseModel):
    quant_band: Band
    quant_score: int | None
    narrative_lean: Lean
    agree: bool
    disagreement_summary: str
    quant_may_be_wrong_because: list[str]
    narrative_may_be_wrong_because: list[str]


class Brief(BaseModel):
    ticker: str
    one_view: str
    narrative_lean: Lean
    claims: list[Claim]
    kill_criteria: list[str]
    disagreement: Disagreement
    model: str | None
    provider: str | None
    is_stub: bool


class CriticReport(BaseModel):
    flags: list[str]
    unsupported_claim_ids: list[str]
    dangling_source_ids: list[str]
    sourced_share_high_conf: float | None


class EvidenceBundle(BaseModel):
    ticker: str
    company: dict = Field(default_factory=dict)
    sources: list[Source]
    quant_inputs: QuantInputs
    filings: list[Source] = Field(default_factory=list)
    facts: dict = Field(default_factory=dict)
    notes: list[str] = Field(default_factory=list)


class RunResult(BaseModel):
    run_id: str
    ticker: str
    thesis: str | None
    horizon: str
    created_at: datetime
    sources: list[Source]
    quant: QuantResult
    bull: Memo
    bear: Memo
    brief: Brief
    critic: CriticReport
    models: dict[str, str]
    is_prototype: bool = True
