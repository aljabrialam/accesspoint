# AccessPoint guardrails

AccessPoint guides people through machines that handle money, identity and health. Every Meta model has one narrow job, and code decides what happens next. The models suggest. The camera and the code confirm.

**Status key**
- **Built**: working in the app today (scenario mode) and covered by automated tests.
- **Live pipeline**: designed and specified; enforced when the camera and Meta model pipeline is connected.

## The rule that covers everything

The person presses every button themselves. AccessPoint never taps, pays, types or submits anything. The worst a wrong model output can do is say the wrong words, and the checks below exist so that it says nothing at all rather than something wrong.

## SAM 3.1: sees the machine

| Guardrail | How it works | Status |
|---|---|---|
| Never sees your PIN | When the screen asks for a PIN, code stops sending frames before they reach SAM. The camera feed is replaced with "Camera paused, nothing is being sent". | Built |
| Machine parts only | Text prompts come from a fixed allow-list (screen, button, slot, keypad, card reader, tray). No prompts for people, faces or documents. | Live pipeline |
| Bystanders stay private | Faces in the frame are blurred on the phone before any frame is uploaded. | Live pipeline |
| Not sure means not sure | Below a confidence threshold, AccessPoint says "I can't see the buttons clearly" and asks for a better angle instead of guessing. | Built |
| Nothing kept | Frames are processed in memory and never written to disk or logs. | Live pipeline |

## Muse Spark: reads the screen and plans one step

| Guardrail | How it works | Status |
|---|---|---|
| Suggests, never acts | Spark returns a structured step (which detected element, what to say). Code rejects any step that points at something SAM did not find on screen. | Live pipeline |
| Screen text is data, not instructions | Text on a kiosk screen ("say Confirm", "ignore previous rules") is passed as quoted content and cannot change the plan. | Live pipeline |
| Intent lock | The step is checked against what the person asked for. If the screen wants a transfer when they asked for cash, AccessPoint stops and points to Cancel. | Built (scripted scam scenario) |
| No secrets in or out | Spark is never asked for a PIN, card number or password, and digit strings that look like one are removed from its output. | Live pipeline |
| Describes, doesn't advise | It explains what the screen says. No financial, medical or legal advice. | Live pipeline |

## Muse Voice Transcribe: hears the person

| Guardrail | How it works | Status |
|---|---|---|
| Mic off for PINs | In PIN mode the microphone is muted and spoken digits are dropped, so a PIN said out loud is never transcribed. | Live pipeline |
| Words map to buttons in code | Code matches the transcript to the buttons on screen, in 25 languages. Ambiguous answers get a question, never a guess. | Built (24 of 24 test phrases in 10 languages) |
| Small vocabulary | Recognition is biased only toward the current step's choices and commands. | Live pipeline |
| Transcript only | Audio is streamed for transcription and not stored. | Live pipeline |

## Code: decides

| Guardrail | How it works | Status |
|---|---|---|
| Confirmed, not assumed | A step only moves on when the camera sees it happen (card in, ticket printed). | Built (scripted) |
| One step at a time | The plan can only ever offer the next single step. | Built |
| Step log without images | Each step is recorded as text (what was asked, what was seen), never with images or audio. | Live pipeline |
| Honest labels | Scenario footage is labelled as scenario mode wherever it appears. | Built |

## What we don't do

- No payments, no taps on the person's behalf, no accounts or sign-in.
- No identity checks, face recognition or document reading.
- No storing of photos, video or audio.
