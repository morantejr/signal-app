"""SEC EDGAR: filings index and XBRL company facts. Free, needs a User-Agent."""

from __future__ import annotations

import html
import re
from datetime import datetime, timezone

import httpx

from ..schemas import Source

FACT_TAGS = {
    "Revenues": "revenue",
    "RevenueFromContractWithCustomerExcludingAssessedTax": "revenue",
    "NetIncomeLoss": "net_income",
    "LongTermDebtNoncurrent": "long_term_debt",
    "CashAndCashEquivalentsAtCarryingValue": "cash",
}


class EdgarClient:
    def __init__(self, user_agent: str, *, client: httpx.Client | None = None):
        self._c = client or httpx.Client(headers={"User-Agent": user_agent, "Accept-Encoding": "gzip, deflate"}, timeout=20)
        self._ticker_map: dict[str, str] | None = None

    def cik_for(self, ticker: str) -> str | None:
        if self._ticker_map is None:
            r = self._c.get("https://www.sec.gov/files/company_tickers.json")
            r.raise_for_status()
            self._ticker_map = {v["ticker"].upper(): f"{int(v['cik_str']):010d}" for v in r.json().values()}
        return self._ticker_map.get(ticker.upper())

    def recent_filings(self, ticker: str, forms: tuple[str, ...] = ("10-K", "10-Q", "8-K"), limit: int = 8) -> list[Source]:
        cik = self.cik_for(ticker)
        if not cik:
            return []
        r = self._c.get(f"https://data.sec.gov/submissions/CIK{cik}.json")
        r.raise_for_status()
        recent = r.json().get("filings", {}).get("recent", {})
        out: list[Source] = []
        now = datetime.now(timezone.utc)
        for form, acc, date, doc in zip(recent.get("form", []), recent.get("accessionNumber", []), recent.get("filingDate", []), recent.get("primaryDocument", [])):
            if form not in forms:
                continue
            acc_nodash = acc.replace("-", "")
            url = f"https://www.sec.gov/Archives/edgar/data/{int(cik)}/{acc_nodash}/{doc}"
            out.append(Source(source_id=f"edgar:{acc}", kind="filing", title=f"{form} filed {date}", url=url, accession=acc, retrieved_at=now, data={"form": form, "filed": date}))
            if len(out) >= limit:
                break
        return out

    def company_facts(self, ticker: str) -> tuple[dict, Source | None]:
        cik = self.cik_for(ticker)
        if not cik:
            return {}, None
        r = self._c.get(f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json")
        r.raise_for_status()
        gaap = r.json().get("facts", {}).get("us-gaap", {})
        facts: dict = {}
        for tag, key in FACT_TAGS.items():
            units = gaap.get(tag, {}).get("units", {}).get("USD", [])
            annual = [u for u in units if u.get("fp") == "FY" and u.get("form") == "10-K"]
            annual.sort(key=lambda u: u.get("end", ""))
            if annual and key not in facts:
                facts[key] = [{"fy": u.get("fy"), "end": u.get("end"), "value": u.get("val"), "accession": u.get("accn")} for u in annual[-4:]]
        src = Source(source_id=f"edgar:facts:{cik}", kind="facts", title=f"SEC XBRL company facts (CIK {cik})", url=f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json", retrieved_at=datetime.now(timezone.utc), data=facts)
        return facts, src


_TAG = re.compile(r"<[^>]+>")
_WS = re.compile(r"[ \t\r\f\v\xa0]+")

SECTION_PATTERNS = {
    "10-K": {
        "risk-factors": (r"item\s*1a\.?\s*[\-–—:]?\s*risk\s+factors", r"item\s*1b\b|item\s*2\.?\s*[\-–—:]?\s*properties"),
        "mdna": (r"item\s*7\.?\s*[\-–—:]?\s*management", r"item\s*7a\b|item\s*8\b"),
    },
    "10-Q": {
        "risk-factors": (r"item\s*1a\.?\s*[\-–—:]?\s*risk\s+factors", r"item\s*2\.?\s*[\-–—:]?\s*unregistered|item\s*3\b"),
        "mdna": (r"item\s*2\.?\s*[\-–—:]?\s*management", r"item\s*3\.?\s*[\-–—:]?\s*quantitative|item\s*4\b"),
    },
}


def html_to_text(raw: str) -> str:
    t = re.sub(r"(?is)<(script|style)[^>]*>.*?</\1>", " ", raw)
    t = re.sub(r"(?i)</(p|div|tr|li|h\d|br)\s*>", "\n", t)
    t = _TAG.sub(" ", t)
    t = html.unescape(t)
    t = _WS.sub(" ", t)
    return re.sub(r"\n\s*\n+", "\n", t).strip()


def extract_section(text: str, start_pat: str, end_pat: str, *, min_len: int = 1500, max_len: int = 8000) -> str | None:
    """The table of contents matches first; take the last heading that is followed by a real body."""
    starts = [m.start() for m in re.finditer(start_pat, text, re.I)]
    for st in reversed(starts):
        m = re.search(end_pat, text[st + 50 :], re.I)
        body = text[st : st + 50 + m.start()] if m else text[st : st + max_len]
        if len(body) >= min_len:
            return body[:max_len].strip()
    return None


class _EdgarText:
    def filing_text(self: "EdgarClient", url: str) -> str:  # type: ignore[misc]
        r = self._c.get(url)
        r.raise_for_status()
        return html_to_text(r.text)

    def filing_excerpts(self: "EdgarClient", filings: list[Source], *, forms: tuple[str, ...] = ("10-K", "10-Q")) -> list[Source]:  # type: ignore[misc]
        """Risk factors and MD&A from the latest 10-K and 10-Q, as citable sources with excerpts."""
        out: list[Source] = []
        seen: set[str] = set()
        for f in filings:
            form = f.data.get("form")
            if form not in forms or form in seen or not f.url:
                continue
            seen.add(form)
            try:
                text = self.filing_text(f.url)
            except Exception:  # noqa: BLE001
                continue
            for key, (start_pat, end_pat) in SECTION_PATTERNS[form].items():
                sec = extract_section(text, start_pat, end_pat)
                if sec:
                    out.append(Source(source_id=f"{f.source_id}#{key}", kind="filing", title=f"{form} filed {f.data.get('filed')} — {'Risk factors' if key == 'risk-factors' else 'MD&A'}", url=f.url, accession=f.accession, retrieved_at=datetime.now(timezone.utc), excerpt=sec, data={"form": form, "section": key, "chars": len(sec)}))
        return out


EdgarClient.filing_text = _EdgarText.filing_text  # type: ignore[attr-defined]
EdgarClient.filing_excerpts = _EdgarText.filing_excerpts  # type: ignore[attr-defined]
