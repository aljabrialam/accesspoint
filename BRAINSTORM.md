# Meta Global AI Developer Hackathon: Brainstorm

Living notes for Aljabri Alam's solo entry (Indie Developer track). Last updated: Wed 28 Oct 2026, Singapore.

Status: **brainstorming**. Nothing here is final until the written design is approved.

---

## 1. Event essentials

| Item | Detail |
|---|---|
| Track | Indie Developer (solo) |
| Building period | Oct 27 – Nov 4, 2026 (after kickoff) |
| Deadline | **Nov 4, 9:00 PM ET = Thu Nov 5, 10:00 AM Singapore** |
| Submission | Public repo, 3-minute demo video, live product, all contributors' names |
| Judging | Stage 1 pass/fail: fits a theme and meaningfully uses Meta models. Stage 2: **equal weights** on Impact, Use of Meta AI tooling, Technical depth and execution, Demo quality. Top 5 per track go to the finals (Nov 9) |
| Indie prizes | $150k / $100k / $75k / $50k / $25k |
| Bonus awards | Most Viral $20k (X post, engagement until Nov 8), Best Build on Meta Open Weight Models $10k, Community Vote $10k, Best Agentic Use-Case $5k, Best Creative Build $5k |
| Credits | $150 Meta Model API (claim form, Team ID digits from the dev.meta.ai URL). Baseten $100 (`meta-models/muse-spark-open-1026`), Modal $100, Fireworks TBC |
| Region | Singapore and the Philippines are **not** restricted (Geographic Use Policy, 12 Oct 2026). Do not bypass geo controls |

### Themes
- **Build for Your World:** bring Meta's models into your domain. Solve a problem you know firsthand, free up time and mental space, and make something possible that wasn't before.
- **Push the Frontier:** software, robotics, manufacturing, energy, materials. Give a machine a new capability, accelerate an experiment, or better understand and control a physical system.

### Hard rules
- New work only. The repo contains only what was built during the event; the video opens by stating what was pre-existing, if anything.
- Only approved participants can be on the team.
- Banned: medical advice, mental-health advisors, skin-condition detectors, basic RAG, **simple image analyzers**, generic education chatbots, job screeners, nutrition coaches, personality analyzers, **sports analyzers or coaches**, anything **political** or about war.

### Meta models available
Muse Spark 1.3 (multimodal, 1M context, tool calling, search grounding), Muse Wonder (agentic, computer use), Muse Image, Muse Voice Transcribe (streaming, keyword biasing, speaker separation), SAM 3.1 (text prompt to masks, video tracking), Muse Glimmer (open weights, long-running agents), Muse Spark Open (open weights), Muse Code (coding agent).

---

## 2. Ideas considered and why they were dropped

| Idea | Why dropped |
|---|---|
| FairwayFocus (AI golf caddie) | Banned: sports coach. Kept for Antler after the hackathon |
| Flood-control project checker | Banned: political |
| Turo / StepProof (learn a skill by watching, camera-checked steps) | Most likely to be duplicated; Tulip, Docsie and Retrocausal already ship parts of it |
| Proof of Build (verify remote house construction for diaspora families) | Already exists: PactStream (AI verification and milestone escrow), DiasporaBuild, ImbaTrust BuildTrack, Crednce, Buildeezy; Truepic, Trussly and Trussed for lender draw inspections. Also needs real site footage we don't have |
| Git for the physical world (commit, diff, blame for physical spaces) | Already exists: ctrl+f and SpatialVCS (hackathon projects), Nexma Spatial Branches, Roam |
| Legacy Lens (legacy system screen recordings to spec, verified by replay) | Close competitor: necroma (autorail); LTM sells video-to-test |
| BoxProof (balikbayan box watchdog) | Strong, but Philippines-only framing. Generalised into Proof of Contents below |
| Scope Guard (catch scope creep in client meetings against the SOW) | Very crowded: Scope Catch, Semarize, Autohive, ScopeAuditor, donethat.ai |
| Lab experiment recorder (video to protocol, catch deviations) | Exists: PRISM, Max Planck proteomics agent, Benchbook. Hard to demo without a lab |
| Disaster damage triage from citizen videos | Exists: Oceanit, OpnIMG, NEC, CRISP. Footage rights and "image analyzer" risk |
| FormFriend (speak your language, agent fills forms, you submit) | Rejected: too close to MyLevi; the demo-video skill was wrongly shaping the product |

### Replaced: ContextProof

> **Replaced by AccessPoint (28 Oct).** Weaker Meta alignment (Meta ended third-party fact-checking), crowded WhatsApp fact-checker field, and political-adjacency risk.

**One line:** forward a viral video/photo/voice note, get back "when and where it was really taken" — provenance, not pixel detection.

**Why not a deepfake detector:** current detectors fail on modern generators (humans ~52%, ChatGPT missed 92% of Sora clips, detectors drop to near-chance). We never claim to detect AI; we verify provenance, report AI-signature checks only as a signal, and show honest uncertainty.

