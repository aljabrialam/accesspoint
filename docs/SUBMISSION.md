# Submission form answers

Copy each answer into the form.

---

## Team Name
alamazing

## Team Members
Aljabri Alam

## Which track are you submitting to?
Indie Developer

## Which problem statement did you build towards?
Build for Your World

## Most Viral Track: X post link
https://x.com/aljabrialam/status/2117610935275975156

## Project Description

AccessPoint helps people who struggle with self-service machines (ticket machines, airport and clinic check-in kiosks, self-checkouts, food kiosks) get through them safely: older people, blind and low-vision people, and migrants and tourists who can't read the screen's language. You send a photo of the screen on a chat app and get the next step, in your own language, as text and a spoken voice note. Nothing to install.

**The problem.** Counters were replaced by touchscreens just as the world got older: 1.4 billion people will be over 60 by 2030, 2.2 billion live with a vision impairment, and 281 million live outside the country they were born in, and millions more travel every year (WHO, IOM). Machines that handle money and identity assume you can see, read the language and react quickly. Today the only help is a stranger, who might watch your PIN, or a general chatbot, which might say "press Pay" on a wrong total or guess at a button it can't read.

**What it does.**
- Recognises the machine and reads what the screen is asking ("This looks like an airport check-in kiosk").
- Gives one step at a time, and says where the button is ("Window 14A is in the middle, on the left"), with the person's own photo and the button outlined.
- Asks instead of choosing when the screen offers a choice.
- Stops the person when the screen wants something they didn't ask for: a total that doesn't match (S$42.00 for one S$4.20 item), a transfer, a scam screen.
- Never asks for a PIN; PIN-screen photos are deleted at once.
- Understands voice notes in 25 languages and speaks every reply back.

**How.** Muse Spark reads the photo and returns one step as schema-constrained JSON. SAM 3.1 outlines every button precisely, and code points only where SAM's outline and Muse Spark's reading agree. Muse Voice Transcribe hears spoken answers. Deterministic code, not the model, makes every safety decision, and every safety message is fixed text.

**Guardrails.** Six principles: the person presses every button and AccessPoint only speaks; it fails closed (no step or pointer when anything is uncertain); code decides and models only propose; two independent models must agree before it points; dangerous moments (stop, PIN, unreadable) use fixed human-written text in 6 languages; and it keeps almost nothing. Six layers check every photo: signed and rate-limited input, a strict schema with screen text treated as data, scrubbing of card numbers and PIN codes, a deterministic `decide()` with safety checks first, Spark and SAM agreement, and the person's own press. A red team on the real models (prompt injection, a fake helpline, a hidden transfer, a wrong amount, a blurred photo) ended 5/5 in a safe verdict.

**Where it runs.** A Cloudflare Worker serves Messenger, WhatsApp, Telegram and a web page (`/try`) from the same conversation code. Telegram and `/try` are live today. Messenger and WhatsApp are code complete and tested end to end, and go live after Meta's app review. An iPhone app (Expo) shows the full camera experience in a scripted scenario mode across 8 scenarios.

**Results on the real models (3 Nov 2026).** Muse Spark gave the expected answer on 7/7 test screens. Muse Spark plus SAM 3.1 pointed at the right button 5/5 times; SAM 3.1 alone picked the wrong one of two look-alike buttons, which is why code requires the two models to agree. Muse Voice understood 3/3 spoken answers in English, Tagalog and Indonesian. A red team of 5 screens built to trick the model (prompt injection on the screen, a fake helpline asking for the card number and PIN, a hidden transfer, a wrong amount, a blurred photo) all ended in a safe verdict. 22/22 bot tests and 11/11 app flows pass.

All code was written during the event (27 Oct to 4 Nov 2026). Only open-source tooling (Expo template, fonts under the SIL Open Font License) pre-existed.

## Public GitHub Repository
https://github.com/aljabrialam/accesspoint

## 3-Minute Demo Video
https://youtu.be/ae8K5ZCQfSM

## Describe your use of Meta products to build the submitted project

AccessPoint uses four Meta models, each with one job, plus Meta's messaging platforms.

- **Muse Spark 1.3** (`muse-spark-1.3`, Chat Completions with a strict `json_schema` response format). It reads the person's photo and returns one structured step: the machine type, what the screen says, the options with a rough box for each, the target control with its box, any money shown, and a risk flag (PIN, transfer, suspicious, unclear). It answers in the person's language (we tested English, Tagalog, Bahasa Indonesia and Malay) and reads screens in other languages, such as a Japanese clinic kiosk explained in Tagalog. Muse Spark also drafted the narration of our demo video from a fact sheet; we edited it for accuracy.
- **SAM 3.1** (Responses API, short visual concept prompts like "button" or "card reader", with confidence). It outlines every control in the photo precisely. SAM segments by appearance and can't read labels, so code keeps only the SAM outline that overlaps Muse Spark's box for the named button. The kept outline gives the position words ("in the middle, on the left") and the "See where" image of the person's photo with the button marked.
- **Muse Voice Transcribe** (`muse-voice-transcribe-1.0`, `/asr/transcribe`). It transcribes voice notes, with keyword biasing toward the labels on screen and a language bias from the chat. A Modal service converts Messenger, WhatsApp and Telegram voice notes into the 16 kHz WAV it needs. Code then maps the words to an option; ties are asked again, never guessed.
- **Muse Image.** It generated the artwork on the "Need help? Scan me" machine sticker. Generated pixels are never used to show where to press.
- **Messenger Platform and WhatsApp Cloud API.** The assistant lives in the chat apps people already have. A sticker on the machine opens the chat with the machine already known (`m.me/<page>?ref=atm`, `wa.me/<number>?text=…`). Both channels are implemented and tested end to end: signed webhooks, quick replies, buttons and lists, photo and voice-note download, and voice-note replies.

