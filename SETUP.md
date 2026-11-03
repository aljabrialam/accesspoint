# AccessPoint setup: Page, Meta app, Messenger, WhatsApp, Modal

Step by step, from nothing to a live bot. Tick the boxes as you go.

**Rule throughout:** never paste keys or tokens into a chat, an issue or a commit. Each one goes on its own line in `.env.local` at the project root (git-ignored), except `MODEL_API_KEY`, which goes in `.env`.

## Status

| Step | What | Who | Status |
|---|---|---|---|
| 0 | Worker deployed, KV created, `VERIFY_TOKEN` and `AUDIO_TOKEN` set | Devin | ✅ Done (3 Nov) |
| 1 | Meta Model API key | Aljabri | ✅ Done (3 Nov): all four models tested live |
| 2 | Facebook Page | Aljabri | ⬜ |
| 3 | Meta app | Aljabri | ⬜ |
| 4 | Messenger connected | Aljabri | ⬜ |
| 5 | WhatsApp connected | Aljabri | ⬜ |
| 6 | Modal voice-note converter | Devin | ✅ Done (3 Nov): AAC and OGG → 16 kHz WAV tested, wrong token refused |
| T | Telegram test bot (optional, no Meta account needed) | Both | ✅ Connected (3 Nov): https://t.me/accesspointhelpbot |
| 7 | Secrets on the Worker, `/setup`, test messages | Devin | ⬜ |
| 8 | Tested on a phone, footage recorded for the video | Both | ✅ Telegram tested on a phone; video published: https://youtu.be/ae8K5ZCQfSM |

**Critical path:** steps 1 and 7. If time runs short, Messenger plus the Meta Model API key is enough for a live demo; WhatsApp and Modal can follow.

## Values to collect

| Name | Where it comes from | File | Status |
|---|---|---|---|
| `MODEL_API_KEY` | dev.meta.ai dashboard (step 1) | `.env` | ✅ (also on the Worker) |
| `APP_SECRET` | App settings → Basic (step 3) | `.env.local` | ⬜ |
| `PAGE_TOKEN` | Messenger API Settings (step 4) | `.env.local` | ⬜ |
| `WA_PHONE_ID` | WhatsApp → API Setup (step 5) | `.env.local` | ⬜ |
| `WA_TOKEN` | System user token (step 5) | `.env.local` | ⬜ |
| `WA_APP_SECRET` | Only if WhatsApp needed its own app (step 3.3 / 5.5) | `.env.local` | optional |
| `TG_TOKEN` | @BotFather (step T, optional) | `.env.local` | ✅ (also on the Worker) |
| `AUDIO_URL` | `modal deploy` output (step 6) | `.env.local` | ✅ (also on the Worker) |
| `VERIFY_TOKEN` | Already generated | `.env.local` | ✅ (also on the Worker) |
| `AUDIO_TOKEN` | Already generated | `.env.local` | ✅ (also on the Worker and in Modal) |

Live URLs:
- Bot service: https://accesspoint-bot.aljabrialam.workers.dev
- Webhook (Messenger and WhatsApp): `https://accesspoint-bot.aljabrialam.workers.dev/webhook`
- Privacy / Terms / Data deletion: `/privacy`, `/terms`, `/data-deletion` on the same host

---

## Step 1. Meta Model API key

Do this first: it unblocks the real model check.

- [ ] Sign in at **dev.meta.ai** and open the Dashboard
- [ ] Claim the hackathon credits and add a card if asked
- [ ] Create an API key
- [ ] Add it to `.env` at the project root: `MODEL_API_KEY=...`
- [ ] Run the real check (or ask Devin to): `cd bot && npm run live-check`

Expected: 5 clean machine screens, each with the expected verdict (choice, stop, pin, step, choice).

## Step 2. Facebook Page

Use the computer (facebook.com in Chrome), signed in to your own Facebook account. The Page belongs to your account; you stay its admin.

**2.1 Create the Page**
- [ ] Go to **https://www.facebook.com/pages/create**
  (or: click your profile picture top right → **See all profiles** → **Create new profile or Page** → **Page**)
- [ ] **Page name:** `AccessPoint`
- [ ] **Category:** type `App page` and pick it. If it doesn't appear, type `Software` and pick that.
- [ ] **Bio:** `Stuck at a machine? Send a photo of the screen and get the next step, in your language. For ATMs, ticket machines and kiosks.`
- [ ] Click **Create Page**

