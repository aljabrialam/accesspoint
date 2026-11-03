#!/usr/bin/env bash
# Copies the bot's secrets from the project root .env / .env.local to the Cloudflare Worker.
# Values are piped straight to wrangler and never printed. Run from anywhere: bot/scripts/push-secrets.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
KEYS=(MODEL_API_KEY APP_SECRET WA_APP_SECRET PAGE_TOKEN WA_TOKEN WA_PHONE_ID AUDIO_URL AUDIO_TOKEN VERIFY_TOKEN TG_TOKEN)
for k in "${KEYS[@]}"; do
  v=$(grep -h "^$k=" .env .env.local 2>/dev/null | tail -1 | cut -d= -f2- || true)
  if [ -z "$v" ]; then printf "%-14s skipped (empty)\n" "$k"; continue; fi
  if printf "%s" "$v" | (cd bot && wrangler secret put "$k" >/dev/null 2>&1); then printf "%-14s set\n" "$k"; else printf "%-14s FAILED\n" "$k"; fi
done
