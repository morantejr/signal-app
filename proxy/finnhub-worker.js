// Cloudflare Worker: holds the Finnhub key server-side so the public site needs no
// bring-your-own key. Allowlisted endpoints only, origin-checked, 60s edge cache.
// Deploy: see proxy/README.md. Set FINNHUB_KEY with `wrangler secret put FINNHUB_KEY`.

const ALLOWED_PATHS = new Set(['/quote', '/stock/profile2', '/stock/metric', '/stock/recommendation', '/stock/earnings', '/company-news', '/search'])
const UPSTREAM = 'https://finnhub.io/api/v1'

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const origin = request.headers.get('Origin') || ''
    const allowedOrigins = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean)
    const originOk = allowedOrigins.length === 0 || allowedOrigins.includes(origin)
    const cors = {
      'Access-Control-Allow-Origin': originOk && origin ? origin : allowedOrigins[0] || '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      Vary: 'Origin',
    }
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (request.method !== 'GET') return new Response('method not allowed', { status: 405, headers: cors })
    if (!ALLOWED_PATHS.has(url.pathname)) return new Response('endpoint not allowed', { status: 403, headers: cors })
    if (!originOk) return new Response('origin not allowed', { status: 403, headers: cors })
    if (!env.FINNHUB_KEY) return new Response('proxy is not configured', { status: 500, headers: cors })

    url.searchParams.delete('token')
    const upstream = `${UPSTREAM}${url.pathname}?${url.searchParams.toString()}&token=${env.FINNHUB_KEY}`

    // Edge cache keyed on the token-free URL so the key never appears in cache keys.
    const cache = caches.default
    const cacheKey = new Request(`https://finnhub-proxy.cache${url.pathname}?${url.searchParams.toString()}`, { method: 'GET' })
    let res = await cache.match(cacheKey)
    if (!res) {
      const up = await fetch(upstream, { headers: { Accept: 'application/json' } })
      res = new Response(up.body, { status: up.status, headers: { 'Content-Type': up.headers.get('Content-Type') || 'application/json', 'Cache-Control': 'public, max-age=60' } })
      if (up.ok) await cache.put(cacheKey, res.clone())
    }
    const out = new Response(res.body, res)
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v)
    return out
  },
}
