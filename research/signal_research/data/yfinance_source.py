"""Prices and fundamentals from Yahoo Finance via yfinance (free, unofficial).

Everything returned is numeric and tagged with a Source so the quant inputs are
reproducible from `quant_inputs.source_ids`.
"""

from __future__ import annotations

import math
from datetime import datetime, timezone

import pandas as pd

from ..schemas import QuantInputs, Source


def _f(x: object) -> float | None:
    try:
        v = float(x)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return None
    return None if math.isnan(v) or math.isinf(v) else v


def _pct(a: float | None, b: float | None) -> float | None:
    if a is None or b is None or b == 0:
        return None
    return (a / b - 1.0) * 100.0


def fetch_quant_inputs(ticker: str) -> tuple[QuantInputs, list[Source], dict]:
    import yfinance as yf

    t = yf.Ticker(ticker)
    now = datetime.now(timezone.utc)
    sources: list[Source] = []

    hist = t.history(period="1y", auto_adjust=True)
    price = high = low = r1 = r3 = r6 = r12 = vol = dd = age = None
    if hist is not None and len(hist) > 20:
        close = hist["Close"].dropna()
        price = _f(close.iloc[-1])
        high, low = _f(close.max()), _f(close.min())

        def back(days: int) -> float | None:
            return _f(close.iloc[-days - 1]) if len(close) > days else None

        r1, r3, r6, r12 = _pct(price, back(21)), _pct(price, back(63)), _pct(price, back(126)), _pct(price, close.iloc[0])
        rets = close.pct_change().dropna()
        if len(rets) >= 60:
            vol = _f(rets.iloc[-60:].std() * math.sqrt(252) * 100)
        peak = close.cummax()
        dd = _f(((close / peak) - 1.0).min() * 100)
        last = close.index[-1].to_pydatetime()
        if last.tzinfo is None:
            last = last.replace(tzinfo=timezone.utc)
        age = (now - last).total_seconds() / 86400
        sources.append(Source(source_id=f"yf:hist:{ticker}", kind="price", title=f"Yahoo Finance daily prices, 1y ({ticker})", url=f"https://finance.yahoo.com/quote/{ticker}/history", retrieved_at=now, data={"rows": int(len(close)), "last": last.isoformat()}))

    info: dict = {}
    try:
        info = t.info or {}
    except Exception:  # noqa: BLE001  yfinance raises on some tickers
        info = {}
    if info:
        sources.append(Source(source_id=f"yf:info:{ticker}", kind="fundamental", title=f"Yahoo Finance key statistics ({ticker})", url=f"https://finance.yahoo.com/quote/{ticker}/key-statistics", retrieved_at=now, data={k: info.get(k) for k in ("longName", "sector", "industry", "marketCap", "trailingPE", "forwardPE", "priceToSalesTrailing12Months", "enterpriseToEbitda", "debtToEquity", "currentRatio", "freeCashflow", "revenueGrowth", "profitMargins")}))

    ps_hist = None
    try:
        fin = getattr(t, "income_stmt", None)  # annual, columns = fiscal year ends
        if fin is None or getattr(fin, "empty", True):
            fin = t.financials
        shares = _f(info.get("sharesOutstanding"))
        if fin is not None and "Total Revenue" in fin.index and shares and hist is not None and len(hist) > 0:
            full = t.history(period="5y", auto_adjust=True)["Close"].dropna()
            ratios = []
            for col in fin.columns:
                rev = _f(fin.loc["Total Revenue", col])
                if not rev or rev <= 0:
                    continue
                ts = pd.Timestamp(col)
                if ts.tzinfo is None and full.index.tz is not None:
                    ts = ts.tz_localize(full.index.tz)
                idx = full.index.searchsorted(ts)
                if idx >= len(full):
                    idx = len(full) - 1
                px = _f(full.iloc[idx])
                if px:
                    ratios.append(px * shares / rev)
            if len(ratios) >= 2:
                ratios.sort()
                ps_hist = ratios[len(ratios) // 2]
                sources.append(Source(source_id=f"yf:financials:{ticker}", kind="fundamental", title=f"Yahoo Finance annual income statement ({ticker}), P/S history approximated with current share count", url=f"https://finance.yahoo.com/quote/{ticker}/financials", retrieved_at=now, data={"ps_history": [round(r, 2) for r in ratios]}))
    except Exception:  # noqa: BLE001
        ps_hist = None

    q = QuantInputs(
        ticker=ticker,
        as_of=now,
        price=price,
        high_52w=high,
        low_52w=low,
        ret_1m=r1,
        ret_3m=r3,
        ret_6m=r6,
        ret_12m=r12,
        vol_60d_ann=vol,
        max_drawdown_1y=dd,
        trailing_pe=_f(info.get("trailingPE")),
        forward_pe=_f(info.get("forwardPE")),
        price_to_sales=_f(info.get("priceToSalesTrailing12Months")),
        ps_hist_median=ps_hist,
        ev_to_ebitda=_f(info.get("enterpriseToEbitda")),
        debt_to_equity=_f(info.get("debtToEquity")),
        current_ratio=_f(info.get("currentRatio")),
        free_cash_flow=_f(info.get("freeCashflow")),
        revenue_growth=(_f(info.get("revenueGrowth")) or 0) * 100 if info.get("revenueGrowth") is not None else None,
        profit_margin=(_f(info.get("profitMargins")) or 0) * 100 if info.get("profitMargins") is not None else None,
        data_age_days=age,
        source_ids=[s.source_id for s in sources],
    )
    company = {"name": info.get("longName") or ticker, "sector": info.get("sector"), "industry": info.get("industry"), "market_cap": info.get("marketCap"), "summary": (info.get("longBusinessSummary") or "")[:600]}
    return q, sources, company
