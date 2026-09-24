"""The run: evidence → quant (code) → bull → bear → synthesis → critic → persist.

`evidence_fn` is injectable so tests and offline runs never touch the network.
"""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from .agents.critic import critique
from .agents.evidence import gather
from .agents.memo import write_memo
from .agents.synthesis import synthesise
from .config import Settings
from .evidence.store import EvidenceStore
from .llm.openrouter import OpenRouterClient
from .quant.score import compute_quant
from .schemas import EvidenceBundle, RunResult
from .tracing import Tracer

EvidenceFn = Callable[[str, Settings, Tracer], EvidenceBundle]


def run(
    ticker: str,
    *,
    settings: Settings,
    thesis: str | None = None,
    horizon: str = "3m",
    client: OpenRouterClient | None = None,
    evidence_fn: EvidenceFn | None = None,
    store: EvidenceStore | None = None,
    runs_root: Path | None = None,
) -> RunResult:
    ticker = ticker.upper().strip()
    run_id = f"{ticker.lower()}-{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')}-{uuid.uuid4().hex[:6]}"
    tracer = Tracer(settings, run_id, ticker, root=runs_root)
    if client is None and settings.llm_enabled:
        client = OpenRouterClient(settings)

    with tracer.span("evidence", input={"ticker": ticker}) as sp:
        bundle = (evidence_fn or gather)(ticker, settings, tracer)
        sp.set_output({"sources": len(bundle.sources), "notes": bundle.notes})

    with tracer.span("quant", input=bundle.quant_inputs.model_dump(mode="json")) as sp:
        quant = compute_quant(bundle.quant_inputs)  # no LLM here, ever
        sp.set_output({"quant_score": quant.quant_score, "band": quant.quant_band, "version": quant.quant_version})

    with tracer.span("bull_memo", input={"model": settings.model_bull}) as sp:
        bull = write_memo("bull", bundle, quant, client=client, model=settings.model_bull, thesis=thesis, horizon=horizon, tracer=tracer)
        sp.set_output({"claims": len(bull.claims), "stub": bull.is_stub})

    with tracer.span("bear_memo", input={"model": settings.model_bear}) as sp:
        bear = write_memo("bear", bundle, quant, client=client, model=settings.model_bear, thesis=thesis, horizon=horizon, tracer=tracer)
        sp.set_output({"claims": len(bear.claims), "stub": bear.is_stub})

    with tracer.span("synthesis", input={"model": settings.model_synthesis}) as sp:
        brief = synthesise(bundle, quant, bull, bear, client=client, model=settings.model_synthesis, thesis=thesis, horizon=horizon, tracer=tracer)
        sp.set_output(brief.disagreement.model_dump())

    with tracer.span("critic") as sp:
        report = critique(bundle.sources, quant, bull, bear, brief)
        sp.set_output(report.model_dump())

    result = RunResult(
        run_id=run_id,
        ticker=ticker,
        thesis=thesis,
        horizon=horizon,
        created_at=datetime.now(timezone.utc),
        sources=bundle.sources,
        quant=quant,
        bull=bull,
        bear=bear,
        brief=brief,
        critic=report,
        models={"bull": bull.model or "stub", "bear": bear.model or "stub", "synthesis": brief.model or "stub", "quant": f"code:{quant.quant_version}"},
    )
    (tracer.dir / "result.json").write_text(json.dumps(result.model_dump(mode="json"), indent=2))
    if store is not None:
        store.save_run(result)
    tracer.flush()
    return result
