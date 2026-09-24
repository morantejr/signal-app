"""Small HTTP surface for the web app. Runs are cached per ticker for a day.

    make api   →  GET /research/ZETA?thesis=...&horizon=3m&refresh=0
                  GET /runs      GET /runs/{run_id}     GET /health
"""

from __future__ import annotations

import os
import threading

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .config import load_settings
from .evidence.store import EvidenceStore
from .llm.openrouter import LLMError
from .pipeline import run
from .schemas import RunResult

app = FastAPI(title="SIGNAL research", version="0.1.0")
app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in os.environ.get("CORS_ORIGINS", "http://localhost:5173,https://morantejr.github.io").split(",")], allow_methods=["GET"], allow_headers=["*"])
_lock = threading.Lock()
_DB = os.environ.get("SIGNAL_DB", "signal_research.sqlite")


@app.get("/health")
def health() -> dict:
    s = load_settings()
    return {"ok": True, "llm": s.llm_enabled, "model": s.openrouter_model, "langfuse": s.langfuse_enabled}


@app.get("/research/{ticker}", response_model=RunResult)
def research(ticker: str, thesis: str | None = None, horizon: str = "3m", refresh: bool = Query(False), max_age_hours: float = 24.0) -> RunResult:
    ticker = ticker.upper().strip()
    store = EvidenceStore(_DB)
    try:
        if not refresh:
            cached = store.latest_run(ticker, max_age_hours=max_age_hours)
            if cached is not None and (thesis is None or cached.thesis == thesis):
                return cached
        with _lock:  # one pipeline at a time keeps free-tier rate limits sane
            try:
                return run(ticker, settings=load_settings(), thesis=thesis, horizon=horizon, store=store)
            except LLMError as exc:
                raise HTTPException(status_code=503, detail=str(exc)) from exc
    finally:
        store.close()


@app.get("/runs")
def runs(limit: int = 50) -> list[dict]:
    store = EvidenceStore(_DB)
    try:
        rows = store._db.execute("SELECT run_id, ticker, created_at FROM runs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall()
        return [{"run_id": r[0], "ticker": r[1], "created_at": r[2]} for r in rows]
    finally:
        store.close()


@app.get("/runs/{run_id}", response_model=RunResult)
def run_by_id(run_id: str) -> RunResult:
    store = EvidenceStore(_DB)
    try:
        r = store.load_run(run_id)
        if r is None:
            raise HTTPException(status_code=404, detail="no such run")
        return r
    finally:
        store.close()