**Pipeline:** forward → Muse Voice transcribes narration (any language) → Muse Spark extracts the claim → SAM 3.1 segments the claimed elements → code fingerprints frames → search grounding + fact-check archives find the earliest appearance ("first seen") → deterministic verdict (`REAL FOOTAGE · WRONG CONTEXT` / `SUSPECTED AI · UNVERIFIED` / `VERIFIED`) → shareable verdict card in the group's language.

**Demo cases are global, not Philippines-only:**
1. **Wrong context** — "BREAKING: Flood in Dubai last night!" → footage first seen years earlier in another country (use a documented AFP/reuters fact-check case).
2. **AI fake** — a "breaking news" clip we generate with Muse Image (e.g. volcanic eruption, stadium collapse) → SUSPECTED AI · UNVERIFIED.
3. **Scam forward** — fake government cash-aid promo (US IRS refund scam / UK cost-of-living scam style) → flagged with cited advisories.
4. **Verified** — a true recent clip → VERIFIED (proves it doesn't just say "fake").

**Meta ecosystem surfaces (co-flagship intake):** (a) WhatsApp Cloud API test number for forwards inside WhatsApp/Messenger chats; (b) PWA share-target — "Share → ContextProof" from TikTok, IG, FB, X, camera roll, browsers (Android best; iOS falls back to paste/upload); (c) paste-a-link fallback. Stretch: Messenger/IG DM bots, Meta AI Connectors waitlist (verifier inside Meta AI), re-shareable verdict card as the viral loop.

**Competitors:** WhatsApp fact-checkers exist (AdieraBot, SachAI, JaanchKaro, Kaval) and Meta AI itself does forward-analysis — none does cross-video matching or first-seen dating. Demo assets: generate fakes with Muse Image, use documented real-clip-wrong-date cases.

**SCOPE GUARD (hard requirement):** the product verifies media provenance, disaster footage and scams only. It declines political, war and medical claims with an "outside our scope" card — framing is "family-safety media verifier", not political fact-checking. The decline is a feature and a demo scene. Day-1 action: confirm with @CV on Discord in writing.

### Meta's stated intent (researched 28 Oct — align the entry with it)

- **Muse Spark:** "treats what it perceives as something to act on, not just something to caption." Launch demos: troubleshoot home appliances with dynamic annotations, read physical shelves.
- **SAM 3.1:** "perception layer for the physical world" — "robots get a queryable world," AR/VR, real-time video tracking.
- **Muse Voice:** "first real-time audio perception model" — live guidance.
- **Muse Wonder:** personal agents + computer use (observe-act loop; WE build environment/driver/safety — no server VM).
- **Muse Glimmer:** "always-on local agent" on consumer hardware — privacy, offline, 100+ languages.
- **Master narrative:** "personal superintelligence." Meta ships Be My Eyes on Ray-Ban Meta glasses (accessibility is on-brand). Note: Meta ended its third-party fact-checking program (2025) — weakens ContextProof's alignment.

### CHOSEN (28 Oct, replaces ContextProof): AccessPoint — a patient guide for anyone the interface left behind

Demo video script: `demo/SCRIPT.md`.

**Users:** blind/low-vision (~285M), elderly living alone (1.4B will be 60+ by 2030; Japan ~30% already, Singapore 1 in 4 soon), migrants who can't read the kiosk's language (281M migrants — Aljabri's own world). The world went self-service just as it started to age.

**How:** phone camera → SAM 3.1 tracks screen/keypad/card slot → Muse Spark reads the screen AND simplifies it into one spoken step → Muse Voice guides the hand in the user's language, at their pace ("card slot, 10cm down-left — insert"). Code verifies each step; pauses rather than guesses. Zero hardware change to the machine.

**Fit:** "give a machine a new capability" (PtF) AND "make something possible that wasn't before" (BYW). Extends Meta's accessibility story (Be My Eyes on glasses) without needing a human helper. Fully controllable demo (mocked kiosk UI). Competitors: Be My Eyes/Aira (human agents), Lookout (describes, doesn't guide).

### Still open (not chosen, not rejected)
| Idea | One line | Notes |
|---|---|---|
| StreetProof | A 10-minute phone video proves a road crossing is dangerous; SAM 3.1 tracks road users, code measures near misses | Assistant's top pick on the criteria (1.19M road deaths/yr, WHO). Aljabri said no to locking it; reason not yet given |
| Show it once | Film a tabletop task; a simulated robot arm learns to repeat it | Push the Frontier. DXTR, ONCE (hackathon) and research exist. Hardest to build |
| LineSight | Phone video of a small production line becomes a time-and-motion study | Not researched yet |
| AccessMap | Film a walk; get a measured wheelchair accessibility audit | Not researched yet |
| ScamShield | Live scam-call guardian for elderly parents | Google Pixel already does on-device scam detection; web app can't access call audio |

Note: the `hackathon-demo-video` skill is only the pattern for making the video later. It must not shape the product idea.

Lesson: every idea has a competitor somewhere. Novelty is not a judging criterion, so the filter is (1) a firsthand story, (2) deep and surprising use of Meta models, (3) a live demo we fully control.

---

## 3. Parked: Proof of Contents

> **Parked (28 Oct).** Impact is medium, not strong: most bag problems are delays (which this doesn't fix), there's no data that proof raises payouts, and the balikbayan crisis was forwarder failure rather than missing proof. Decisive signal: Aljabri himself has never filmed or photographed packing before handing things over, so the habit the product depends on isn't real even for the founder.

**One line:** when you hand your things to someone else to carry, prove what was inside, and get paid when it goes wrong.

**Theme:** Build for Your World.

### The problem (global, with a local face)
- **Airlines:** 24M bags mishandled in 2025, costing the industry $6.3B. A lost bag costs about $635, mostly compensation. Travellers are only reimbursed for what they can prove was inside. (SITA Baggage IT Insights 2026)
- **Couriers:** about 104M packages stolen in the US in 2025, $14.9B in consumer losses; only 8.5% of victims got a carrier refund. (SafeWise 2025)
- **Freight forwarders:** balikbayan boxes. 10,000 more found abandoned in Philippine ports in Oct 2026; earlier 42,000 to 130,000 boxes were stuck for up to three years, about P300M lost, up to 100,000 families affected. Blacklisted forwarders' overseas partners still accept boxes. (Philstar, Inquirer, ABS-CBN, GMA)
- Same pattern: Caribbean barrels, Mexican envíos, African diaspora shipments, movers and storage.

### Existing competitor
- **ProofPack** (Android): manual photo per item, typed values, hash-stamped PDF. Manual, and stops at the PDF.
- Seller-side packing video tools (vAudit, Rabot, iProof) serve e-commerce businesses, not individuals.

### How it works (draft)
1. **Guided packing.** Show the item, say what it is, put it in.
   - Muse Voice transcribes the label (any language, keyword biasing for brands).
   - The spoken label becomes the SAM 3.1 text prompt; SAM segments and tracks the item into the bag.
   - Code keeps the best crop. Muse Spark writes a fingerprint (category, colour, brand, visible text, marks), estimates value with search grounding, and flags rule-relevant items.
2. **Seal.** Film the closed bag or box from every side. Code locks the inventory with a SHA-256 hash and timestamp.
3. **Custody.** Enter the carrier and tracking number. Muse Spark checks the carrier's track record with sources. Muse Glimmer watches tracking for weeks and alerts when the shipment goes quiet.
4. **Guided unpacking.** Seal check first (compare with seal footage), then each item is shown to the camera and fingerprinted the same way.
5. **Matching (code decides).** Similarity scores between packed and unpacked items, one-to-one assignment, verdicts: matched, missing, possibly swapped, damaged. Low confidence goes to a human. Every verdict shows both frames side by side.
6. **Claim.** Code works out the claimable amount under the relevant limit. Muse Wonder fills in the carrier's real claim form via computer use with evidence attached; the user reviews before submitting.

Clarification: items are not tracked in transit (no GPS inside the bag). Items are identified at packing and re-identified at unpacking. The shipment is followed via the carrier's tracking number.

### Scope
**Solves:** proving contents and condition when something you packed comes back missing, damaged, swapped or pilfered (luggage, family shipments, private sellers' "empty box" disputes, house moves). Warns before handover and alerts when a shipment goes quiet.

**Does not solve:** delays, preventing theft, wrong items in online orders (you didn't pack them), whole-package porch theft (sellers usually refund anyway), forwarders going bust.

Draft pitch line: "We don't fix logistics. We fix the moment it fails you and the burden of proof falls on you."

### Platform (proposal, not yet confirmed)
Mobile web app (phone browser camera and mic), installable to the home screen. Laptop view for the evidence report and watching the claim agent. One backend service for the pipeline, deterministic rules and evidence log. Native app (Expo) later if it becomes a product.

### Meta tooling map (draft)
| Model | Role |
|---|---|
| SAM 3.1 | Segment and track each item by spoken label, at packing and unpacking |
| Muse Voice Transcribe | Item labels and recipients from narration, keyword biasing |
| Muse Spark 1.3 | Fingerprints, value estimates with search grounding, damage comparison, carrier track record |
| Muse Wonder | Fills in real claim forms via computer use |
| Muse Glimmer | Long-running shipment watch and claim follow-up (open-weights bonus) |

### Principles
- The model proposes; code decides (matching, limits, verdicts).
- Every verdict carries evidence frames.
- Fail closed: if unsure, ask the human.
- Keep the forwarder check factual and sourced (consumer protection, not politics).

---

## 4. Open questions

1. Demo lead story: a traveller's lost or pilfered suitcase, or a family's box home?
2. Guided capture ("show, say, put in") versus filming normal packing?
3. Mobile web app confirmed, or native app?
4. Capability probe: does the SAM 3.1 API take whole clips or only frames? Latency? How well do fingerprints match across angle and lighting?
5. Meta Model API account: card accepted, credits claimed, a working test call.
6. Ask @CV whether this could be read as a "simple image analyzer".
7. Which real claim form(s) Muse Wonder fills in for the demo, and whether submitting is safe (likely stop before submit).
8. Product name.