All model calls are server-side in a Cloudflare Worker (`bot/src/meta.js`); the API key never reaches a client.

## Why are Meta's models important to your solution?

The problem needs three abilities at once, and Meta's models provide all three through one API.

1. **Reading any screen, in any language, and turning it into one safe step.** Every machine is different, and there is no per-machine setup. Muse Spark reads an unfamiliar screen from a phone photo, understands what it's asking, and replies in the person's own language, even when the screen's language is different. Its strict JSON output is what lets our code check every answer before anyone sees it.
2. **Knowing exactly where to press.** A language model on its own can describe a button, but it can't outline it precisely. SAM 3.1 can, but it can't read the label. Together, with code requiring them to agree, they point at the right button: 5 out of 5 in our live test, where SAM alone was wrong on look-alike buttons. That agreement is our main defence against guessing, and it only works because the two models are good at different things.
3. **Hearing people the way they really talk.** Our users are older people, blind people, migrants and tourists. Many would rather speak than type, often mixing languages ("yung window po"). Muse Voice Transcribe's keyword biasing toward on-screen labels and its 25 languages make voice answers usable.

Meta's chat platforms matter just as much: the people who most need help are the least likely to install a new app, but most already have Messenger or WhatsApp.

## Provide feedback from your experience using partner technologies

**Modal (used in production)**

Modal runs AccessPoint's audio service: one Python file (`bot/modal/audio.py`) that converts Messenger, WhatsApp, Telegram and browser voice notes into the 16 kHz WAV that Muse Voice Transcribe needs, and turns every reply into a spoken voice note. A Cloudflare Worker can't run ffmpeg or Python, so Modal was the missing piece.

What worked well:
- **From zero to a deployed endpoint in minutes.** `modal setup` signed us in through the browser, `modal secret create` stored the token, and one file declared everything: a Debian image with `apt_install("ffmpeg")` and `pip_install("edge-tts")`, the function, and the web endpoint. First deploy about 45 seconds; later deploys about 3 seconds.
- **Scale to zero.** The service costs nothing when nobody is talking to the bot, and the hackathon credits covered all our testing.
- **Secrets as environment variables** kept the token out of the code, and constant-time token checks were easy to add.

What cost us time, with suggestions:
- **`@modal.fastapi_endpoint` with a `fastapi.Request` argument** returned 422 "field required" on every call: the request was treated as a query parameter because FastAPI isn't importable on the deploying machine. Switching to `@modal.asgi_app()` with the import inside the function fixed it. A docs example for "endpoint that reads the raw request body" would prevent this.
- **After a redeploy, a warm container kept serving the old code** until we stopped it with `modal container stop`. Draining old containers on deploy, or showing which deployment each container runs, would make this obvious.
- **`modal container stop` needs `-y`** when run from a script; a clearer non-interactive error would help.
- **Cold starts of a few seconds** are noticeable in a chat. A documented pattern for keeping one warm container during waking hours (we plan to use `min_containers` per schedule) would help latency-sensitive bots.

**Baseten and Fireworks (not used in this build)**

We didn't use Baseten or Fireworks. The Meta Model API gave us all four models we needed (Muse Spark, SAM 3.1, Muse Voice Transcribe, Muse Image) behind one key, so there was no need for a second inference provider during the event. Our production plan keeps them in mind: for operators who need photos processed in their own region, AccessPoint could run Meta's open-weight models (such as Muse Spark Open on Baseten) behind the same interface, since all model calls are isolated in `bot/src/meta.js`. We didn't test that path, so we can't give hands-on feedback on either platform.

---

## X post copy (Most Viral Track)

X allows 280 characters on a standard account, and every link counts as 23. Post the video with the main post, then add the reply.

**Main post (275/280, attach `demo/accesspoint-x.mp4`)**

```
Stuck at a machine? Send a photo. Get the next step.

AccessPoint guides older, blind and migrant users through ticket machines and kiosks, in their language. It stops wrong totals and never needs your PIN.

Built on @AIatMeta Muse Spark and SAM 3.1.

https://accesspoint-bot.aljabrialam.workers.dev/try
```

**Reply to your own post (220/280)**

```
How it works: Muse Spark reads the photo, SAM 3.1 outlines the button, and code points only where both agree. Muse Voice hears replies in 25 languages.

Open source: https://github.com/aljabrialam/accesspoint

#MetaHackathon #Accessibility
```

Before posting: check the hackathon's official hashtag and Meta AI's X handle, and swap them in if they differ.
