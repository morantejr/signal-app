# Finnhub key proxy

A 60-line Cloudflare Worker so the public site can read live data without asking
each visitor for a key. Cloudflare's free plan allows 100,000 requests a day, which
is more than the Finnhub free tier will let through anyway.

## Deploy

One-time: sign in to Cloudflare (creates a free account if you don't have one; opens a browser).

```bash
cd proxy && npx wrangler login
```

Then run the script. It reads the key from `../.env.local`, stores it as a Worker secret over stdin,
deploys, smoke-tests, sets the `FINNHUB_PROXY` repository secret to the Worker URL, redeploys the
site, and points local dev at the proxy. The key is never printed and never enters the bundle.

```bash
./proxy/deploy.sh
```

When `VITE_FINNHUB_PROXY` is set the app never asks visitors for a key and never sends one.

## What it does

- Forwards only the seven endpoints the app uses; everything else gets a 403.
- Checks the `Origin` header against `ALLOWED_ORIGINS` in `wrangler.toml`.
- Strips any `token` a caller sends and appends the secret one.
- Caches each token-free URL at the edge for 60 seconds, so a burst of visitors
  hitting the same ticker costs one upstream call.

## What it does not do

Per-visitor rate limiting. Cloudflare's rate-limiting rules are a paid feature on
Workers; if abuse shows up, the cheap fix is a KV counter per IP, or rotating the key.
