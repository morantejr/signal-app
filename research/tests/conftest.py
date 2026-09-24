from __future__ import annotations

import json
from pathlib import Path

import httpx
import pytest

from signal_research.config import load_settings
from signal_research.llm.openrouter import OpenRouterClient
from signal_research.schemas import EvidenceBundle, QuantInputs, Source

FIXTURES = Path(__file__).parent / "fixtures"


def load_inputs(name: str) -> QuantInputs:
    return QuantInputs.model_validate(json.loads((FIXTURES / "quant_inputs.json").read_text())[name])


def bundle_for(name: str) -> EvidenceBundle:
    qi = load_inputs(name)
    sources = [Source(source_id=sid, kind="price" if "hist" in sid else "fundamental", title=sid, url="https://finance.yahoo.com/") for sid in qi.source_ids]
    sources.append(Source(source_id="edgar:0001-25-000001", kind="filing", title="10-Q filed 2026-08-07", url="https://www.sec.gov/", accession="0001-25-000001"))
    return EvidenceBundle(ticker=qi.ticker, company={"name": qi.ticker}, sources=sources, quant_inputs=qi)


def completion(content: str, *, model: str = "google/gemma-4-31b-it:free") -> dict:
    return {"id": "gen-1", "object": "chat.completion", "created": 0, "model": model, "provider": "TestProvider", "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}], "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30}}


def fake_client(responses: list[httpx.Response | dict], *, env: dict | None = None, record: list | None = None) -> OpenRouterClient:
    """OpenRouter client with a scripted transport. Each entry is consumed in order."""
    queue = list(responses)

    def handler(request: httpx.Request) -> httpx.Response:
        if record is not None:
            record.append(request)
        if not queue:
            raise AssertionError("fake OpenRouter got more requests than scripted")
        nxt = queue.pop(0)
        return nxt if isinstance(nxt, httpx.Response) else httpx.Response(200, json=nxt)

    settings = load_settings({"OPENROUTER_API_KEY": "test-key", **(env or {})})
    return OpenRouterClient(settings, http_client=httpx.Client(transport=httpx.MockTransport(handler)), sleep=lambda _s: None)


def memo_json(side: str, *, extra: dict | None = None, source_ids: list[str] | None = None) -> str:
    sids = source_ids if source_ids is not None else ["yf:info:ZETA", "edgar:0001-25-000001"]
    body = {
        "summary": f"{side} summary",
        "claims": [
            {"text": f"{side} claim one", "stance": side, "source_ids": sids, "confidence": 0.8},
            {"text": f"{side} claim two (inference)", "stance": side, "source_ids": [], "confidence": 0.5, "is_inference": True},
        ],
        "steelman_of_other_side": "the other side has a point",
        "missing_data": ["peer multiples"],
    }
    body.update(extra or {})
    return json.dumps(body)


def synthesis_json(lean: str = "bullish", *, extra: dict | None = None) -> str:
    body = {
        "one_view": "one view",
        "narrative_lean": lean,
        "kill_criteria": ["revenue growth below 10%"],
        "claims": [{"text": "syn claim", "stance": "context", "source_ids": ["yf:info:ZETA"], "confidence": 0.9}],
        "quant_may_be_wrong_because": ["no peer comparison"],
        "narrative_may_be_wrong_because": ["small model"],
    }
    body.update(extra or {})
    return json.dumps(body)


@pytest.fixture
def no_llm_settings():
    return load_settings({})


@pytest.fixture
def runs_root(tmp_path: Path) -> Path:
    return tmp_path / "runs"
