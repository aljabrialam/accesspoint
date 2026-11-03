# API and model contracts

Everything the Worker exposes, and exactly how it calls each model. Code: `bot/src/`.

Base URL: `https://accesspoint-bot.aljabrialam.workers.dev`

## 1. HTTP endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | none | Home page |
| GET | `/privacy`, `/terms`, `/data-deletion` | none | Policy pages (used for Meta app review) |
| GET | `/try` | none | Web test console (`?m=<machine>` preselects the machine) |
| POST | `/try/api` | rate limit 10/min per IP | One conversation turn from the web console |
| GET | `/see/<id>` | id is random, expires in 10 min | The person's photo with the agreed button outlined |
| GET | `/img/<id>` | same | The raw photo for `/see` |
| GET | `/webhook` | `hub.verify_token = VERIFY_TOKEN` | Meta webhook verification (Messenger and WhatsApp) |
| POST | `/webhook` | `X-Hub-Signature-256` HMAC with `APP_SECRET` (or `WA_APP_SECRET`) | Messenger (`object: page`) and WhatsApp (`object: whatsapp_business_account`) events |
| POST | `/telegram` | `X-Telegram-Bot-Api-Secret-Token` (derived from `TG_TOKEN`) | Telegram updates |
| GET | `/setup?token=VERIFY_TOKEN` | token | Sets Messenger Get Started, greeting, ice breakers, persistent menu |
| GET | `/tgsetup?token=VERIFY_TOKEN` | token | Sets the Telegram webhook, commands and description |

Webhook POSTs answer `200` straight away; the conversation runs in `ctx.waitUntil`. Message ids are kept 10 minutes so platform retries are handled once.

### `POST /try/api`

`multipart/form-data`:

| Field | Values |
|---|---|
| `sid` | Session id, `[a-z0-9]{16,40}` (generated in the browser) |
| `kind` | `start`, `text`, `choice`, `image`, `audio`, `sample` |
| `text` | For `text` (max 500 characters) |
| `id` | For `choice`: an option id such as `L:en`, `OPT:0`, `DONE`, `REPEAT`, `START`, `HELP`, `LANG` |
| `file` | For `image` and `audio` (max 8 MB) |
| `sample` | For `sample`: `airport-passport`, `airport-seat`, `ticket-trip`, `checkout-overcharge`, `kiosk-pin`, `clinic-jp`, `checkout-scan` |
| `ref` | For `start`: a machine type |

Response:

```json
{ "replies": [ { "text": "Press \"Window 14A\". \"Window 14A\" is in the middle, on the left.",
    "choices": [{ "title": "Done", "id": "DONE" }, { "title": "Repeat", "id": "REPEAT" }],
    "link": { "title": "See where", "url": "https://…/see/0u6z242v270w3v31?l=en" },
    "audio": "data:audio/mpeg;base64,…" } ] }
```

## 2. The conversation interface

Every channel adapts to one interface (`converse.js`):

```
io:    { channel, user, say(reply), sayVoice?(bytes, format), voiceFormat?, typing?(), fetchMedia(media) }
input: { kind: "text" | "choice" | "image" | "audio" | "start", text?, id?, media?, ref? }
reply: { text, choices?: [{ title, id }], link?: { title, url }, list?, next? }
```

Adding a channel means writing an input parser and an `io` object; the conversation, guardrails and models don't change.

## 3. Muse Spark: one step from a photo

```
POST https://api.meta.ai/v1/chat/completions
{
  "model": "muse-spark-1.3",
  "reasoning_effort": "low",
  "messages": [
    { "role": "system", "content": "<planPrompt(): rules, language, goal, previous step>" },
    { "role": "user", "content": [
      { "type": "text", "text": "Here is the photo of the machine screen." },
      { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,…" } } ] }
  ],
  "response_format": { "type": "json_schema", "json_schema": { "name": "accesspoint_step", "schema": PLAN_SCHEMA, "strict": true } }
}
```

