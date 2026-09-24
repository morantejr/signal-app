// The quantitative engine. Six checks, each scored from −1 to +1 from live
// Finnhub data, weighted into one stance. No language model is involved: the
// copy is templated from the numbers so it can never talk itself into a view.

import type { Quote, Profile, Metrics, Recommendation, EarningsQuarter, NewsItem } from './api/finnhub'
import { GREEN, RED, AMBER } from './theme'

export type Stance = 'Bearish' | 'Moderately Bearish' | 'Neutral' | 'Moderately Bullish' | 'Bullish'
export interface Point { t: string; d: string }
export type HealthStatus = 'Healthy' | 'Watching' | 'At risk'
export interface Health { name: string; now: string; danger: string; status: HealthStatus; pos: number; plain: string }
export interface Claim { claim: string; strength: string; sources: string }
export interface Stat { v: string; k: string }

export interface Analysis {
  sym: string
  name: string
  industry: string
  price: number
  chg: number
  stance: Stance
  color: string
  score: number
  confidence: number
  er: number | null
  beta: number | null
  headline: string
  bottomLine: string
  reasons: Point[]
  risks: Point[]
  deepReason: Point | null
  deepRisk: Point | null
  bull: { p: number; reasons: string[]; range: string }
  bear: { p: number; reasons: string[]; range: string }
  interpretation: string
  deeper: Point[]
  health: Health[]
  healthySummary: string
  research: { stats: Stat[]; claims: Claim[]; news: NewsItem[]; missing: string[] }
  asOf: number
}

export interface Bundle {
  sym: string
  question: string
  quote: Quote
  profile: Profile
  metrics: Metrics | null
  earnings: EarningsQuarter[] | null
  recs: Recommendation[] | null
  news: NewsItem[] | null
  elapsedMs: number
}

