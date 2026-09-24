from __future__ import annotations

import json

import httpx
import pytest
from pydantic import BaseModel

from signal_research.llm.openrouter import LLMError, repair_json
from tests.conftest import completion, fake_client


class Out(BaseModel):
    answer: str
    n: int


def test_headers_and_base_url_go_to_openrouter():
    seen: list[httpx.Request] = []
    c = fake_client([completion("hi")], record=seen)
    r = c.chat([{"role": "user", "content": "x"}])
    assert r.content == "hi" and r.provider == "TestProvider" and r.prompt_tokens == 10
    req = seen[0]
    assert str(req.url).startswith("https://openrouter.ai/api/v1/chat/completions")
    assert req.headers["Authorization"] == "Bearer test-key"
    assert req.headers["HTTP-Referer"] and req.headers["X-Title"] == "SIGNAL research"
    assert json.loads(req.content)["model"] == "google/gemma-4-31b-it:free"


def test_retries_rate_limit_then_succeeds():
    c = fake_client([httpx.Response(429, json={"error": "slow down"}), completion("ok")])
    assert c.chat([{"role": "user", "content": "x"}]).content == "ok"


def test_empty_completion_is_retried():
    c = fake_client([completion(""), completion("second")])
    assert c.chat([{"role": "user", "content": "x"}]).content == "second"


def test_gives_clear_error_after_retries():
    c = fake_client([httpx.Response(429, json={}), httpx.Response(429, json={}), httpx.Response(429, json={}), httpx.Response(429, json={})])
    with pytest.raises(LLMError, match="rate-limited"):
        c.chat([{"role": "user", "content": "x"}])


def test_repair_json_handles_fences_and_trailing_commas():
    assert repair_json('```json\n{"a": 1, "b": [1,2,],}\n```') == {"a": 1, "b": [1, 2]}
    assert repair_json('Sure! Here it is: {"a": "x"} hope that helps') == {"a": "x"}


def test_chat_json_repairs_via_second_round_trip():
    c = fake_client([completion('{"answer": "yes"}'), completion('{"answer": "yes", "n": 2}')])
    out, _ = c.chat_json([{"role": "user", "content": "x"}], Out)
    assert out == Out(answer="yes", n=2)


def test_json_mode_fallback_when_model_rejects_response_format():
    seen: list[httpx.Request] = []
    c = fake_client([httpx.Response(400, json={"error": {"message": "response_format is not supported by this model"}}), completion('{"answer": "a", "n": 1}')], record=seen)
    out, _ = c.chat_json([{"role": "user", "content": "x"}], Out)
    assert out.n == 1
    assert "response_format" in json.loads(seen[0].content) and "response_format" not in json.loads(seen[1].content)
