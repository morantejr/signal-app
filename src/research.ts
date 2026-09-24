// The pipeline behind a question: work out which company it is about, read
// the live data from Finnhub in stages (so the thinking screen is honest about
// what is happening), then hand everything to the analysis engine.

import * as fh from './api/finnhub'
import { ApiError } from './api/finnhub'
import { candidates } from './parse'
import { analyse, type Analysis } from './analysis'

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms))
const MIN_STEP_MS = 450

const isPlain = (symbol: string) => !symbol.includes('.') && !symbol.includes(':')

async function resolveSymbol(q: string): Promise<{ sym: string; profile: fh.Profile }> {
  const { tickers, names } = candidates(q)
  for (const t of tickers) {
    const p = await fh.optional(fh.profile(t))
    if (p && p.name) return { sym: t, profile: p }
  }
  for (const n of names) {
    const hits = await fh.optional(fh.search(n))
    const hit = hits?.result.find(r => r.type === 'Common Stock' && isPlain(r.symbol)) ?? hits?.result.find(r => isPlain(r.symbol))
    if (hit) {
      const p = await fh.optional(fh.profile(hit.symbol))
      if (p && p.name) return { sym: hit.symbol, profile: p }
    }
  }
  throw new ApiError('notfound', 'SIGNAL could not tell which company that question is about. Try naming it, or use the ticker, like NVDA or AAPL.')
}

export async function research(q: string, onStep: (step: number) => void): Promise<Analysis> {
  const t0 = performance.now()
  onStep(0)
  const [{ sym, profile }] = await Promise.all([resolveSymbol(q), sleep(MIN_STEP_MS)])
  const [quote, metrics, earnings] = await Promise.all([fh.quote(sym), fh.optional(fh.metrics(sym)), fh.optional(fh.earnings(sym))])
  if (!quote || !quote.c) throw new ApiError('notfound', `No live price is available for ${sym}. SIGNAL covers US-listed stocks.`)
  onStep(1)
  const [recs] = await Promise.all([fh.optional(fh.recommendations(sym)), sleep(MIN_STEP_MS)])
  onStep(2)
  const [news] = await Promise.all([fh.optional(fh.news(sym)), sleep(MIN_STEP_MS)])
  onStep(3)
  await sleep(MIN_STEP_MS)
  return analyse({ sym, question: q, quote, profile, metrics, earnings, recs, news, elapsedMs: performance.now() - t0 })
}

/** Lighter pass for watchlist and portfolio rows: no news. */
export async function snapshot(sym: string): Promise<Analysis> {
  const t0 = performance.now()
  const [quote, profile, metrics, recs, earnings] = await Promise.all([
    fh.quote(sym),
    fh.optional(fh.profile(sym)),
    fh.optional(fh.metrics(sym)),
    fh.optional(fh.recommendations(sym)),
    fh.optional(fh.earnings(sym)),
  ])
  if (!quote || !quote.c) throw new ApiError('notfound', `No live price for ${sym}.`)
  return analyse({ sym, question: '', quote, profile: profile && profile.name ? profile : fh.emptyProfile(sym), metrics, earnings, recs, news: null, elapsedMs: performance.now() - t0 })
}
