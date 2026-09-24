"""EvidenceAgent: code only. Gathers numeric tables and primary-source pointers."""

from __future__ import annotations

from ..config import Settings
from ..data.edgar import EdgarClient
from ..data.fred import ten_year_change_3m
from ..data.yfinance_source import fetch_quant_inputs
from ..schemas import EvidenceBundle, Source
from ..tracing import Tracer


def gather(ticker: str, settings: Settings, tracer: Tracer | None = None, *, edgar: EdgarClient | None = None) -> EvidenceBundle:
    notes: list[str] = []
    sources: list[Source] = []

    quant_inputs, yf_sources, company = fetch_quant_inputs(ticker)
    sources.extend(yf_sources)
    if quant_inputs.price is None:
        notes.append("yfinance returned no price history")

    filings: list[Source] = []
    facts: dict = {}
    try:
        ed = edgar or EdgarClient(settings.edgar_user_agent)
        filings = ed.recent_filings(ticker)
        facts, facts_src = ed.company_facts(ticker)
        sources.extend(filings)
        if facts_src:
            sources.append(facts_src)
    except Exception as exc:  # noqa: BLE001
        notes.append(f"EDGAR unavailable: {exc}")

    if settings.fred_api_key:
        try:
            change, src = ten_year_change_3m(settings.fred_api_key)
            if src:
                sources.append(src)
                quant_inputs = quant_inputs.model_copy(update={"fred_10y_change_3m": change, "source_ids": quant_inputs.source_ids + [src.source_id]})
        except Exception as exc:  # noqa: BLE001
            notes.append(f"FRED unavailable: {exc}")
    else:
        notes.append("FRED_API_KEY not set; macro overlay skipped")

    if tracer:
        tracer.event("evidence_gathered", {"ticker": ticker, "sources": len(sources), "filings": len(filings), "notes": notes})
    return EvidenceBundle(ticker=ticker, company=company, sources=sources, quant_inputs=quant_inputs, filings=filings, facts=facts, notes=notes)