**2.2 Finish the Page setup screens** (Facebook walks you through these right after creating it)
- [ ] **Contact and location:** skip, or add your email. Leave address empty.
- [ ] **Profile picture:** upload `brand/logo/png/app-icon-light.png` from the project folder
- [ ] **Cover photo:** upload `docs/cover/accesspoint-cover.jpg`
- [ ] **Connect WhatsApp:** skip this here (we connect WhatsApp through the developer app in step 5)
- [ ] **Invite friends:** skip
- [ ] Click **Done**

**2.3 Switch into the Page and set its username**
- [ ] Click your profile picture top right → choose **AccessPoint** to switch into the Page
- [ ] Open **Settings & privacy → Settings → Page setup** (on some accounts: **Edit Page → Username**)
- [ ] Set the **username**, for example `accesspoint.help` or `accesspointbot`. If it's taken, try another; letters, numbers and dots only.
- [ ] Open `https://m.me/<username>` in a browser: it should open a Messenger chat with AccessPoint

**2.4 Make sure messages are on**
- [ ] While switched into the Page: **Settings → Messaging** (or **Page settings → Messaging**): messages are allowed for the Page
- [ ] Switch back to your own profile when done (profile picture → your name). The rest of the setup uses your personal account.

Page username: `__________` (sticker link: `https://m.me/<username>?ref=atm`)

## Step 3. Meta app

