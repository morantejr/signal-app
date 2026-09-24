# SIGNAL research system

*Early, in development. Design choices matter more than polish. Agents may be stubbed; the quant score, the schemas and the traces are real.*

A research backend that helps you follow an investment thesis without reading everything yourself. It combines free financial data, a **standalone quantitative score computed in code**, outside evidence with citations, and LLM reasoning **through OpenRouter only**. The quant number is never argued into by a model. When the quant score and the narrative disagree, the disagreement is a first-class object in the output, not something averaged away.

The consumer web app in the parent folder is the interface prototype. This package is the research engine behind it.

## 1. Design summary

```
ticker, thesis, horizon
        │
        ▼
 EvidenceAgent (code)      yfinance prices + key stats, SEC EDGAR filings index + XBRL facts, FRED (optional)
        │                  → EvidenceBundle: Source[] (each with source_id, url/accession, retrieved_at) + QuantInputs
        ▼
 QuantAgent (code only)    compute_quant(QuantInputs) → quant_score, band, components, quant_version, computed_at
        │                  never calls OpenRouter; the LLM layer cannot import it
        ├──────────────► BullAgent  (OpenRouter)  memo: claims[] with source_ids, steelman of the bear
        ├──────────────► BearAgent  (OpenRouter)  memo: claims[] with source_ids, steelman of the bull
        ▼
 SynthesisAgent (OpenRouter) one view + narrative_lean + kill criteria
        │                    Disagreement object is built in CODE from quant_band vs narrative_lean
        ▼
 Critic (code)              claim → source backing, dangling ids, sourced share of confident claims
        ▼
 persist: runs/<id>/result.json + trace.jsonl, SQLite evidence store, Langfuse (if configured)
```

OpenRouter placement: exactly one module, `signal_research/llm/openrouter.py`, holds the key, base URL, attribution headers, retries, backoff, and JSON repair. Agents call `chat_json` and get a validated pydantic object. The output schemas for memos and synthesis have no score field; anything extra a model emits is dropped on validation, and an eval feeds hostile output that tries to set `quant_score` to prove it changes nothing.

Disagreement handling: `build_disagreement` maps the quant band (attractive / fair / expensive / unknown) against the narrative lean (bullish / bearish / neutral / mixed). Aligned pairs give `agree=true`; anything else, including an unknown quant, gives `agree=false` with a summary and two lists, "quant may be wrong because" and "narrative may be wrong because", supplied by the synthesis model or by code defaults from the freshness flags.

## 2. Quant v0.1

`compute_quant` is a pure function of `QuantInputs`. Score in −100…+100; band attractive ≥ +20, expensive ≤ −20, fair between, unknown when fewer than two components have data. Components are each in [−1, +1]:

| component | weight | inputs | rule |
|---|---|---|---|
| valuation | 0.35 | trailing P/E, or P/S when unprofitable; P/S vs own multi-year median | P/E > 60 → −1 … ≤ 10 → +0.6, band 18–28 ≈ 0; P/S 1.5× own median → −0.6, < 0.7× → +0.5; parts averaged |
| momentum | 0.25 | 6-month return; 12-month minus 1-month return | ret_6m / 30 and (ret_12m − ret_1m) / 40, clamped, averaged |
| risk | 0.20 | 1-year max drawdown; 60-day realised vol (annualised) | +0.3 below 15% drawdown / 25% vol, sliding to −1 at 50% / 70% |
| balance_sheet | 0.20 | debt/equity, current ratio, FCF sign | D/E < 50 → +0.5 … ≥ 200 → −0.7; CR ≥ 1.5 → +0.3, < 1 → −0.5; FCF > 0 → +0.3 else −0.4 |
| macro | 0.10 | 3-month change in the 10-year yield (FRED DGS10) | −change, clamped ±0.5; only if FRED data is present |

Missing data: a component with no inputs is excluded from the weight sum (not scored as zero) and flagged `missing:<name>`; macro is optional and never flagged. Price data older than 5 days is flagged `stale:`. Every component records `inputs_used` and a human-readable `note`, and `drivers` lists them by contribution. `quant_version = "v0.1"`; bump it whenever a rule or weight changes.

Known limits: fixed reference bands instead of sector peers; the own-history P/S uses the current share count for past years (flagged in the source title); no earnings-quality or accrual checks.

## 3. Repo skeleton

