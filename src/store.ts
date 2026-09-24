// Everything the app remembers lives in this browser: asked questions, the
// watchlist and the portfolio. Nothing is sent anywhere.

export interface HistoryRow { q: string; sym: string; view: string; color: string; at: number }
export interface Holding { sym: string; w: number }

function read<T>(k: string, fallback: T): T {
  try {
    const v = localStorage.getItem(k)
    return v ? (JSON.parse(v) as T) : fallback
  } catch {
    return fallback
  }
}

function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v))
  } catch {
    /* storage unavailable */
  }
}

export const loadHistory = () => read<HistoryRow[]>('signal.history', [])
export function pushHistory(row: HistoryRow): HistoryRow[] {
  const h = [row, ...loadHistory().filter(r => r.q !== row.q)].slice(0, 20)
  write('signal.history', h)
  return h
}

export const DEFAULT_WATCHLIST = ['ZETA', 'NVDA', 'AAPL', 'META', 'MSFT']
export const loadWatchlist = () => read<string[]>('signal.watchlist', DEFAULT_WATCHLIST)
export const saveWatchlist = (s: string[]) => write('signal.watchlist', s)

export const loadHoldings = () => read<Holding[]>('signal.holdings', [])
export const saveHoldings = (h: Holding[]) => write('signal.holdings', h)

export function whenLabel(at: number): string {
  const d = new Date(at)
  const now = new Date()
  const sameDay = (x: Date, y: Date) => x.toDateString() === y.toDateString()
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(' ', '')
  if (sameDay(d, now)) return `Today, ${time}`
  const yesterday = new Date(now.getTime() - 86400000)
  if (sameDay(d, yesterday)) return 'Yesterday'
  if (now.getTime() - at < 6 * 86400000) return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
