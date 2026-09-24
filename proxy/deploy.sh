#!/usr/bin/env bash
# Deploys the Finnhub key proxy to Cloudflare Workers and points the site at it.
# The key is read from ../.env.local and handed to wrangler on stdin; it is never
# printed, never committed, and never reaches the browser bundle.
#
# One-time prerequisite (opens a browser, creates/uses your free Cloudflare account):
#   npx wrangler login
set -euo pipefail
cd "$(dirname "$0")"

KEY="$(grep '^VITE_FINNHUB_KEY=' ../.env.local | cut -d= -f2- | tr -d '\n')"
[ -n "$KEY" ] || { echo "no VITE_FINNHUB_KEY in ../.env.local" >&2; exit 1; }

printf '%s' "$KEY" | npx --yes wrangler secret put FINNHUB_KEY
unset KEY
URL="$(npx --yes wrangler deploy 2>&1 | tee /dev/stderr | grep -oE 'https://[a-z0-9.-]+\.workers\.dev' | tail -1)"
[ -n "$URL" ] || { echo "could not read the worker URL from wrangler output" >&2; exit 1; }

echo
echo "Worker: $URL"
echo "Smoke test (DNS for a new workers.dev subdomain can take a few minutes):"
for i in $(seq 1 20); do
  code="$(curl -s -o /dev/null -w '%{http_code}' -H 'Origin: https://morantejr.github.io' "$URL/quote?symbol=AAPL" || true)"
  echo "  quote -> HTTP $code"
  [ "$code" = "200" ] && break
  sleep 15
done

# Point the deployed site and local dev at the proxy.
( cd .. && printf '%s' "$URL" | gh secret set FINNHUB_PROXY && gh workflow run "Deploy to GitHub Pages" )
grep -q '^VITE_FINNHUB_PROXY=' ../.env.local && sed -i '' "s|^VITE_FINNHUB_PROXY=.*|VITE_FINNHUB_PROXY=$URL|" ../.env.local || printf 'VITE_FINNHUB_PROXY=%s\n' "$URL" >> ../.env.local
echo "Done. The site rebuilds without any key in the bundle; local dev uses the proxy too."
