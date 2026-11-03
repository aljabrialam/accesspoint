# AccessPoint (Meta Global AI Developer Hackathon entry)

- `BRAINSTORM.md` (local only, git-ignored): idea history and the chosen direction. `demo/SCRIPT.md`: timed video script.
- `mobile/`: the Expo app. See `mobile/AGENTS.md` for running, scenarios and Maestro tests.

## Documentation

- `docs/README.md` indexes ARCHITECTURE, API, PRODUCTION, GUARDRAILS, PRIVACY-SECURITY, TESTING, SCREENS, BRAND, SUBMISSION. Keep numbers in README, TESTING and SUBMISSION in sync when results change.
- Audience wording (owner, 3 Nov): "older people, blind and low-vision people, and migrants and tourists".
- Screens: `docs/screens/` (README picks), `docs/screens/app/` (all 43 Maestro screenshots), chat crops from the 4K video, `/try` shots from a live Playwright run. Sticker: `docs/sticker/sticker.html` → `sticker.png`.

## Live product: the Messenger + WhatsApp bot (`bot/`)

- Owner decision (3 Nov): the bot is the main live product; the iPhone app is the polished concept/demo. Channels: Messenger and WhatsApp (not Telegram).
- Cloudflare Worker `accesspoint-bot`, live at https://accesspoint-bot.aljabrialam.workers.dev (webhook `/webhook`, setup `/setup?token=VERIFY_TOKEN`, marked photo `/see/<id>`). KV `AP_KV` id `e40298d1713b4d44b41007ed063bdec7`.
- Models (all on https://api.meta.ai/v1 with `MODEL_API_KEY`): Muse Spark `muse-spark-1.3` via Chat Completions with `response_format` json_schema (plan); SAM 3.1 `sam-3.1` via Responses API, concept prompt, `metadata.include_confidence` (verify + box); Muse Voice `muse-voice-transcribe-1.0` at `/asr/transcribe`, WAV only (Modal `bot/modal/audio.py` converts AAC/OGG); Muse Image only for sticker art.
- Safety texts are fixed strings in `bot/src/strings.js` (en, tl, id, ms, zh, es); `decide()` in `bot/src/guard.js` gates every model output. Never let a model write the PIN, stop or unreadable messages.
- `/try` (`bot/src/try.js`): public web test console running the same `converse()` (channel `web`); sample screens load from the repo's `bot/test/fixtures` on GitHub; rate limit binding `TRY_LIMIT` (10/min per IP). Judges' fallback while Messenger needs app review.
- Telegram (`/telegram`, `/tgsetup?token=VERIFY_TOKEN`, secret `TG_TOKEN`): test channel only, added 3 Nov while the owner's Meta developer account was under an identity check. Webhook secret header is derived from the token. Not part of the submission story.
- Spoken replies: every reply is also sent as a voice note (Telegram/WhatsApp OGG, Messenger and /try MP3) from Modal `/speak` (edge-tts 7.3.1, same voices as the app, 3 retries because Microsoft sometimes returns no audio). Best effort: text always first. "voice off"/"voice on" per chat. Privacy page says reply text goes to Microsoft TTS.
- Red team (3 Nov, live): 5/5 safe (prompt injection, fake helpline, hidden transfer, wrong amount, blur); fixtures `redteam-*` in `bot/test/fixtures/`. `scrub()`/`sanitizePlan()` filter all model text.
- Live model check (3 Nov): Muse Spark 7/7 expected verdicts on the non-bank fixtures. SAM 3.1 segments by appearance and can't read labels ("Savings button" returned both buttons, Current more confident), so Spark returns a rough box per option/target (thousandths) and `agree()` keeps the SAM box that overlaps it: 5/5 correct live. Ask SAM for visual concepts only ("button", "card reader"), never label text. `MODEL_API_KEY` is on the Worker.
- Owner decision (3 Nov): banking is sensitive, so lead with non-bank machines everywhere (hero: Amara's airport check-in). PIN and money guardrails stay, shown on payment kiosks.
- Commands: `cd bot && npm test` (22 tests), `npm run live-check` (real API on `test/fixtures/*.jpg`, clean screens rendered from `screens.html`), `wrangler deploy`. Setup steps: `bot/README.md`.
- Secrets already set on the Worker: VERIFY_TOKEN, AUDIO_TOKEN (copies in root `.env.local`). Also set: MODEL_API_KEY, AUDIO_URL, TG_TOKEN. Still needed: APP_SECRET, PAGE_TOKEN, WA_TOKEN, WA_PHONE_ID (Meta account under identity check on 3 Nov).

## Entry point: the machine sticker

- A stranger starts from a "Need help? Scan me" sticker on the machine. Its QR encodes the deep link `accesspoint://start/<scenario id>` (route `mobile/src/app/start/[machine].tsx`): one screen, one big Start button, language and speed pickers, PIN promise. Start replaces itself with the guide.
- Regenerate a sticker QR: `npx -y qrcode@1.5.4 -t svg -m 1 -c "#101828" -o demo/video/assets/qr-atm.svg "accesspoint://start/atm"`; verify it with `swift docs/qr/decode.swift file.png` (Core Image).
- "No install" needs an App Clip (or web build), which is not built yet. Always label it "planned for launch"; the video sticker card does.
- Maestro flow `11-sticker-start.yaml`; the video's Demo 1 now opens on this screen.

## Guardrails

- `docs/GUARDRAILS.md` is the source of truth for what each Meta model may and may not do (SAM 3.1, Muse Spark, Muse Voice Transcribe, plus code). Every guardrail is marked **Built** (working in scenario mode, tested) or **Live pipeline** (designed, not yet enforced). Never present a Live pipeline guardrail as working.
- The app shows the same list on the "How we keep you safe" screen (`mobile/src/safety/guardrails.ts`, route `/safety`, Maestro flow `10-safety-screen.yaml`). The video has a "Guardrails on every model" scene after the architecture scene. Keep all three in sync.
- New Expo Router route files need a full app reload in Expo Go (Fast Refresh doesn't register them).

## Brand (`brand/`)

- Logo: "Braille A", the letter A in braille (one solid dot in a six-dot cell).
- Palette "Cobalt" (owner picked it over Lagoon and Graphite and Sun, `brand/palettes.html`): Cobalt `#2B47C9` (brand, every action, the mark), Amber `#FFB224` (only the target in the camera view), Ink `#101828`, Mist `#F4F6FB`, Night `#7B8FF5` (mark on dark), Go `#12805C`, Stop `#D92D20`. The yellow "Paving" palette was rejected; don't bring it back.
- Type: Atkinson Hyperlegible Next (OFL, Braille Institute, `brand/fonts/`) for the brand, board and video; SF Pro inside the iOS app.
- `python3 brand/build_brand.py` rebuilds every logo SVG (outlined wordmark via fontTools 4.67.0, no live text) and the 1024 app icons in `brand/logo/`. `brand/logo/export/` has favicons and web icons. Below 32 px use `mark-small-*` (solid dots).
- `brand/board.html?s=1..6` is the six-slide brand basics board; PNGs in `brand/kit/` (render with Chrome headless, `--virtual-time-budget=8000 --window-size=1920,1080`).
- App: tokens in `mobile/src/theme.ts` (`colors.brand` for actions, `colors.signal` only for camera targets); `BrandMark` is generated from the same geometry. Visible copy avoids em and en dashes.

## Demo video (3 Nov rebuild)

- Structure: title, hero, brand, problem, how it works (all four Meta models), guardrails, app demos (airport from the sticker, ticket for a blind user), safety (self-checkout overcharge, glare), chat scenes (Telegram live, WhatsApp and Messenger labelled previews), scenario grid, live results, close with a QR to /try. 2:57, 3840x2160.
- Narration drafted by Muse Spark: `node demo/video/spark-script.mjs` → `spark-script.json`; the edited lines live in `build.py`.
- Chat scenes replay real bot replies: `node demo/video/capture-chats.mjs` runs `bot/src/converse.js` against the real models and voice service and writes `demo/video/assets/chat/*.json` + voice mp3s. `CHATS` in `build.py` sets which messages show when. Re-capture after changing bot strings.
- Sticker art in the video and `brand/sticker/` comes from Muse Image.
- Subtle screen changes (ticket hand guidance) need a per-demo `scene=0.01` threshold.
- Maestro `visible:` is a full-text regex: escape `$` or use `.*partial.*`.

## Demo video pipeline (`demo/`)

Needs Metro running (`cd mobile && npx expo start`) with the app open in Expo Go on the booted simulator.

`demo/video/build.py` is the single source of truth: scenes, narration lines, and per-demo beats (narrator line, app line, tap, voice reply, panel status).

1. `cd demo/video && python3 build.py flows` writes paced Maestro flows into `demo/flows/` (pauses sized to the real audio).
2. `demo/record-clips.sh [names]` records raw simulator clips with `simctl recordVideo`.
3. `python3 build.py timeline` converts clips to 30 fps CFR, finds taps by scene change (score > 0.05; button-press flashes are ~0.016, ignore them), lays out audio after each tap, voices the narrator and Amara with edge-tts, mixes `mix.wav` (app lines use the exact clips from `mobile/assets/voice` with a light phone EQ), writes `timeline.js`, and fails if the cut is over 178.5 s or a take is missing a step change (re-record that clip).
4. `node render.mjs` renders `index.html` at 4K (deviceScaleFactor 2) and streams JPEG frames straight into ffmpeg as `base.mp4` (Google Chrome via Playwright `channel: 'chrome'`, ~7 min); `--stills 60,90` writes 1080p review stills.
5. `python3 build.py compose` writes `demo/accesspoint-demo.mp4` at 3840x2160: full-resolution simulator clips, masked to rounded screen corners (`assets/screen-mask@2x.png`), inside `assets/phone-frame@2x.png`, plus audio. Layout coordinates are 1080p values times `K = 2`.

Background music is original, synthesised by `demo/video/music.py` (pure Python + ffmpeg, no samples, so no licensing issues). `build.py timeline` renders it to the cut's length and ducks it under all speech; `MUSIC_GAIN` in `build.py` sets its level (0.2 is about 6 dB under the voices). Intro/outro scene lengths follow their narration automatically (`LINE_GAP`, `TAIL`); in-scene animation times come from each scene's `marks` in `timeline.js`.

If you change spoken text in the app: `npm run voice:generate` in `mobile/` first, then update the matching `app` beats in `build.py`.
