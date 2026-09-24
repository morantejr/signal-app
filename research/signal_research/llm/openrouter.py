"""The only place that talks to an LLM. OpenAI-compatible client pointed at OpenRouter.

- Central key, base URL, default free model, attribution headers, retries.
- `chat_json` parses/repairs JSON so small free models stay usable.
- Never imports the quant engine; the quant score is not reachable from here.
"""

from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any, Callable, TypeVar

import httpx
from openai import APIConnectionError, APIStatusError, BadRequestError, OpenAI, RateLimitError
from pydantic import BaseModel, ValidationError

from ..config import Settings
from ..tracing import Tracer

T = TypeVar("T", bound=BaseModel)


class LLMError(RuntimeError):
    pass


@dataclass
class ChatResult:
    content: str
    model: str
    provider: str | None
    prompt_tokens: int | None
    completion_tokens: int | None
    latency_ms: int
    finish_reason: str | None


def repair_json(text: str) -> Any:
    """Best-effort extraction of a JSON object from model text."""
    t = text.strip()
    t = re.sub(r"^```(?:json)?\s*", "", t)
    t = re.sub(r"\s*```$", "", t)
    start, end = t.find("{"), t.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError("no JSON object found")
    t = t[start : end + 1]
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        t2 = re.sub(r",\s*([}\]])", r"\1", t)  # trailing commas
        return json.loads(t2)


class OpenRouterClient:
    def __init__(self, settings: Settings, *, http_client: httpx.Client | None = None, sleep: Callable[[float], None] = time.sleep):
        if not settings.openrouter_api_key:
            raise LLMError("OPENROUTER_API_KEY is not set")
        self.settings = settings
        self._sleep = sleep
        self._client = OpenAI(
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            default_headers={"HTTP-Referer": settings.app_referer, "X-Title": settings.app_title},
            http_client=http_client,
            max_retries=0,
        )

    def chat(
        self,
        messages: list[dict[str, str]],
        *,
        model: str | None = None,
        temperature: float = 0.2,
        response_format: dict | None = None,
        max_tokens: int | None = None,
        retries: int = 2,
        tracer: Tracer | None = None,
        name: str = "chat",
    ) -> ChatResult:
        """Try the requested model, then each fallback in order. Free models are
        frequently rate-limited upstream, so a single id is not a reliable path."""
        requested = model or self.settings.openrouter_model
        chain = [requested] + [m for m in self.settings.fallback_models if m != requested]
        errors: list[str] = []
        for candidate in chain:
            try:
                return self._chat_one(messages, model=candidate, temperature=temperature, response_format=response_format, max_tokens=max_tokens, retries=retries, tracer=tracer, name=name, requested=requested)
            except LLMError as exc:
                errors.append(f"{candidate}: {exc}")
                if tracer:
                    tracer.event("model_fallback", {"from": candidate, "error": str(exc)[:300]})
        raise LLMError("No model in the chain gave a usable completion. " + " | ".join(errors) + " — free models are rate-limited; wait a minute, set OPENROUTER_MODEL / OPENROUTER_FALLBACK_MODELS to other ids, or add a provider key at openrouter.ai/settings/integrations.")

    def _chat_one(self, messages: list[dict[str, str]], *, model: str, temperature: float, response_format: dict | None, max_tokens: int | None, retries: int, tracer: Tracer | None, name: str, requested: str) -> ChatResult:
        last_error: str = ""
        use_format = response_format
        for attempt in range(retries + 1):
            t0 = time.time()
            try:
                kwargs: dict[str, Any] = {"model": model, "messages": messages, "temperature": temperature}
                if use_format:
                    kwargs["response_format"] = use_format
                if max_tokens:
                    kwargs["max_tokens"] = max_tokens
                resp = self._client.chat.completions.create(**kwargs)
            except BadRequestError as exc:
                if use_format and "response_format" in str(exc).lower():
                    use_format = None  # model does not support JSON mode; fall back to prompt-only JSON
                    continue
                raise LLMError(f"OpenRouter rejected the request: {exc}") from exc
            except (RateLimitError, APIConnectionError) as exc:
                last_error = f"{type(exc).__name__}: {str(exc)[:200]}"
                self._backoff(attempt)
                continue
            except APIStatusError as exc:
                if exc.status_code >= 500:
                    last_error = f"upstream {exc.status_code}"
                    self._backoff(attempt)
                    continue
                raise LLMError(f"OpenRouter error {exc.status_code}: {exc}") from exc
            latency_ms = round((time.time() - t0) * 1000)
            choice = resp.choices[0] if resp.choices else None
            content = (choice.message.content or "") if choice else ""
            if not content.strip():
                last_error = "empty completion (common on free models under load)"
                self._backoff(attempt)
                continue
            usage = resp.usage
            result = ChatResult(
                content=content,
                model=resp.model or model,
                provider=(resp.model_extra or {}).get("provider") if hasattr(resp, "model_extra") else None,
                prompt_tokens=usage.prompt_tokens if usage else None,
                completion_tokens=usage.completion_tokens if usage else None,
                latency_ms=latency_ms,
                finish_reason=choice.finish_reason if choice else None,
            )
            if tracer:
                tracer.generation(name=name, model=result.model, provider=result.provider, input=messages, output=content, usage={"input": result.prompt_tokens, "output": result.completion_tokens}, latency_ms=latency_ms, metadata={"requested_model": requested, "tried_model": model, "attempt": attempt})
            return result
        raise LLMError(f"no usable completion after {retries + 1} attempts ({last_error})")

    def chat_json(self, messages: list[dict[str, str]], schema: type[T], *, tracer: Tracer | None = None, name: str = "chat_json", **kw: Any) -> tuple[T, ChatResult]:
        result = self.chat(messages, response_format={"type": "json_object"}, tracer=tracer, name=name, **kw)
        try:
            return schema.model_validate(repair_json(result.content)), result
        except (ValueError, ValidationError) as exc:
            fix = messages + [
                {"role": "assistant", "content": result.content},
                {"role": "user", "content": f"That was not valid for the required schema ({exc.__class__.__name__}: {str(exc)[:400]}). Return ONLY a JSON object matching this JSON schema, no prose:\n{json.dumps(schema.model_json_schema())}"},
            ]
            result2 = self.chat(fix, response_format={"type": "json_object"}, tracer=tracer, name=f"{name}:repair", **kw)
            try:
                return schema.model_validate(repair_json(result2.content)), result2
            except (ValueError, ValidationError) as exc2:
                raise LLMError(f"Model output could not be parsed into {schema.__name__}: {exc2}") from exc2

    def _backoff(self, attempt: int) -> None:
        self._sleep(min(1.5**attempt, 8.0))
