"""Tracing. Langfuse when configured; always a local JSONL trace under runs/<run_id>/.

Tracing must never break a run, so every Langfuse call is guarded.
"""

from __future__ import annotations

import json
import time
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterator

from .config import Settings


def _jsonable(x: Any) -> Any:
    try:
        json.dumps(x)
        return x
    except TypeError:
        return json.loads(json.dumps(x, default=str))


@dataclass
class SpanHandle:
    name: str
    started: float
    _tracer: "Tracer"
    _lf_span: Any = None
    output: Any = None

    def set_output(self, output: Any) -> None:
        self.output = output


class Tracer:
    def __init__(self, settings: Settings, run_id: str, ticker: str, root: Path | None = None):
        self.run_id = run_id
        self.ticker = ticker
        self.dir = (root or Path(settings.runs_dir)) / run_id
        self.dir.mkdir(parents=True, exist_ok=True)
        self._log = (self.dir / "trace.jsonl").open("a", encoding="utf-8")
        self._lf = None
        self._lf_trace = None
        if settings.langfuse_enabled:
            try:  # pragma: no cover - needs a Langfuse server
                from langfuse import Langfuse

                self._lf = Langfuse(host=settings.langfuse_host, public_key=settings.langfuse_public_key, secret_key=settings.langfuse_secret_key)
                self._lf_trace = self._lf.start_span(name=f"research:{ticker}", input={"run_id": run_id, "ticker": ticker})
            except Exception as exc:  # noqa: BLE001
                self._lf = None
                self.event("langfuse_unavailable", {"error": str(exc)})

    def event(self, kind: str, payload: dict[str, Any]) -> None:
        rec = {"t": time.time(), "run_id": self.run_id, "kind": kind, **_jsonable(payload)}
        self._log.write(json.dumps(rec) + "\n")
        self._log.flush()

    @contextmanager
    def span(self, name: str, input: Any = None) -> Iterator[SpanHandle]:
        h = SpanHandle(name=name, started=time.time(), _tracer=self)
        if self._lf_trace is not None:
            try:  # pragma: no cover
                h._lf_span = self._lf_trace.start_span(name=name, input=_jsonable(input))
            except Exception:  # noqa: BLE001
                h._lf_span = None
        self.event("span_start", {"name": name, "input": _jsonable(input)})
        try:
            yield h
        finally:
            ms = round((time.time() - h.started) * 1000)
            self.event("span_end", {"name": name, "latency_ms": ms, "output": _jsonable(h.output)})
            if h._lf_span is not None:
                try:  # pragma: no cover
                    h._lf_span.update(output=_jsonable(h.output))
                    h._lf_span.end()
                except Exception:  # noqa: BLE001
                    pass

    def generation(self, *, name: str, model: str, provider: str | None, input: Any, output: Any, usage: dict[str, int | None], latency_ms: int, metadata: dict | None = None) -> None:
        self.event("generation", {"name": name, "model": model, "provider": provider, "input": _jsonable(input), "output": _jsonable(output), "usage": usage, "latency_ms": latency_ms, "metadata": metadata or {}})
        if self._lf_trace is not None:
            try:  # pragma: no cover
                g = self._lf_trace.start_generation(name=name, model=model, input=_jsonable(input), metadata={"provider": provider, **(metadata or {})})
                g.update(output=_jsonable(output), usage_details={k: v for k, v in usage.items() if v is not None})
                g.end()
            except Exception:  # noqa: BLE001
                pass

    def flush(self) -> None:
        self._log.flush()
        if self._lf is not None:
            try:  # pragma: no cover
                if self._lf_trace is not None:
                    self._lf_trace.end()
                self._lf.flush()
            except Exception:  # noqa: BLE001
                pass