```
research/
  pyproject.toml, Makefile, .env.example
  signal_research/
    config.py            env → Settings (OpenRouter, per-agent models, Langfuse, FRED, EDGAR UA)
    schemas.py           Source, Claim, QuantInputs/Result, Memo, Disagreement, Brief, RunResult
    tracing.py           Langfuse spans/generations when configured; always runs/<id>/trace.jsonl
    llm/openrouter.py    the only LLM path: chat, chat_json, retries, JSON repair
    data/yfinance_source.py  prices, stats, own-history P/S → QuantInputs + Sources
    data/edgar.py        ticker → CIK, recent 10-K/10-Q/8-K with accession + URL, XBRL facts
    data/fred.py         DGS10 3-month change
    quant/score.py       v0.1 formula
    evidence/store.py    SQLite: runs, sources, claims, quant
    agents/evidence.py   EvidenceAgent (code)
    agents/prompts.py    rules + schemas rendered into prompts; quant shown read-only
    agents/memo.py       Bull/Bear agents, claim labelling (sourced / inference / unsupported)
    agents/synthesis.py  SynthesisAgent + code-side disagreement; refuses without both memos
    agents/critic.py     deterministic citation checks
    pipeline.py          run(): evidence → quant → bull → bear → synthesis → critic → persist
    run.py               CLI
  tests/                 mocked OpenRouter transport, quant, pipeline
  evals/cases.json       13 eval cases; tests/test_evals.py binds each id to a check
  docs-how-to-judge.md
```

## 4. Local run

```bash
cd research
cp .env.example .env            # add OPENROUTER_API_KEY; everything else is optional
make setup                      # uv sync
make test                       # 29 tests, no network
make run TICKER=ZETA THESIS="AI advertising demand keeps growing"
make run TICKER=AAPL NO_LLM=1   # data + quant + stub memos, no key needed
```

Langfuse, self-hosted and free:

```bash
make langfuse                   # downloads the official docker-compose.yml and starts it on :3000
# create a project in the UI, then put LANGFUSE_PUBLIC_KEY / LANGFUSE_SECRET_KEY in .env
```

Without Langfuse keys the same spans and generations are written to `runs/<run_id>/trace.jsonl`, including model id, provider, token usage and latency for every OpenRouter call.

Model: `OPENROUTER_MODEL` defaults to `google/gemma-4-31b-it:free`, taken from OpenRouter's free list on 2026-09-23 (262k context, JSON mode). Other free ids seen that day: `nvidia/nemotron-3-super-120b-a12b:free`, `qwen/qwen3.8-27b:free`, `nex-agi/nex-n2.5-pro:free`. Free models share an upstream pool and are often rate-limited or return empty completions. The client retries with backoff, then walks `OPENROUTER_FALLBACK_MODELS` in order (each fallback is logged as a `model_fallback` trace event and the generation records both the requested and the tried model id), and only then fails with a message that says so.

## 5. Stub vs real

| piece | status | notes |
|---|---|---|
| yfinance prices, stats, annual revenue | real | unofficial API; can be flaky, errors are noted in `bundle.notes` |
| SEC EDGAR filings index + XBRL facts | real | needs `EDGAR_USER_AGENT`; filing *text* is not yet pulled into evidence |
| FRED macro overlay | real, optional | skipped without `FRED_API_KEY` |
| Quant v0.1 | real | pure code, versioned, persisted with inputs |
| OpenRouter client | real | mocked transport in tests; retries, JSON repair, attribution headers |
| Bull / Bear / Synthesis agents | real when `OPENROUTER_API_KEY` is set, otherwise labelled stubs built from quant components | prompts enforce citations, no price targets, steelmanning |
| Disagreement object | real | computed in code every run |
| Critic | real, code-only | LLM critic pass not built |
| Langfuse tracing | real when configured; local JSONL always | Langfuse calls guarded so they can never break a run |
| Evals | real | 13 cases, `make eval` |
| Evidence retrieval from filing text / user PDFs / URLs | not built | Phase 2 |
| LangGraph orchestration | not built | pipeline is a plain, ordered Python function; LangGraph adds value only when steps need branching or retries as a graph |
| UI for this backend | not built | the React prototype in the parent folder still runs on its own client-side engine; wiring it to `RunResult` is the next interface step |

## 6. What shipped in Phase 1, and next decisions

Shipped: data sources, quant v0.1, OpenRouter client with mocked tests, the full ordered pipeline with stub fallbacks, code-side disagreement, critic, SQLite store, local tracing with Langfuse hooks, 13 evals. `make test` proves the LLM path cannot mutate the score.

Decide next: (a) demo tickers for the eval fixtures beyond ZETA / AAPL; (b) score lean (v0.1 is balanced across value, momentum, risk, balance sheet; a momentum-tilted variant is a weight change and a version bump); (c) horizon default (3m); (d) whether to serve `RunResult` to the React app through a small FastAPI endpoint or a static JSON export.
