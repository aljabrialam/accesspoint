# AccessPoint demo video script (v2, first cut)

Target length **2:58** (hackathon limit 3:00). Follows the `hackathon-demo-video` pattern. Every app clip is real footage of the app on the iOS Simulator in **scenario mode** and carries that badge; replace clips with live-pipeline footage when it works.

## Step 0 inputs

| Input | Value |
|---|---|
| Brief | Build for Your World: solve a problem you know firsthand, free up time and mental space, make something possible that wasn't before. Must meaningfully use Meta models. Judged equally on Impact, Use of Meta AI, Technical depth, Demo |
| Hero | "I can't read this screen. Help me." |
| Meta products named | SAM 3.1, Muse Spark, Muse Voice Transcribe (25 languages), Muse Code (built with) |
| Live vs scenario | App, scenarios, voice matcher and 25-language UI are built and tested. Camera + model pipeline is not live yet: architecture scene is badged "Live pipeline in progress" |
| Numbers (measured, our own tests, Oct 2026) | 9/9 scenario flows pass end to end (Maestro); 24/24 spoken phrases in 10 languages mapped correctly; ambiguous answers guessed 0 (down from 1 after a fix); 25 languages |

**One rule:** "The model suggests. The camera confirms."
**Brand line:** "Point your phone. Hear the next step."
**Progress track:** See, Read, Plan, Guide, Confirm, Done

## Scene table

| # | Scene | Start | Narration (12 words or fewer per line) | On screen |
|---|---|---|---|---|
| 1 | Title | 0:00 | (none) | Meta Global AI Developer Hackathon, Indie Developer, Build for Your World |
| 2 | Hero | 0:03 | "I can't read this screen. Help me." | Phone types the line; same line large on the right |
| | | 0:08 | "Millions of us say this to machines every day." | |
| 3 | Brand | 0:12 | "AccessPoint. Point your phone. Hear the next step." | Icon, name, tagline |
| 4 | Problem | 0:17 | "The world went self-service just as it started to age." | ATM, ticket machine, food kiosk, check-in kiosk |
| | | 0:22 | "One in six people will be over sixty by 2030." | 1.4B people 60+ by 2030 (WHO); 2.2B with a vision impairment (WHO); 281M migrants (IOM) |
| | | 0:27 | "But a chatbot pointed at a machine can do real harm." | Three risks: wrong button, PIN on camera, rushing ahead |
| | | 0:31 | "Wrong buttons. PINs on camera. Steps skipped." | |
| 5 | Approach | 0:35 | "So the model suggests, and the camera confirms." | Step card waits at a checkpoint, crosses when confirmed |
| | | 0:40 | "Every step is checked. Your PIN is never seen." | |
| 6 | Architecture | 0:45 | "SAM 3.1 finds the screen, buttons and slots." | Node strip: Models perceive / Code decides / You act |
| | | 0:50 | "Muse Spark reads the screen and plans one step." | |
| | | 0:55 | "Muse Voice hears you, in twenty-five languages." | |
| | | 1:00 | "Code checks each step, and pauses the camera for PINs." | |
| 7a | Demo 1 of 3: Cash, without asking a stranger | 1:08 | "Mrs Tan is seventy-eight. Her bank branch closed." | ATM clip. Status: Asking, not guessing |
| | | 1:13 | "The screen asks which account. AccessPoint asks her." | |
| | | 1:19 | "Savings. Then her PIN, with the camera paused." | |
| 7b | Demo 2 of 3: In her own language | 1:25 | "Siti works in Singapore. She hears steps in Bahasa." | Self-checkout clip |
| | | 1:31 | "Unexpected item in the bagging area? Explained, and fixed." | |
| 7c | Demo 3 of 3: First flight, by voice | 1:42 | "Amara is flying alone for the first time." | Airport clip, mic open, phrase chips |
| | | 1:48 | "She just says window. Code maps her words to the button." | |
| | | 1:54 | "Boarding pass printed. Confirmed, not assumed." | |
| 8a | Safety 1 of 3: Your PIN stays yours | 2:00 | "PIN screen detected. Camera paused. Nothing sent." | PIN mode clip |
| 8b | Safety 2 of 3: That's not what you asked | 2:11 | "She asked for cash. The screen wants a transfer." | Scam clip |
| | | 2:16 | "Stopped. It points her to Cancel." | |
| 8c | Safety 3 of 3: Not sure, so not guessing | 2:22 | "Glare hides the buttons. It asks for a better angle." | Glare clip |
| 9 | Languages | 2:33 | "Twenty-five languages, and the mixes people really speak." | Native names of all 25 |
| 10 | Results | 2:40 | "We measured it." | 9/9 flows; 24/24 phrases; ambiguous answers guessed 0 (down from 1); 25 languages. Footnote |
| | | 2:45 | "Zero guesses on ambiguous answers. Every flow passes." | |
| 11 | Close | 2:51 | "Independence by design. Built on Meta's models." | Six guarantees + repo URL |

About 33 s of safety scenes plus the "asking, not guessing" beats show the system stopping or asking.

## Honesty badges
- "Scenario mode, demo kiosk we built" on every app clip
- "Live pipeline in progress" on the architecture scene until it's real
- "2×" on any sped-up footage
- Narration is macOS text-to-speech in the first cut (Meta has no text-to-speech model); replace with a human voice-over if possible
