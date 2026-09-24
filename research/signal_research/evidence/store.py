"""SQLite evidence store: runs, sources, claims and quant results, all as JSON rows.

Enough to answer "does every cited source_id exist?" and to reload a run.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from ..schemas import RunResult

DDL = """
CREATE TABLE IF NOT EXISTS runs (run_id TEXT PRIMARY KEY, ticker TEXT, created_at TEXT, payload TEXT);
CREATE TABLE IF NOT EXISTS sources (run_id TEXT, source_id TEXT, kind TEXT, url TEXT, payload TEXT, PRIMARY KEY (run_id, source_id));
CREATE TABLE IF NOT EXISTS claims (run_id TEXT, claim_id TEXT, stage TEXT, stance TEXT, support TEXT, confidence REAL, source_ids TEXT, text TEXT, PRIMARY KEY (run_id, claim_id));
CREATE TABLE IF NOT EXISTS quant (run_id TEXT PRIMARY KEY, ticker TEXT, quant_score INTEGER, quant_band TEXT, quant_version TEXT, computed_at TEXT, quant_inputs TEXT);
"""


class EvidenceStore:
    def __init__(self, path: str | Path = "signal_research.sqlite"):
        self.path = Path(path)
        self._db = sqlite3.connect(self.path)
        self._db.executescript(DDL)

    def save_run(self, r: RunResult) -> None:
        db = self._db
        db.execute("INSERT OR REPLACE INTO runs VALUES (?,?,?,?)", (r.run_id, r.ticker, r.created_at.isoformat(), r.model_dump_json()))
        for s in r.sources:
            db.execute("INSERT OR REPLACE INTO sources VALUES (?,?,?,?,?)", (r.run_id, s.source_id, s.kind, s.url, s.model_dump_json()))
        for stage, claims in (("bull", r.bull.claims), ("bear", r.bear.claims), ("synthesis", r.brief.claims)):
            for c in claims:
                db.execute("INSERT OR REPLACE INTO claims VALUES (?,?,?,?,?,?,?,?)", (r.run_id, c.claim_id, stage, c.stance, c.support, c.confidence, json.dumps(c.source_ids), c.text))
        q = r.quant
        db.execute("INSERT OR REPLACE INTO quant VALUES (?,?,?,?,?,?,?)", (r.run_id, q.ticker, q.quant_score, q.quant_band, q.quant_version, q.computed_at.isoformat(), q.quant_inputs.model_dump_json()))
        db.commit()

    def source_ids(self, run_id: str) -> set[str]:
        return {row[0] for row in self._db.execute("SELECT source_id FROM sources WHERE run_id=?", (run_id,))}

    def latest_run(self, ticker: str, *, max_age_hours: float | None = None) -> RunResult | None:
        row = self._db.execute("SELECT payload, created_at FROM runs WHERE ticker=? ORDER BY created_at DESC LIMIT 1", (ticker.upper(),)).fetchone()
        if not row:
            return None
        r = RunResult.model_validate_json(row[0])
        if max_age_hours is not None:
            from datetime import datetime, timezone

            age_h = (datetime.now(timezone.utc) - r.created_at).total_seconds() / 3600
            if age_h > max_age_hours:
                return None
        return r

    def load_run(self, run_id: str) -> RunResult | None:
        row = self._db.execute("SELECT payload FROM runs WHERE run_id=?", (run_id,)).fetchone()
        return RunResult.model_validate_json(row[0]) if row else None

    def close(self) -> None:
        self._db.close()
