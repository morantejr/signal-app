"""FRED macro overlay (free key). Only the 3-month change in the 10-year yield for v0."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

import httpx

from ..schemas import Source


def ten_year_change_3m(api_key: str, *, client: httpx.Client | None = None) -> tuple[float | None, Source | None]:
    c = client or httpx.Client(timeout=20)
    start = (datetime.now(timezone.utc) - timedelta(days=100)).date().isoformat()
    r = c.get("https://api.stlouisfed.org/fred/series/observations", params={"series_id": "DGS10", "api_key": api_key, "file_type": "json", "observation_start": start})
    r.raise_for_status()
    obs = [o for o in r.json().get("observations", []) if o.get("value") not in (None, ".")]
    if len(obs) < 2:
        return None, None
    first, last = float(obs[0]["value"]), float(obs[-1]["value"])
    src = Source(source_id="fred:DGS10", kind="macro", title="FRED DGS10, 10-year Treasury yield", url="https://fred.stlouisfed.org/series/DGS10", retrieved_at=datetime.now(timezone.utc), data={"from": obs[0]["date"], "to": obs[-1]["date"], "first": first, "last": last})
    return last - first, src
