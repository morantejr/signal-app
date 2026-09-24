# Finnhub key proxy

A 60-line Cloudflare Worker so the public site can read live data without asking
each visitor for a key. Cloudflare's free plan allows 100,000 requests a day, which
is more than the Finnhub free tier will let through anyway.

## Deploy (needs a Cloudflare account and the wrangler CLI)

```bash
cd proxy
npx wrangler login
npx wrangler secret put FINNHUB_KEY        # paste the Finnhub key when prompted
npx wrangler deploy                        # prints https://signal-finnhub-proxy.<you>.workers.dev
```

Then build the web app with the proxy URL:

```bash
# local: .env.local
VITE_FINNHUB_PROXY=https://signal-finnhub-proxy.<you>.workers.dev
```

For the deployed site add a `FINNHUB_PROXY` repository secret; the Pages workflow passes it
through as `VITE_FINNHUB_PROXY`. When the proxy is set the app never asks for a key and
never sends one.

## What it does

- Forwards only the seven endpoints the app uses; everything else gets a 403.
- Checks the `Origin` header against `ALLOWED_ORIGINS` in `wrangler.toml`.
- Strips any `token` a caller sends and appends the secret one.
- Caches each token-free URL at the edge for 60 seconds, so a burst of visitors
  hitting the same ticker costs one upstream call.

## What it does not do

Per-visitor rate limiting. Cloudflare's rate-limiting rules are a paid feature on
Workers; if abuse shows up, the cheap fix is a KV counter per IP, or rotating the key.
