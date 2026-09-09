import { GREEN, RED, AMBER, MUTED } from './theme'

export interface Recent {
  label: string
  view: string
  color: string
}

export const recents: Recent[] = [
  { label: 'Should I hold ZETA for the next 3 months?', view: 'Moderately bullish', color: GREEN },
  { label: 'Is Apple expensive right now?', view: 'Fairly valued', color: AMBER },
  { label: 'Why is META falling today?', view: 'Answered', color: MUTED },
  { label: 'Compare MSFT and GOOG', view: 'MSFT preferred', color: GREEN },
]

export const thinkLines = [
  'Reading the latest results…',
  'Checking what analysts expect…',
  'Weighing what could go wrong…',
  'Putting it together…',
]

export const asset = {
  sym: 'ZETA',
  name: 'Zeta Global',
  price: '$18.42',
  chg: '+2.1%',
  stance: 'Moderately Bullish',
  conf: '72%',
  er: '+9%',
  headline:
    'Revenue trends and analyst expectations are improving, but the stock is expensive enough that downside risk remains meaningful.',
  bottomLine:
    'SIGNAL currently sees more upside than downside, but the stock is expensive enough that expectations need to remain strong.',
}

export interface Point {
  t: string
  d: string
}

export const reasons: Point[] = [
  {
    t: 'Revenue growth is stronger than expected',
    d: 'Sales grew 38% last quarter — ahead of what analysts had modelled.',
  },
  {
    t: 'Analysts are raising their estimates',
    d: 'Nine have raised forecasts in the last three months; two lowered them.',
  },
  {
    t: 'AI advertising demand remains strong',
    d: 'The largest ad platforms all guided their own spending higher.',
  },
]

export const deepReason: Point = {
  t: 'Cash generation is improving',
  d: 'The company now funds its own growth without raising money.',
}

export const risks: Point[] = [
  {
    t: 'Valuation is expensive',
    d: 'The share price already assumes several more strong quarters.',
  },
  {
    t: 'A slowdown in ad spending would hurt the thesis',
    d: 'Most of the growth story depends on marketing budgets staying generous.',
  },
]

export const deepRisk: Point = {
  t: 'Big platforms could compete directly',
  d: 'Google and Meta can bundle similar tools at lower cost.',
}

export const bullBear = {
  upP: '64%',
  downP: '36%',
  up: 64,
  down: 36,
  upReasons: [
    'Sales growing faster than expected',
    'Analysts lifting their forecasts',
    'Companies keep spending on AI advertising',
  ],
  downReasons: [
    'The stock is expensive',
    'Advertising budgets could tighten',
    'A weaker economy would slow growth',
  ],
  upRange: '+18% to +30%',
  downRange: '−21% to −25%',
  interpretation:
    'Upside is currently more likely, but the downside is meaningful if growth disappoints. That is why the view is moderate rather than strong.',
}

export const deeper: Point[] = [
  {
    t: 'Where the numbers come from',
    d: 'Company filings, the last six earnings calls and forecasts from 34 analysts.',
  },
  {
    t: 'How the odds are set',
    d: 'SIGNAL looks at how similar situations turned out in the past, then adjusts for how well it has predicted lately.',
  },
  {
    t: 'Why not a stronger view',
    d: 'The evidence for and against is unusually balanced, so SIGNAL keeps the view moderate on purpose.',
  },
  {
    t: 'What SIGNAL is unsure about',
    d: 'How long marketing budgets stay this generous. Nobody has good data on that yet.',
  },
]

export interface Health {
  name: string
  now: string
  danger: string
  status: 'Healthy' | 'Watching'
  pos: number
  plain: string
}

export const health: Health[] = [
  {
    name: 'Revenue growth',
    now: '38%',
    danger: 'below 20%',
    status: 'Healthy',
    pos: 0.78,
    plain: 'Sales are growing much faster than the level that would worry us.',
  },
  {
    name: 'Profit margin',
    now: '62%',
    danger: 'below 55%',
    status: 'Healthy',
    pos: 0.66,
    plain: 'The company keeps a similar share of each sale as it did a year ago.',
  },
  {
    name: 'Analyst expectations',
    now: 'Rising',
    danger: 'analysts start cutting',
    status: 'Healthy',
    pos: 0.72,
    plain: 'The people who follow this company are raising their forecasts, not lowering them.',
  },
  {
    name: 'Ad spending across the industry',
    now: 'Growing',
    danger: 'growth stalls',
    status: 'Watching',
    pos: 0.42,
    plain: 'Still growing, but more slowly than it was six months ago. This is the one to keep an eye on.',
  },
]

export const healthySummary = 'three healthy, one worth watching.'

export interface WatchRow {
  sym: string
  price: string
  view: string
  color: string
  conf: string
  note: string
}

export const watchlist: WatchRow[] = [
  { sym: 'ZETA', price: '$18.42', view: 'Moderately bullish', color: GREEN, conf: '72%', note: 'Growth ahead of expectations, but priced richly.' },
  { sym: 'NVDA', price: '$1,042', view: 'Bullish', color: GREEN, conf: '77%', note: 'Demand still outruns supply.' },
  { sym: 'AAPL', price: '$243', view: 'Neutral', color: AMBER, conf: '58%', note: 'Fairly priced for how fast it is growing.' },
  { sym: 'META', price: '$612', view: 'Moderately bullish', color: GREEN, conf: '64%', note: 'Ad revenue steady; spending is the question.' },
  { sym: 'BTC', price: '$96,400', view: 'Neutral', color: AMBER, conf: '51%', note: 'Moves with how much risk markets want to take.' },
]

export interface Holding {
  sym: string
  w: string
  driver: string
  view: string
  color: string
}

export const holdings: Holding[] = [
  { sym: 'ZETA', w: '32%', driver: 'AI advertising demand', view: 'Moderately bullish', color: GREEN },
  { sym: 'MSFT', w: '24%', driver: 'AI software spending', view: 'Bullish', color: GREEN },
  { sym: 'META', w: '16%', driver: 'AI advertising demand', view: 'Moderately bullish', color: GREEN },
  { sym: 'BTC', w: '12%', driver: 'Appetite for risk', view: 'Neutral', color: AMBER },
  { sym: 'SPY', w: '16%', driver: 'The whole market (a third of it tech)', view: 'Neutral', color: AMBER },
]

export interface HistoryRow {
  q: string
  view: string
  color: string
  when: string
}

export const history: HistoryRow[] = [
  { q: 'Should I hold ZETA for the next 3 months?', view: 'Moderately bullish', color: GREEN, when: 'Today, 4:04pm' },
  { q: 'Is my portfolio too concentrated?', view: 'Yes — one theme', color: AMBER, when: 'Today, 11:20am' },
  { q: 'Why is META falling today?', view: 'Answered', color: MUTED, when: 'Yesterday' },
  { q: 'Compare MSFT and GOOG', view: 'MSFT preferred', color: GREEN, when: 'Monday' },
]

export const researchStats = [
  { v: '6', k: 'research agents' },
  { v: '41', k: 'sources read' },
  { v: '3', k: 'disagreeing opinions' },
  { v: '3m 41s', k: 'to reach the answer' },
]

export const sourceGroups = [
  { claim: 'AI advertising demand is strong', strength: 'Very strong', sources: 'Filings from three ad platforms, industry spend data' },
  { claim: 'Growth is beating expectations', strength: 'Strong', sources: 'Company results, 34 analyst forecasts' },
  { claim: 'The stock is expensive', strength: 'Very strong', sources: 'Ten years of its own valuation history' },
]

export { GREEN, RED, AMBER, MUTED }
