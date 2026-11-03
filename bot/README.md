# AccessPoint bot (Messenger + WhatsApp)

Scan the "Need help? Scan me" sticker on a machine, send a photo of the screen, get the one next step in your language. No app to install.

| Meta tool | Job |
|---|---|
| Messenger, WhatsApp Cloud API | Where people talk to AccessPoint. The sticker opens `m.me/<page>?ref=atm` or `wa.me/<number>?text=Hi AccessPoint %23atm` |
| Muse Spark 1.3 | Reads the photo, returns one step as strict JSON (screen type, options, target, money, risk) in the person's language |
| SAM 3.1 | Finds the control Muse Spark named, in the same photo. No match means "check the label", never a guess. Its box drives "See where" and the position words |
| Muse Voice Transcribe | Voice notes, biased toward the labels on screen |
| Muse Image | Artwork for the sticker kit only, never for guidance |

Guardrails live in `src/guard.js` and `src/converse.js` and are tested in `test/`. See `docs/GUARDRAILS.md` at the project root.

## Run the tests

```
cd bot && npm test          # 22 tests: guardrails, Spark/SAM agreement, text scrubbing, re-asking unclear answers, end-to-end webhooks (Messenger, WhatsApp, Telegram, /try) with Meta APIs mocked
npm run live-check          # real Muse Spark + SAM 3.1 on 7 clean machine screens and 5 red-team screens (needs MODEL_API_KEY in ../.env)
```

## Set it up

Step-by-step checklist with status: [SETUP.md](../SETUP.md). Summary:

### 1. Meta Model API key
Put it in the project root `.env` as `MODEL_API_KEY=...` (never in chat), then run `npm run live-check`.

### 2. Facebook Page and Meta app
1. Create a Facebook Page named **AccessPoint** (category: App page). Use `brand/logo/png/app-icon-light.png` as the profile picture.
2. At developers.facebook.com, create an app (type **Business**). Note the **App secret** (App settings > Basic).
3. Add the **Messenger** product. Connect the AccessPoint Page and generate a **Page access token**.
4. Add the **WhatsApp** product. Use the free test number for now. Add your own phone as a recipient. Note the **Phone number ID**. Create a permanent token: Business settings > System users > add a user > generate a token with `whatsapp_business_messaging` (the token on the getting-started page expires in 24 hours).
5. Set the app's Privacy policy URL to `https://<worker>/privacy`, Terms to `/terms`, Data deletion to `/data-deletion`.

### 3. Cloudflare Worker
```
cd bot
wrangler login
wrangler kv namespace create AP_KV          # paste the id into wrangler.toml
wrangler secret put VERIFY_TOKEN             # any long random string
wrangler secret put APP_SECRET
wrangler secret put PAGE_TOKEN
wrangler secret put WA_TOKEN
wrangler secret put WA_PHONE_ID
wrangler secret put MODEL_API_KEY
wrangler secret put AUDIO_URL                # from step 4
wrangler secret put AUDIO_TOKEN
wrangler deploy                              # prints https://accesspoint-bot.<you>.workers.dev
```

### 4. Modal voice-note converter
```
pip install "modal==1.6.2" && modal setup
modal secret create accesspoint-audio AUDIO_TOKEN=<long random string>
modal deploy bot/modal/audio.py              # prints the URL for AUDIO_URL
```

### 5. Webhooks
- Messenger: callback `https://<worker>/webhook`, verify token = `VERIFY_TOKEN`. Subscribe the Page to `messages`, `messaging_postbacks`, `messaging_referrals`.
- WhatsApp: same callback and verify token. Subscribe to `messages`.
- Open `https://<worker>/setup?token=<VERIFY_TOKEN>` once: Get Started, greeting, ice breakers, menu.

### 6. Stickers
- Messenger: `https://m.me/<page-username>?ref=atm` (or `ticket`, `clinic`, `order`, `checkout`, `airport`)
- WhatsApp: `https://wa.me/<number>?text=Hi%20AccessPoint%20%23atm`

## Who can use it before Meta's review
- Messenger: while the app is in Development mode, only people with a role on the app (admins, developers, testers) get replies. Add judges as testers, or submit `pages_messaging` for App Review to open it to everyone.
- WhatsApp test number: up to 5 verified recipient numbers. A real number needs business verification.

## Privacy
Chat state lives 1 hour, photos 10 minutes (for "See where"), PIN-screen and unreadable photos are deleted at once, voice notes are never stored. Typing **delete** removes everything immediately.
