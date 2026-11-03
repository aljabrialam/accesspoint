"""Audio service for AccessPoint: voice notes in, spoken replies out.

- POST /        voice note (AAC from Messenger, OGG/Opus from WhatsApp and Telegram, WebM from browsers)
                → 16 kHz mono WAV, the only format Muse Voice Transcribe accepts.
- POST /speak   {"text": "...", "lang": "en", "format": "ogg" | "mp3"} → the reply spoken aloud.
                Meta's models don't synthesise speech, so this uses Microsoft Edge neural voices (edge-tts).

A Cloudflare Worker can't run ffmpeg or edge-tts, so both live here. Nothing is written to disk or kept.

Deploy:
    python3 -m pip install --user "modal==1.6.2"
    python3 -m modal secret create accesspoint-audio AUDIO_TOKEN=<long random string>
    python3 -m modal deploy bot/modal/audio.py
Then set the printed URL as AUDIO_URL (and the same token as AUDIO_TOKEN) on the Worker.
"""
import modal

image = (
    modal.Image.debian_slim(python_version="3.12")
    .apt_install("ffmpeg")
    .pip_install("fastapi[standard]==0.115.12", "edge-tts==7.3.1")
)
app = modal.App("accesspoint-audio", image=image)

MAX_BYTES = 8 * 1024 * 1024  # a few minutes of voice note at most
MAX_SPEAK_CHARS = 900
# One natural voice per language, a little slower than normal for older listeners (same voices as the iPhone app).
VOICES = {
    "en": "en-SG-LunaNeural",
    "tl": "fil-PH-BlessicaNeural",
    "id": "id-ID-GadisNeural",
    "ms": "ms-MY-YasminNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "es": "es-ES-ElviraNeural",
}
RATE = "-8%"


@app.function(secrets=[modal.Secret.from_name("accesspoint-audio")], timeout=60, min_containers=0)
@modal.asgi_app()
def wav():
    import asyncio
    import hmac
    import os
    import subprocess

    import edge_tts
    from fastapi import FastAPI, Request, Response

    web = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

    def allowed(request: Request) -> bool:
        token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
        return hmac.compare_digest(token.encode(), os.environ["AUDIO_TOKEN"].encode())

    def ffmpeg(data: bytes, args: list[str]) -> bytes:
        out = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "pipe:0", *args, "pipe:1"], input=data, capture_output=True, timeout=45)
        return out.stdout if out.returncode == 0 else b""

    @web.post("/")
    async def convert(request: Request):
        if not allowed(request):
            return Response("Forbidden", status_code=403)
        data = await request.body()
        if not data or len(data) > MAX_BYTES:
            return Response("Bad audio", status_code=400)
        wav_bytes = ffmpeg(data, ["-t", "120", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-f", "wav"])
        return Response(wav_bytes, media_type="audio/wav") if wav_bytes else Response("Could not convert", status_code=422)

    @web.post("/speak")
    async def speak(request: Request):
        if not allowed(request):
            return Response("Forbidden", status_code=403)
        body = await request.json()
        text = str(body.get("text", "")).strip()[:MAX_SPEAK_CHARS]
        voice = VOICES.get(str(body.get("lang", "en")), VOICES["en"])
        if not text:
            return Response("No text", status_code=400)
        mp3 = b""
        for attempt in range(3):  # Microsoft's voice service sometimes returns no audio; a retry fixes it
            try:
                async for chunk in edge_tts.Communicate(text, voice, rate=RATE).stream():
                    if chunk["type"] == "audio":
                        mp3 += chunk["data"]
                if mp3:
                    break
            except edge_tts.exceptions.NoAudioReceived:
                mp3 = b""
                await asyncio.sleep(0.4 * (attempt + 1))
        if not mp3:
            return Response("Could not speak", status_code=502)
        if body.get("format") == "mp3":
            return Response(mp3, media_type="audio/mpeg")
        # Telegram and WhatsApp voice notes need OGG/Opus, mono.
        ogg = ffmpeg(mp3, ["-ac", "1", "-c:a", "libopus", "-b:a", "32k", "-f", "ogg"])
        return Response(ogg, media_type="audio/ogg") if ogg else Response("Could not convert", status_code=502)

    return web