A real response (airport seat screen, English):

```json
{ "machine": "airport", "machine_name": "an airport self check-in kiosk", "readable": true,
  "screen_type": "choice", "screen_says": "The screen asks to Choose your seat for Flight SQ 943.",
  "options": [ { "label": "Window 14A", "meaning": "Window seat 14A", "box": { "x1": 200, "y1": 430, "x2": 490, "y2": 535 } }, … ],
  "action": { "kind": "ask_user", "target_label": "", "target_concept": "", "target_box": { "x1": 0, "y1": 0, "x2": 0, "y2": 0 }, "location_hint": "" },
  "instruction": "Tell me which seat you want to pick.", "question": "Which seat do you want: Window 14A, Aisle 14C, or Keep my seat?",
  "money": { "amount": "", "is_transfer": false }, "progress": "first", "risk": "none" }
```

Field meanings and the decision order: [ARCHITECTURE.md §3–4](ARCHITECTURE.md#3-muse-sparks-contract).

## 4. SAM 3.1: outlines by visual concept

```
POST https://api.meta.ai/v1/responses
{ "model": "sam-3.1",
  "input": [ { "type": "message", "role": "user", "content": [
    { "type": "input_text", "text": "button" },
    { "type": "input_image", "image_url": "data:image/jpeg;base64,…" } ] } ],
  "metadata": { "include_confidence": "true" } }
```

The output text holds one record per object:

```
<0f>1<|box;x1=240;y1=387;x2=586;y2=480;w=1200;h=900;c=0.82|><|mask;…|>,2<|box;…|>
```

`parseSamBoxes()` reads the boxes; outlines under confidence 0.5 are dropped; `agree()` keeps the one that matches Muse Spark's box. Prompt with what the object looks like ("button", "card reader"), never its label text: SAM can't read.

## 5. Muse Voice Transcribe

```
POST https://api.meta.ai/v1/asr/transcribe      (multipart)
request = { "model": "muse-voice-transcribe-1.0", "audioEncoding": "WAV", "mode": "PUSH_TO_TALK",
            "languageBias": ["Tagalog"], "keywords": ["Window 14A", "Aisle 14C", "done", "repeat", "cancel"] }
audio   = 16 kHz mono WAV
→ text/plain: "yung window po,"
```

## 6. Muse Image

```
POST https://api.meta.ai/v1/images/generations
{ "model": "muse-image-1.0", "prompt": "<sticker art description>", "size": "1024x1024" }
→ { "data": [ { "b64_json": "<WebP>" } ] }
```

Used only for the sticker artwork (`brand/sticker/`).

## 7. Audio service (Modal)

| Method | Path | Body | Returns |
|---|---|---|---|
| POST | `/` | Raw voice note bytes (AAC, OGG/Opus, WebM, MP3) | 16 kHz mono WAV |
| POST | `/speak` | `{ "text", "lang": "en|tl|id|ms|zh|es", "format": "ogg|mp3" }` | Speech (OGG/Opus for voice notes, MP3) |

Both need `Authorization: Bearer <AUDIO_TOKEN>`; a wrong token gets `403`. Nothing is written to disk.

## 8. Secrets

| Name | Used for |
|---|---|
| `MODEL_API_KEY` | Meta Model API |
| `VERIFY_TOKEN` | Meta webhook verification; `/setup`, `/tgsetup` |
| `APP_SECRET`, `WA_APP_SECRET` | Webhook signatures |
| `PAGE_TOKEN` | Messenger Send API |
| `WA_TOKEN`, `WA_PHONE_ID` | WhatsApp Cloud API |
| `TG_TOKEN` | Telegram Bot API |
| `AUDIO_URL`, `AUDIO_TOKEN` | Modal audio service |

All are Cloudflare Worker secrets (`bot/scripts/push-secrets.sh` copies them from the git-ignored `.env` files without printing them).