interface Signal {
  key: string
  label: string
  weight: number
  score: number | null
  up?: Point
  down?: Point
  upShort?: string
  downShort?: string
  caution?: Point
  cautionShort?: string
  source: string
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const pct = (n: number, d = 0) => `${n.toFixed(d)}%`
const signed = (n: number, d = 0) => `${n >= 0 ? '+' : '−'}${Math.abs(n).toFixed(d)}%`
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

function metric(m: Metrics | null, ...keys: string[]): number | null {
  if (!m) return null
  for (const k of keys) {
    const v = m.metric[k]
    if (isNum(v)) return v
  }
  return null
}

export function stanceOf(score: number): Stance {
  if (score >= 40) return 'Bullish'
  if (score >= 15) return 'Moderately Bullish'
  if (score > -15) return 'Neutral'
  if (score > -40) return 'Moderately Bearish'
  return 'Bearish'
}

export const stanceColor = (s: Stance) => (s === 'Neutral' ? AMBER : s.includes('Bullish') ? GREEN : RED)

const recTotal = (r: Recommendation) => r.strongBuy + r.buy + r.hold + r.sell + r.strongSell
const recNet = (r: Recommendation) => (2 * r.strongBuy + r.buy - r.sell - 2 * r.strongSell) / (2 * recTotal(r))

function buildSignals(b: Bundle) {
  const m = b.metrics
  const price = b.quote.c
  const signals: Signal[] = []

  // 1. Revenue growth
  const g = metric(m, 'revenueGrowthTTMYoy')
  {
    const s: Signal = { key: 'growth', label: 'Revenue growth', weight: 1, score: g == null ? null : clamp((g - 5) / 35, -1, 1), source: 'Finnhub — twelve-month revenue growth from company filings' }
    if (g != null) {
      if (g >= 8) {
        s.up = { t: g >= 25 ? 'Sales are growing quickly' : 'Sales are growing', d: `Revenue over the last twelve months is up ${pct(g)} on the year before.` }
        s.upShort = g >= 25 ? 'sales are growing quickly' : 'sales are still growing'
      } else if (g < 0) {
        s.down = { t: 'Sales are shrinking', d: `Revenue over the last twelve months is down ${pct(-g)} on the year before.` }
        s.downShort = 'sales are shrinking'
      } else {
        s.down = { t: 'Growth has slowed', d: `Revenue is up only ${pct(g)} over the last twelve months.` }
        s.downShort = 'growth is slow'
      }
    }
    signals.push(s)
  }

  // 2. Profitability
  const npm = metric(m, 'netProfitMarginTTM')
  {
    let score: number | null = null
    if (npm != null) score = npm >= 20 ? 0.8 : npm >= 10 ? 0.5 : npm >= 3 ? 0.2 : npm >= 0 ? -0.1 : clamp(npm / 30, -1, -0.3)
    const s: Signal = { key: 'profit', label: 'Profitability', weight: 0.8, score, source: 'Finnhub — net profit margin, trailing twelve months' }
    if (npm != null) {
      if (npm >= 10) {
        s.up = { t: 'The business is solidly profitable', d: `It keeps ${pct(npm)} of every dollar of sales as profit after all costs.` }
        s.upShort = 'the business is solidly profitable'
      } else if (npm < 0) {
        s.down = { t: 'The company is losing money', d: `It lost the equivalent of ${pct(-npm)} of sales over the last twelve months, so growth has to pay for that.` }
        s.downShort = 'the company is still losing money'
      } else {
        s.down = { t: 'Profits are thin', d: `Only ${pct(npm, 1)} of each dollar of sales is left as profit, which leaves little room for error.` }
        s.downShort = 'profits are thin'
      }
    }
    signals.push(s)
  }

  // 3. Valuation
  const pe = metric(m, 'peTTM', 'peBasicExclExtraTTM')
  const ps = metric(m, 'psTTM')
  {
    const s: Signal = { key: 'valuation', label: 'Valuation', weight: 1, score: null, source: 'Finnhub — price to earnings and price to sales, trailing twelve months' }
    if (pe != null && pe > 0) {
      s.score = pe > 60 ? -1 : pe > 40 ? -0.7 : pe > 28 ? -0.4 : pe > 18 ? 0 : pe > 10 ? 0.4 : 0.6
      if (s.score >= 0.4) {
        s.up = { t: 'The shares look reasonably priced', d: `They trade at ${pe.toFixed(0)}× last year's earnings, below the roughly 20× that is typical for large US companies.` }
        s.upShort = 'the shares look reasonably priced'
      } else if (s.score <= -0.4) {
        s.down = { t: 'The stock is expensive', d: `It trades at ${pe.toFixed(0)}× last year's earnings, well above the roughly 20× typical for the market. The price already assumes strong growth.` }
        s.downShort = 'the shares are priced for a lot to go right'
      }
    } else if (ps != null && ps > 0) {
      s.score = ps > 20 ? -1 : ps > 10 ? -0.6 : ps > 5 ? -0.3 : ps > 2 ? 0 : 0.3
      if (s.score <= -0.3) {
        s.down = { t: 'The stock is expensive for a company without profits', d: `It trades at ${ps.toFixed(1)}× its annual sales and has no earnings to value it on yet.` }
        s.downShort = 'the shares are priced richly for a company without profits'
      } else if (s.score > 0) {
        s.up = { t: 'The shares are cheap relative to sales', d: `They trade at ${ps.toFixed(1)}× annual sales, which is low for a listed company.` }
        s.upShort = 'the shares are cheap relative to sales'
      }
    }
    signals.push(s)
  }

  // 4. Analyst ratings
  const recs = (b.recs ?? []).filter(r => recTotal(r) > 0)
  let analystTrend: 'rising' | 'steady' | 'falling' | null = null
  let analystNow: { buys: number; sells: number; n: number; net: number } | null = null
  {
    const s: Signal = { key: 'analysts', label: 'Analyst ratings', weight: 1.2, score: null, source: 'Finnhub — analyst recommendation trends, last four months' }
    if (recs.length) {
      const latest = recs[0]
      const n = recTotal(latest)
      const now = recNet(latest)
      const prev = recs[Math.min(3, recs.length - 1)]
      const delta = now - recNet(prev)
      analystTrend = recs.length > 1 ? (delta > 0.06 ? 'rising' : delta < -0.06 ? 'falling' : 'steady') : 'steady'
      analystNow = { buys: latest.strongBuy + latest.buy, sells: latest.sell + latest.strongSell, n, net: now }
      s.score = clamp(now * 1.5, -1, 1)
      if (now >= 0.2) {
        s.up = { t: analystTrend === 'rising' ? 'Analysts are getting more positive' : 'Analysts lean toward buying', d: `${analystNow.buys} of ${n} analysts rate it a buy and ${analystNow.sells} say sell${analystTrend === 'rising' ? ', and the balance has shifted toward buy over the last three months' : ''}.` }
        s.upShort = 'analysts lean toward buying'
      } else if (now < 0) {
        s.down = { t: 'Analysts lean toward selling', d: `${analystNow.sells} of ${n} analysts rate it a sell and only ${analystNow.buys} say buy.` }
        s.downShort = 'analysts lean toward selling'
      } else {
        s.down = { t: 'Analysts are lukewarm', d: `Most of the ${n} analysts covering it say hold rather than buy.` }
        s.downShort = 'analysts are lukewarm'
      }
      if (analystTrend === 'falling') {
        s.caution = { t: 'Analysts are cooling on it', d: `The balance of ratings has shifted away from buy over the last three months (${analystNow.buys} buy, ${analystNow.sells} sell today).` }
        s.cautionShort = 'analysts are cooling on it'
      }
    }
    signals.push(s)
  }

  // 5. Earnings surprises
  const qs = (b.earnings ?? []).filter(e => isNum(e.surprisePercent) && isNum(e.actual) && isNum(e.estimate)).slice(0, 4)
  {
    const s: Signal = { key: 'earnings', label: 'Earnings surprises', weight: 1, score: null, source: 'Finnhub — reported vs. expected earnings per share, last four quarters' }
    if (qs.length) {
      const n = qs.length
      const avg = qs.reduce((a, e) => a + (e.surprisePercent as number), 0) / n
      const beats = qs.filter(e => (e.actual as number) > (e.estimate as number)).length
      s.score = clamp(0.6 * clamp(avg / 8, -1, 1) + 0.4 * ((beats / n) * 2 - 1), -1, 1)
      if (beats >= Math.ceil(n * 0.75) && avg > 0) {
        s.up = { t: 'Results keep beating expectations', d: `Profits came in above forecasts in ${beats} of the last ${n} quarters, by ${pct(avg, 1)} on average.` }
        s.upShort = 'results keep beating forecasts'
      } else if (beats <= n / 2 && avg < 0) {
        s.down = { t: 'Results have been missing expectations', d: `Profits fell short of forecasts in ${n - beats} of the last ${n} quarters.` }
        s.downShort = 'results have been missing forecasts'
      }
    }
    signals.push(s)
  }

  // 6. Price momentum
  const r13 = metric(m, '13WeekPriceReturnDaily')
  const hi = metric(m, '52WeekHigh')
  const lo = metric(m, '52WeekLow')
  const beta = metric(m, 'beta')
  {
    const s: Signal = { key: 'momentum', label: 'Price momentum', weight: 0.7, score: r13 == null ? null : clamp(r13 / 30, -1, 1), source: 'Finnhub — 13-week price return and 52-week range' }
    if (r13 != null) {
      if (r13 >= 10) {
        s.up = { t: 'The shares have momentum', d: `The price is up ${pct(r13, 1)} over the last three months${hi && price >= hi * 0.95 ? ', close to its one-year high' : ''}.` }
        s.upShort = 'the shares have momentum'
      } else if (r13 <= -10) {
        s.down = { t: 'The shares have been falling', d: `The price is down ${pct(-r13, 1)} over the last three months${lo && price <= lo * 1.05 ? ', near its one-year low' : ''}.` }
        s.downShort = 'the shares have been falling'
      }
    }
    if (beta != null && beta >= 1.4) {
      s.caution = { t: 'The shares move a lot', d: `They have swung about ${beta.toFixed(1)}× as much as the overall market, so a bad month for stocks hits harder here.` }
      s.cautionShort = 'the shares swing more than the market'
    }
    signals.push(s)
  }

  return { signals, g, npm, r13, hi, lo, beta, analystTrend, analystNow, qs }
}

export function analyse(b: Bundle): Analysis {
  const { signals, g, npm, r13, hi, lo, beta, analystTrend, analystNow, qs } = buildSignals(b)
  const price = b.quote.c
  const name = b.profile.name || b.sym

  const avail = signals.filter(s => s.score != null)
  const wsum = avail.reduce((a, s) => a + s.weight, 0)
  const score = wsum ? Math.round((100 * avail.reduce((a, s) => a + s.weight * (s.score as number), 0)) / wsum) : 0
  const stance = stanceOf(score)
  const color = stanceColor(stance)
  const dir = Math.sign(score)
  const clear = avail.filter(s => Math.abs(s.score as number) >= 0.15)
  const agreeing = clear.filter(s => Math.sign(s.score as number) === dir).length
  const conflicting = clear.length - agreeing
  const agree = clear.length ? agreeing / clear.length : 0
  const coverage = avail.length / signals.length
  const confidence = Math.round(45 + 25 * agree + 15 * coverage)
  const betaAdj = beta != null ? clamp(beta, 0.6, 1.6) : 1
  const er = avail.length >= 3 ? Math.round((score / 100) * 12 * betaAdj) : null

  const positives = avail.filter(s => (s.score as number) >= 0.15 && s.up).sort((a, c) => c.weight * (c.score as number) - a.weight * (a.score as number))
  const negatives = avail.filter(s => (s.score as number) <= -0.15 && s.down).sort((a, c) => a.weight * (a.score as number) - c.weight * (c.score as number))
  const cautions = signals.filter(s => s.caution)

  const reasonPts = positives.map(s => s.up as Point)
  if (!reasonPts.length) reasonPts.push({ t: 'Nothing in the numbers stands out as a strength', d: 'None of the six checks SIGNAL runs is clearly positive right now.' })
  const riskPts = [...negatives.map(s => s.down as Point), ...cautions.map(s => s.caution as Point)]
  if (!riskPts.length) riskPts.push({ t: 'The overall market could turn', d: 'Nothing in the company numbers stands out as a risk right now, so the main risk is a fall in the wider stock market.' })

  const pos = positives[0]?.upShort
  const neg = negatives[0]?.downShort ?? cautions[0]?.cautionShort

  let headline: string
  if (score >= 15) headline = pos ? `${cap(pos)}${neg ? `, but ${neg}` : ''}.` : `The numbers lean positive${neg ? `, but ${neg}` : ''}.`
  else if (score <= -15) headline = neg ? `${cap(neg)}${pos ? `, though ${pos}` : ''}.` : `The numbers lean negative${pos ? `, though ${pos}` : ''}.`
  else headline = pos && neg ? `${cap(pos)}, but ${neg}, so the picture is balanced.` : 'The numbers do not point clearly in either direction.'

  const bottomLines: Record<Stance, string> = {
    Bullish: `SIGNAL sees clearly more upside than downside for ${name} right now.`,
    'Moderately Bullish': `SIGNAL sees more upside than downside for ${name}, but not by enough to call it a strong view.`,
    Neutral: `SIGNAL does not see a clear edge either way for ${name} at this price.`,
    'Moderately Bearish': `SIGNAL sees more downside than upside for ${name}, but the case is not one-sided.`,
    Bearish: `SIGNAL sees clearly more downside than upside for ${name} right now.`,
  }

  const pUp = clamp(Math.round(50 + score * 0.35), 22, 78)
  const amp = hi && lo && price ? clamp((((hi - lo) / price) * 100) / 2, 10, 45) : 20
  const bullReasons = positives.map(s => cap(s.upShort as string)).slice(0, 3)
  if (!bullReasons.length) bullReasons.push('The overall market rising')
  const bearReasons = [...negatives.map(s => cap(s.downShort as string)), ...cautions.map(s => cap(s.cautionShort as string))].slice(0, 3)
  if (!bearReasons.length) bearReasons.push('A weaker market would pull it down')

  let interpretation: string
  const strong = stance === 'Bullish' || stance === 'Bearish'
  if (score >= 15) interpretation = `Upside is currently more likely, but the downside is meaningful if ${neg ?? 'the market turns'}. ${strong ? 'The evidence is one-sided enough for a firm view.' : 'That is why the view is moderate rather than strong.'}`
  else if (score <= -15) interpretation = `Downside is currently more likely${pos ? `, although ${pos}, which could change that` : ''}. ${strong ? 'The evidence is one-sided enough for a firm view.' : 'The case is not one-sided, so the view stays moderate.'}`
  else interpretation = `The evidence for and against is close to balanced, so SIGNAL does not lean either way.${pos && neg ? ` ${cap(pos)}, but ${neg}.` : ''}`

  const missing = signals.filter(s => s.score == null).map(s => s.label.toLowerCase())
  const sourcesRead = [
    'the live price',
    b.profile.name ? 'the company profile' : '',
    b.metrics ? 'twelve-month fundamentals' : '',
    analystNow ? `${analystNow.n} analyst ratings` : '',
    qs.length ? `the last ${qs.length} quarterly results` : '',
    b.news?.length ? `${b.news.length} news ${b.news.length === 1 ? 'story' : 'stories'} from the last two weeks` : '',
  ].filter(Boolean)
  const strengthTitle = stance === 'Neutral' ? 'Why no lean either way' : stance.startsWith('Moderately') ? 'Why not a stronger view' : 'Why the view is strong'
  const deeper: Point[] = [
    { t: 'Where the numbers come from', d: `${cap(list(sourcesRead))}, all read live from Finnhub's free market data feed.` },
    { t: 'How the view is set', d: 'Six checks — revenue growth, profitability, valuation, analyst ratings, earnings surprises and price momentum — each score from −1 to +1 and are weighted together. No language model writes the verdict; the numbers do.' },
    { t: strengthTitle, d: clear.length ? `${agreeing} of the ${clear.length} checks with a clear signal point ${dir > 0 ? 'up' : dir < 0 ? 'down' : 'one way'}${conflicting ? `, and ${conflicting} point${conflicting === 1 ? 's' : ''} the other way` : ''}. ${conflicting ? (strong ? 'The balance is clear enough for a firm view even so.' : 'SIGNAL keeps the view moderate when the evidence disagrees with itself.') : 'When the checks agree, SIGNAL allows itself a firmer view.'}` : 'None of the checks gives a clear signal, so SIGNAL stays neutral on purpose.' },
    { t: 'What SIGNAL is unsure about', d: missing.length ? `The free data plan did not return ${list(missing)} for this company, so ${missing.length === 1 ? 'that check is' : 'those checks are'} left out.` : 'Anything that is not in the numbers yet: a change of management, a new product, or a shift in the economy.' },
  ]

  const health: Health[] = []
  if (g != null) {
    const status: HealthStatus = g >= 10 ? 'Healthy' : g >= 0 ? 'Watching' : 'At risk'
    health.push({ name: 'Revenue growth', now: signed(g), danger: 'sales start shrinking', status, pos: clamp((g + 10) / 60, 0, 1), plain: { Healthy: 'Sales are growing well above the level that would worry us.', Watching: 'Sales are still growing, but slowly. This is one to keep an eye on.', 'At risk': 'Sales are shrinking. That is the clearest warning sign in the numbers.' }[status] })
  }
  if (npm != null) {
    const status: HealthStatus = npm >= 10 ? 'Healthy' : npm >= 0 ? 'Watching' : 'At risk'
    health.push({ name: 'Profit margin', now: signed(npm, 1), danger: 'the company starts losing money', status, pos: clamp((npm + 10) / 40, 0, 1), plain: { Healthy: 'The company keeps a healthy share of each sale as profit.', Watching: 'The company is profitable, but only just.', 'At risk': 'The company is losing money on its sales.' }[status] })
  }
  if (analystNow) {
    const status: HealthStatus = analystTrend === 'rising' ? 'Healthy' : analystTrend === 'falling' ? (analystNow.net < 0.2 ? 'At risk' : 'Watching') : analystNow.net >= 0.2 ? 'Healthy' : 'Watching'
    health.push({ name: 'Analyst expectations', now: analystTrend === 'rising' ? 'Rising' : analystTrend === 'falling' ? 'Falling' : 'Steady', danger: 'analysts start cutting', status, pos: clamp((analystNow.net + 1) / 2, 0, 1), plain: { Healthy: 'The people who follow this company lean toward buying, and are not backing away.', Watching: 'Analysts are neither warming to it nor turning away in numbers.', 'At risk': 'Analysts have been pulling back their ratings recently.' }[status] })
  }
  if (r13 != null) {
    const status: HealthStatus = r13 > 0 ? 'Healthy' : r13 >= -15 ? 'Watching' : 'At risk'
    health.push({ name: 'Share price trend', now: `${signed(r13, 1)} in 3 months`, danger: 'a fall of more than 15%', status, pos: clamp((r13 + 30) / 60, 0, 1), plain: { Healthy: 'The shares have been rising, so the market agrees with the case so far.', Watching: 'The shares have drifted lower over the last three months.', 'At risk': 'The shares have fallen sharply. The market is already pricing in trouble.' }[status] })
  }
  const counts = { Healthy: 0, Watching: 0, 'At risk': 0 } as Record<HealthStatus, number>
  health.forEach(h => (counts[h.status] += 1))
  const parts = [counts.Healthy ? `${counts.Healthy} healthy` : '', counts.Watching ? `${counts.Watching} worth watching` : '', counts['At risk'] ? `${counts['At risk']} at risk` : ''].filter(Boolean)
  const healthySummary = parts.length ? `${list(parts)}.` : 'not enough data to watch anything yet.'

  const endpoints = [true, Boolean(b.profile.name), Boolean(b.metrics), Boolean(analystNow), qs.length > 0].filter(Boolean).length
  const stats: Stat[] = [
    { v: `${avail.length} of 6`, k: 'checks with data' },
    { v: String(endpoints + (b.news?.length ?? 0)), k: 'sources read' },
    { v: String(conflicting), k: conflicting === 1 ? 'check that disagrees' : 'checks that disagree' },
    { v: `${(b.elapsedMs / 1000).toFixed(1)}s`, k: 'to reach the answer' },
  ]
  const claims: Claim[] = avail.map(s => {
    const v = s.score as number
    const abs = Math.abs(v)
    return {
      claim: v >= 0.15 ? (s.up?.t ?? `${s.label} supports the view`) : v <= -0.15 ? (s.down?.t ?? `${s.label} counts against the view`) : `${s.label} is neutral`,
      strength: abs >= 0.6 ? 'Very strong' : abs >= 0.3 ? 'Strong' : abs >= 0.15 ? 'Moderate' : 'Weak',
      sources: s.source,
    }
  })

  return {
    sym: b.sym,
    name,
    industry: b.profile.finnhubIndustry || '',
    price,
    chg: b.quote.dp ?? 0,
    stance,
    color,
    score,
    confidence,
    er,
    beta,
    headline,
    bottomLine: bottomLines[stance],
    reasons: reasonPts.slice(0, 3),
    risks: riskPts.slice(0, 2),
    deepReason: reasonPts[3] ?? null,
    deepRisk: riskPts[2] ?? null,
    bull: { p: pUp, reasons: bullReasons, range: `+${Math.round(amp * 0.5)}% to +${Math.round(amp)}%` },
    bear: { p: 100 - pUp, reasons: bearReasons, range: `−${Math.round(amp * 0.45)}% to −${Math.round(amp * 0.9)}%` },
    interpretation,
    deeper,
    health,
    healthySummary,
    research: { stats, claims, news: (b.news ?? []).slice(0, 5), missing },
    asOf: (b.quote.t || Math.floor(Date.now() / 1000)) * 1000,
  }
}
