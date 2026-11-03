# Demo video script

**Video:** [youtu.be/ae8K5ZCQfSM](https://youtu.be/ae8K5ZCQfSM) · 2:57 · 3840×2160 · captions and chapters on YouTube

This table is generated from the published video's timeline (`demo/video/timeline.json`), so it matches the video exactly. The narration was drafted by Muse Spark (`demo/video/spark-script.mjs` → `spark-script.json`) and edited for accuracy; voices are Microsoft Edge neural voices. App lines are the app's own spoken guidance; chat scenes replay real bot replies captured with `demo/video/capture-chats.mjs`.

| Time | Scene | Spoken (narrator, app, person) | On-screen honesty label |
|---|---|---|---|
| 0:00 | Title | (no voice) |  |
| 0:02 | Hook | I can’t read this screen. Help me. Many people feel this, every day. |  |
| 0:08 | Brand | AccessPoint. Stuck at a machine? Send a photo. |  |
| 0:12 | Problem | Machines replaced the counters, just as the world grew older. And a chatbot that guesses can press the wrong button. |  |
| 0:20 | How it works | Muse Spark reads the photo and plans one step. SAM 3.1 outlines every button precisely. Muse Voice hears you in twenty-five languages. And code points only where both models agree. | All four Meta models tested live |
| 0:34 | Guardrails | It never needs your PIN, and never guesses. It stops wrong totals. You press every button. | Enforced in code, tested |
| 0:42 | App demo 1: first flight, from a sticker | Amara scans the sticker on the kiosk. One button. **AccessPoint:** “Put your passport on the glass below the screen, photo page down.” **AccessPoint:** “It found Amara Okafor, flying to Singapore. Is that you?” **Amara:** “Yes, that’s me.” **AccessPoint:** “Would you like a window seat, or an aisle seat?” **Amara:** “Window.” **AccessPoint:** “Your boarding pass is printing on the right. Gate C twenty two.” | Scenario mode, demo kiosk we built |
| 1:18 | App demo 2: finding the slot, without sight | Daniel is blind. AccessPoint guides his hand to the slot. **AccessPoint:** “Move down, and a little to the left.” **AccessPoint:** “Stop. The slot is right under your fingers. Push the card in.” | Scenario mode, demo kiosk we built |
| 1:32 | Safety 1: that total looks wrong | **AccessPoint:** “Stop. This screen wants forty-two dollars for one milk. The milk is four dollars twenty. Don’t pay. Press Cancel, on the left.” **AccessPoint:** “Cancelled. Nothing was paid. A staff member is coming to fix the total.” | Scenario mode, demo kiosk we built |
| 1:52 | Safety 2: not sure, so not guessing | **AccessPoint:** “I can’t see the buttons clearly. Tilt the phone up a little.” **AccessPoint:** “Now I can see. Window seat, or aisle seat?” | Scenario mode, demo kiosk we built |
| 2:03 | Chat 1: Telegram, live | No app needed. The same assistant works in chat. Muse Spark asks: window or aisle? She taps Window. | Live on Telegram · real Muse Spark and SAM 3.1 replies · waiting time shortened |
| 2:18 | Chat 2: WhatsApp (preview) | On WhatsApp, Siti gets the step in Bahasa, as text and voice. | Preview · real replies from the same code · WhatsApp connects after Meta app review |
| 2:28 | Chat 3: Messenger (preview) | On Messenger, Mr Lim’s photo gets a clear stop. Scan the sticker, the chat opens. Nothing to install. | Preview · real replies from the same code · Messenger connects after Meta app review |
| 2:41 | Every scenario | Eight scenarios, six machines, any of twenty-five languages. | Scenario mode, demo kiosks we built |
| 2:46 | Results | We tested it on the real models. | Real Meta models, 3 Nov 2026 |
| 2:51 | Close | Independence by design. Try it in your browser. |  |

## Honesty labels used in the video

- App scenes: "Scenario mode, demo kiosk we built".
- Telegram scene: "Live on Telegram · real Muse Spark and SAM 3.1 replies · waiting time shortened".
- WhatsApp and Messenger scenes: "Preview · real replies from the same code · connects after Meta app review".
- Results: "Real Meta models, 3 Nov 2026".

## Rebuild

See the pipeline notes in [AGENTS.md](../AGENTS.md#demo-video-pipeline-demo): `python3 build.py flows` → `../record-clips.sh` → `python3 build.py timeline` → `node render.mjs` → `python3 build.py compose` → `./x-cut.sh`.
