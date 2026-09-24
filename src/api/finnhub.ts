// Finnhub free-tier client. Docs: https://finnhub.io/docs/api
// The key is supplied by the person using the app (avatar menu → Market data)
// or by VITE_FINNHUB_KEY at build time. It stays in the browser and is only
// ever sent to Finnhub.

const BASE = 'https://finnhub.io/api/v1'
// Optional proxy (see proxy/README.md) that holds the key server-side. When set,
// no key is needed in the browser and requests go through it without a token.
const PROXY = (import.meta.env.VITE_FINNHUB_PROXY as string | undefined)?.replace(/\/$/, '')
const KEY_STORAGE = 'signal.finnhubKey'
const TTL_MS = 10 * 60 * 1000

export type ErrorKind = 'nokey' | 'auth' | 'ratelimit' | 'premium' | 'network' | 'notfound'

export class ApiError extends Error {
  kind: ErrorKind
  constructor(kind: ErrorKind, message: string) {
    super(message)
    this.kind = kind
  }
}

export function getKey(): string {
  try {
    const k = localStorage.getItem(KEY_STORAGE)
    if (k) return k
  } catch {
    /* storage unavailable */
  }
  return (import.meta.env.VITE_FINNHUB_KEY as string | undefined)?.trim() ?? ''
}

export function setKey(k: string) {
  try {
    if (k.trim()) localStorage.setItem(KEY_STORAGE, k.trim())
    else localStorage.removeItem(KEY_STORAGE)
  } catch {
    /* storage unavailable */
  }
}

export const hasKey = () => Boolean(PROXY) || getKey().length > 0
export const viaProxy = () => Boolean(PROXY)

const cache = new Map<string, { t: number; v: unknown }>()

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const key = getKey()
  if (!PROXY && !key) throw new ApiError('nokey', 'No market data key is set.')
  const cacheKey = `${path}?${new URLSearchParams(params)}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.t < TTL_MS) return hit.v as T

  let res: Response
  try {
    res = await fetch(PROXY ? `${PROXY}${path}?${new URLSearchParams(params)}` : `${BASE}${path}?${new URLSearchParams({ ...params, token: key })}`)
  } catch {
    throw new ApiError('network', 'Could not reach the market data service. Check your connection and try again.')
  }
  if (res.status === 401) throw new ApiError('auth', 'The market data key was rejected. Check it in the avatar menu.')
  if (res.status === 429) throw new ApiError('ratelimit', 'Too many requests. The free plan allows 60 a minute, so wait a moment and try again.')
  if (res.status === 403) throw new ApiError('premium', 'This data is not included in the free plan.')
  if (!res.ok) throw new ApiError('network', `The market data service returned an error (${res.status}).`)
  const v = (await res.json()) as T
  cache.set(cacheKey, { t: Date.now(), v })
  return v
}

/** Swallow per-endpoint failures that should not sink the whole answer. */
export async function optional<T>(p: Promise<T>): Promise<T | null> {
  try {
    return await p
  } catch (e) {
    if (e instanceof ApiError && (e.kind === 'auth' || e.kind === 'nokey' || e.kind === 'ratelimit')) throw e
    return null
  }
}

export interface Quote { c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number }
export interface Profile { name: string; ticker: string; finnhubIndustry: string; marketCapitalization: number; exchange: string; country: string; weburl: string; logo: string }
export interface Metrics { metric: Record<string, number | null | undefined> }
export interface Recommendation { period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }
export interface EarningsQuarter { period: string; actual: number | null; estimate: number | null; surprisePercent: number | null; quarter: number; year: number }
export interface NewsItem { id: number; headline: string; source: string; url: string; datetime: number; summary: string }
export interface SearchHit { symbol: string; description: string; type: string; displaySymbol: string }

export const quote = (symbol: string) => get<Quote>('/quote', { symbol })
export const profile = (symbol: string) => get<Profile>('/stock/profile2', { symbol })
export const metrics = (symbol: string) => get<Metrics>('/stock/metric', { symbol, metric: 'all' })
export const recommendations = (symbol: string) => get<Recommendation[]>('/stock/recommendation', { symbol })
export const earnings = (symbol: string) => get<EarningsQuarter[]>('/stock/earnings', { symbol, limit: '4' })
export const search = (q: string) => get<{ count: number; result: SearchHit[] }>('/search', { q })

export function news(symbol: string, days = 14) {
  const iso = (d: Date) => d.toISOString().slice(0, 10)
  const to = new Date()
  const from = new Date(to.getTime() - days * 86400000)
  return get<NewsItem[]>('/company-news', { symbol, from: iso(from), to: iso(to) })
}

export const emptyProfile = (sym: string): Profile => ({ name: sym, ticker: sym, finnhubIndustry: '', marketCapitalization: 0, exchange: '', country: '', weburl: '', logo: '' })
