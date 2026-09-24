// Pull the company out of a plain-language question.
// "Should I buy NVDA?" → ticker NVDA. "Is Apple expensive?" → name Apple (looked up).

const TICKER_STOP = new Set(['I', 'A', 'AI', 'US', 'USA', 'ETF', 'IPO', 'CEO', 'EPS', 'PE', 'Q', 'OK', 'VS', 'THE', 'AND', 'OR', 'FOR', 'IS', 'IT', 'BUY', 'SELL', 'HOLD', 'NOW', 'WHY', 'WHAT', 'HOW', 'SHOULD', 'COMPARE', 'TODAY', 'USD', 'SIGNAL', 'DO', 'IN', 'ON', 'TO', 'OF', 'MY', 'NOT', 'UP', 'DOWN', 'AT', 'BE', 'SO', 'IF', 'NO', 'YES'])
const NAME_STOP = new Set(['should', 'is', 'why', 'what', 'how', 'compare', 'buy', 'sell', 'hold', 'today', 'right', 'now', 'next', 'months', 'month', 'year', 'years', 'week', 'weeks', 'expensive', 'cheap', 'falling', 'rising', 'the', 'my', 'portfolio', 'for', 'and', 'or', 'signal', 'does', 'think', 'about', 'of', 'stock', 'stocks', 'shares', 'good', 'bad', 'worth', 'buying', 'selling', 'holding', 'can', 'will', 'are', 'was', 'were', 'i', 'a', 'an', 'in', 'on', 'to', 'with', 'vs', 'versus', 'over', 'this', 'that', 'it', 'its', 'still', 'too', 'long', 'short', 'term', 'time', 'be', 'do', 'tell', 'me', 'give', 'view', 'opinion', 'price', 'going', 'go', 'up', 'down', 'have', 'has', 'had', 'been', 'would', 'could', 'invest', 'investment', 'again', 'yet', 'dip', 'crash', 'rally'])

export interface Candidates {
  tickers: string[]
  names: string[]
}

export function candidates(q: string): Candidates {
  const words = q.replace(/[^\w$&.'’-]+/g, ' ').split(' ').filter(Boolean)
  const tickers: string[] = []
  const names: string[] = []
  for (const raw of words) {
    const w = raw.replace(/^\$/, '').replace(/[.,?!'’]+$/g, '')
    if (!w) continue
    if (/^[A-Z]{1,5}$/.test(w) && !TICKER_STOP.has(w)) {
      if (!tickers.includes(w)) tickers.push(w)
      continue
    }
    if (/^[A-Z][a-zA-Z&.'’-]+$/.test(w) && !NAME_STOP.has(w.toLowerCase())) {
      if (!names.includes(w)) names.push(w)
    }
  }
  if (!tickers.length && !names.length) {
    // "should i buy nvidia" — no capitals at all, so try every meaningful word.
    for (const raw of words) {
      const w = raw.replace(/[.,?!'’]+$/g, '')
      if (w.length >= 3 && !NAME_STOP.has(w.toLowerCase()) && !/^\d/.test(w)) names.push(w)
    }
  }
  return { tickers, names }
}
