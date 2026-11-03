# Security policy

## Reporting a vulnerability

Please report security issues privately through GitHub: **Security → Report a vulnerability** on this repository (private vulnerability reporting). Please don't open a public issue for security problems. We aim to reply within 3 working days.

Useful details: the endpoint or file, steps to reproduce, and the impact you expect. Never include real personal data, card numbers or PINs in a report.

## Scope

| In scope | Notes |
|---|---|
| The bot service `accesspoint-bot.aljabrialam.workers.dev` (webhooks, `/try`, `/see`, setup endpoints) | Signature checks, rate limits, data retention |
| The audio service (Modal) | Token checks, input handling |
| Guardrail bypasses | Any screen or message that makes AccessPoint give a step on a PIN screen, miss a wrong total or transfer, or point at the wrong button |
| The iPhone app (`mobile/`) | Scenario mode |

Out of scope: denial of service, social engineering, Meta, Telegram, Cloudflare or Modal platform issues (report those to the platform).

## How AccessPoint protects people and data

- Webhooks are verified (HMAC-SHA256 with the app secret; Telegram secret header) before parsing.
- All secrets are Cloudflare Worker secrets; none are in the code or this repository. `.env` files are git-ignored.
- No accounts. Chat state expires after 1 hour, photos after 10 minutes, voice notes are never stored, and "delete" erases everything at once.
- Every model output passes deterministic guardrails before anyone sees it. Full safety case: [docs/GUARDRAILS.md](docs/GUARDRAILS.md). Data and security detail: [docs/PRIVACY-SECURITY.md](docs/PRIVACY-SECURITY.md).

## Dependencies

- **Bot (`bot/`):** no runtime npm dependencies. It uses only the Workers runtime and Web APIs.
- **Audio service:** `modal==1.6.2`, `fastapi[standard]==0.115.12`, `edge-tts==7.3.1`, pinned.
- **iPhone app (`mobile/`):** Expo SDK 58. As of 3 Nov 2026, `npm audit --omit=dev` reports moderate advisories in Expo's command-line build tooling (`@expo/cli`, `@expo/config-plugins`, `glob`, `minimatch`, and `zod` inside `@expo/cli`). These run on a developer's machine, not in the app. The only suggested fixes downgrade Expo by several major versions, so we track Expo's patch releases instead (Dependabot is enabled) and update after a release has had at least seven days to settle.
- GitHub Actions are pinned to commit SHAs and run with read-only permissions.
