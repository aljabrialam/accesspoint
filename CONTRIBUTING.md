# Contributing

Thanks for helping make self-service machines easier for everyone.

## Run it

```
git clone --recurse-submodules https://github.com/aljabrialam/accesspoint
cd accesspoint/bot && npm test            # 22 tests, no keys needed
npm run live-check                        # real Meta models; needs MODEL_API_KEY in ../.env
cd ../mobile && npm ci && npx expo start  # iPhone app in the iOS Simulator
npm run e2e                               # 11 Maestro flows
```

Setup for the chat channels: [SETUP.md](SETUP.md). How it fits together: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Ground rules

1. **Safety first.** Read [docs/GUARDRAILS.md](docs/GUARDRAILS.md) before changing `bot/src/guard.js`, `converse.js` or `strings.js`. A change that weakens a guardrail needs a test that shows why it's still safe.
2. **The model proposes, code decides.** New behaviour goes through `decide()` and fixed strings, not model-written safety text.
3. **Every bug becomes a test.** Unit tests in `bot/test/guard.test.js`, end-to-end in `bot/test/flow.test.js`; red-team screens go in `bot/test/fixtures/screens.html` and `bot/scripts/live-check.mjs`.
4. **No secrets.** Values go in `.env` / `.env.local` (git-ignored) and Worker secrets (`bot/scripts/push-secrets.sh`).
5. **Plain words.** Visible text is short and kind, with no dashes. Fixed texts exist in all 6 languages in `strings.js`; native-speaker review is welcome.
6. **Honest labels.** Scenario-mode footage and preview channels are always labelled as such.

## Pull requests

Keep them small, describe the user-facing change, and make sure `npm test` passes (CI runs it on every push).