**3.1 Developer account** (skip if you've built Meta apps before; you have, for ALAM mo ba?)
- [ ] Go to **https://developers.facebook.com** and click **Get started** or **Log in** with the same Facebook account

**3.2 Create the app with the Messenger use case**
- [ ] Go to **https://developers.facebook.com/apps** → **Create app**
- [ ] **App details:** app name `AccessPoint`, app contact email = your email → **Next**
- [ ] **Use cases:** select **Engage with customers on Messenger from Meta** → **Next**
  (if instead you see app types, pick **Business** → **Next**)
- [ ] **Business:** select **I want to connect a business portfolio** and either pick an existing one or **Create a business portfolio** named `AccessPoint` (business name, your name and email) → **Next**
- [ ] **Requirements:** read and click **Next**
- [ ] **Overview:** check it, click **Create app**, enter your Facebook password if asked

**3.3 Add the WhatsApp use case to the same app**
- [ ] In the app dashboard, left menu → **Use cases** → **Add use case** (or the **+** button)
- [ ] Select **Connect with customers through WhatsApp** → **Add**
- [ ] If Meta says a WhatsApp app must be its own app: create a **second app** later in step 5 (same steps as 3.2, use case **Connect with customers through WhatsApp**, same business portfolio) and use its secret as `WA_APP_SECRET`. The bot accepts both.

**3.4 App settings**
- [ ] Left menu → **App settings → Basic**
- [ ] **App secret:** click **Show**, enter your password, copy it into `.env.local` as `APP_SECRET=...`
- [ ] **Privacy policy URL:** `https://accesspoint-bot.aljabrialam.workers.dev/privacy`
- [ ] **Terms of service URL:** `https://accesspoint-bot.aljabrialam.workers.dev/terms`
- [ ] **User data deletion:** choose **Data deletion instructions URL** → `https://accesspoint-bot.aljabrialam.workers.dev/data-deletion`
- [ ] **App icon (1024 × 1024):** `brand/logo/png/app-icon-light.png`
- [ ] **Category:** Utilities (or Productivity)
- [ ] Click **Save changes** at the bottom
- [ ] Copy the **App ID** from the top of the page into the blank below

App ID: `__________`

The app stays in **Development** mode. That is fine: everyone with a role on the app (you, plus testers) can use the bot. Don't switch it to Live yet.

## Step 4. Messenger

**4.1 Open the Messenger settings**
- [ ] App dashboard → left menu **Use cases** → **Engage with customers on Messenger from Meta** → **Customize**
  (older dashboards: left menu **Messenger → Messenger API Settings**)

**4.2 Give the app the permissions it needs**
- [ ] Under **Permissions**, make sure these are added (click **Add** next to any that aren't): `pages_messaging`, `pages_manage_metadata`, `pages_show_list`, `pages_read_engagement`

**4.3 Connect the Page and get the Page token**
- [ ] Section **Generate access tokens** → **Connect** (or **Add Page**)
- [ ] In the Facebook popup: continue as yourself → tick the **AccessPoint** Page → **Next** → leave all permissions on → **Save** → **Got it**
- [ ] Back in the dashboard, next to AccessPoint click **Generate** → tick **I understand** → **Copy**
- [ ] Paste it into `.env.local` as `PAGE_TOKEN=...` (it starts with `EAA`). This token doesn't expire.

**4.4 Webhook** (where Meta sends messages: our Worker)
- [ ] Section **Configure webhooks** → **Callback URL:** `https://accesspoint-bot.aljabrialam.workers.dev/webhook`
- [ ] **Verify token:** open `.env.local`, copy the long value after `VERIFY_TOKEN=`, paste it here
- [ ] Click **Verify and save**. It should save without an error. If it fails, check the URL ends in `/webhook` and the token has no spaces, then tell Devin the exact error text.

**4.5 Subscribe the Page to the right events**
- [ ] Still under webhooks, next to the AccessPoint Page click **Add subscriptions**
- [ ] Tick **messages**, **messaging_postbacks**, **messaging_referrals** → **Confirm**

**4.6 Who can use it**
- [ ] Left menu **App roles → Roles** → **Add people** → **Testers** → type the person's Facebook name (or their Facebook profile link) → **Add**
- [ ] Each tester accepts at **https://developers.facebook.com/requests** (they need to be signed in; they may have to register as a developer once, which is free)
- [ ] You're the app admin, so you can test straight away.

**4.7 Quick check**
- [ ] On your phone, open Messenger and message the AccessPoint Page "hi". Nothing will reply until Devin finishes step 7, but the message must reach the Page inbox.

While the app is in Development mode, only people with a role on the app get replies. Opening it to everyone needs App Review for `pages_messaging` (takes days; not needed for the hackathon video).

## Step 5. WhatsApp

You need: a phone with WhatsApp (your own number is fine as the *recipient*). Meta gives you a free test number to send from.

**5.1 Open WhatsApp setup**
- [ ] App dashboard → **Use cases** → **Connect with customers through WhatsApp** → **Customize** → **Quickstart** → **Start using the API**
  (if you made a separate WhatsApp app in 3.3, open that app)
- [ ] You land on **API Setup**

**5.2 Connect a WhatsApp Business account**
- [ ] In **API Setup**, if asked to connect a Messaging account: pick the one Meta created with your business portfolio, or click **Create a WhatsApp Business account** and follow the prompts (name it `AccessPoint`)

**5.3 Test number and your phone**
- [ ] **From:** Meta's test number is preselected. Copy the **Phone number ID** shown under it into `.env.local` as `WA_PHONE_ID=...` (it's a long number, not the phone number itself)
- [ ] Also write the test phone number itself (digits only, with country code) in the blank below
- [ ] **To:** click **Manage phone number list** → **Add phone number** → enter your mobile number with country code (e.g. `+65 9123 4567`) → enter the 6-digit code WhatsApp sends you
- [ ] Click **Send message**: you should receive a "Hello World" WhatsApp message from the test number. **Reply "hi"** to it (this opens the 24-hour window that lets the bot reply freely)

**5.4 Permanent token** (the token on API Setup expires in about 24 hours)
- [ ] Go to **https://business.facebook.com/latest/settings** → make sure the **AccessPoint** business portfolio is selected (top left)
- [ ] Left menu **Users → System users** → **Add** → name `accesspoint-bot`, role **Admin** → **Create system user**
- [ ] With `accesspoint-bot` selected: **Assign assets**
  - [ ] **Apps** → your AccessPoint app → toggle **Manage app** (Full control)
  - [ ] **WhatsApp accounts** → AccessPoint → toggle **Manage WhatsApp Business accounts** (Full control)
  - [ ] **Assign assets**
- [ ] **Generate token** → choose the AccessPoint app → expiry **Never** → permissions `business_management`, `whatsapp_business_messaging`, `whatsapp_business_management` → **Generate token** → **Copy**
- [ ] Paste it into `.env.local` as `WA_TOKEN=...`

**5.5 Webhook**
- [ ] App dashboard → WhatsApp use case → **Configuration** (left menu)
- [ ] **Callback URL:** `https://accesspoint-bot.aljabrialam.workers.dev/webhook`
- [ ] **Verify token:** the same `VERIFY_TOKEN` value as Messenger → **Verify and save**
- [ ] **Webhook fields** → **Manage** → **Subscribe** to `messages` → **Done**
- [ ] If this is a separate WhatsApp app: copy its **App settings → Basic → App secret** into `.env.local` as `WA_APP_SECRET=...`

Test number (digits only): `__________` (sticker link: `https://wa.me/<number>?text=Hi%20AccessPoint%20%23atm`)

Up to 5 phone numbers can be added under **To** while using the test number. A real number needs business verification and is not needed for the hackathon.

## Step 6. Modal voice-note converter

**Done.** Live at `https://aljabrialam--accesspoint-audio-wav.us-east.modal.run` (POST with `Authorization: Bearer <AUDIO_TOKEN>`). To redeploy after changes: `python3 -m modal deploy bot/modal/audio.py`.

From the project root, in your terminal (`modal setup` opens a browser to sign in):

```
python3 -m pip install --user "modal==1.6.2"
python3 -m modal setup
python3 -m modal secret create accesspoint-audio AUDIO_TOKEN="$(grep ^AUDIO_TOKEN= .env.local | cut -d= -f2-)"
python3 -m modal deploy bot/modal/audio.py
```

- [ ] Copy the printed `https://….modal.run` URL → `.env.local`: `AUDIO_URL=...`

## Step T. Telegram test bot (optional, fastest)

Same conversation code as Messenger and WhatsApp, but no Meta app, Page or review needed. Use it to test photos, voice notes and buttons on your phone while the Meta setup is pending. It is a test channel; the submission stays Messenger and WhatsApp.

- [ ] In Telegram, open **@BotFather** (the one with the blue tick) → send `/newbot`
- [ ] Name: `AccessPoint` · Username: something ending in `bot`, e.g. `AccessPointHelpBot`
- [ ] BotFather replies with a token like `123456789:AA...`. Copy it into `.env.local` as `TG_TOKEN=...` (never into a chat)
- [ ] Optional, in BotFather: `/setuserpic` → choose your bot → send `brand/logo/png/app-icon-light.png`
- [ ] Tell Devin "telegram in". Devin pushes the token, opens `/tgsetup?token=<VERIFY_TOKEN>` (webhook, menu, description) and sends you the bot link
- [ ] Open the bot, tap **Start**, pick a language, send a photo of a machine (or of `bot/test/fixtures/screens.html?s=atm-account` on your laptop)

Real answers to photos still need `MODEL_API_KEY` (step 1).

## Step 7. Worker secrets and Messenger profile (Devin)

Tell Devin "all in". Devin then:

- [ ] Copies each value from `.env` / `.env.local` to the Worker: `bot/scripts/push-secrets.sh` (values never printed)
- [ ] Redeploys: `cd bot && wrangler deploy`
- [ ] Opens `https://accesspoint-bot.aljabrialam.workers.dev/setup?token=<VERIFY_TOKEN>` once: Get Started, greeting, ice breakers, menu
- [ ] Sends test messages and checks the Worker logs (`wrangler tail`)

## Step 8. Test on a phone

- [ ] No sticker: open the AccessPoint chat and send a photo first; after you pick a language it should say "This looks like an ATM" and answer that photo
- [ ] Messenger: open `https://m.me/<page-username>?ref=atm`, pick a language, type "withdraw S$100"
- [ ] WhatsApp: open `https://wa.me/<number>?text=Hi%20AccessPoint%20%23atm`
- [ ] On the laptop, open `bot/test/fixtures/screens.html?s=atm-account` and photograph the screen with the phone. Then:
  - [ ] `?s=atm-account`: asks Savings or Current; answer with a voice note "savings"
  - [ ] `?s=atm-transfer`: stops you and says press Cancel
  - [ ] `?s=atm-pin`: the PIN message
  - [ ] `?s=airport-seat`: a choice of seats
  - [ ] `?s=checkout-scan` in Bahasa Indonesia: one step, with "See where"
- [ ] Screen-record the phone for the demo video

## Troubleshooting

| Problem | Check |
|---|---|
| "Verify and save" fails | The verify token must match `VERIFY_TOKEN` exactly; the URL must end in `/webhook`. Share the error text, never the token |
| No reply on Messenger | Your account has a role on the app; the Page is subscribed to `messages`; run `wrangler tail` while you send a message |
| No reply on WhatsApp | Your number is added under **To**; the webhook field `messages` is subscribed; `WA_TOKEN` hasn't expired |
| Voice note says "couldn't understand" | `AUDIO_URL` and `AUDIO_TOKEN` are set on the Worker; the Modal app is deployed |
| "Something went wrong on my side" | `MODEL_API_KEY` is set and has credits; `wrangler tail` shows the API error |
