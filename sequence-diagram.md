# ContextProof — sequence diagram

```mermaid
sequenceDiagram
    autonumber
    actor Fam as Family group<br/>(WhatsApp / Messenger / IG)
    actor U as User
    participant CP as ContextProof<br/>(WhatsApp Cloud API / Share Target / link)
    participant BE as Backend<br/>(orchestrator, code)
    participant V as Muse Voice<br/>(transcribe)
    participant S as Muse Spark<br/>(claim + sources)
    participant SAM as SAM 3.1<br/>(segment + fingerprint)
    participant IDX as Verified-case index<br/>+ fact-check archives
    participant VR as Verdict rules<br/>(deterministic code)
    participant CARD as Card renderer

    Fam->>U: Forwards viral clip<br/>"BREAKING: Flood in Dubai last night!"
    U->>CP: Forward / Share to ContextProof
    CP->>BE: Media + caption + language

    par Hear and see
        BE->>V: audio track
        V-->>BE: transcript (any language)
    and
        BE->>SAM: keyframes + text prompt from caption
        SAM-->>BE: masks per claimed element
    end

    BE->>S: caption + transcript + keyframes<br/>"extract the claim"
    S-->>BE: structured claim {what, where, when}

    BE->>BE: build fingerprint<br/>(perceptual hash + SAM crops)

    BE->>IDX: match fingerprint + claim
    IDX-->>BE: candidate matches<br/>(first-seen dates, sources)

    BE->>S: search grounding<br/>"earliest appearance? sources?"
    S-->>BE: earliest seen + cited sources

    BE->>VR: evidence → rules
    alt Match found earlier than claimed date
        VR-->>BE: REAL FOOTAGE · WRONG CONTEXT
    else AI-signature flags, no provenance
        VR-->>BE: SUSPECTED AI · UNVERIFIED
    else Earliest appearance matches claim
        VR-->>BE: VERIFIED
    else Not enough evidence
        VR-->>BE: UNVERIFIED (never guessed)
    end

    BE->>CARD: verdict + evidence + language
    CARD-->>BE: verdict card (image + link)

    CP-->>U: verdict card in chat
    U->>Fam: forwards card back to the group
    Fam->>Fam: myth busted where it spread
```

**Fail-closed rule:** every verdict that isn't backed by evidence becomes `UNVERIFIED` — the system never guesses. Low-confidence matches pause and ask the user ("forwarded as new or old?") instead of assuming.
