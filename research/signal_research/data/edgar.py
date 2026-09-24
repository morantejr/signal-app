"""SEC EDGAR: filings index and XBRL company facts. Free, needs a User-Agent."""

from __future__ import annotations

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
