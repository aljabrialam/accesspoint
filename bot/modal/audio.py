"""Voice note converter for AccessPoint.

Messenger voice notes are AAC (.m4a) and WhatsApp's are OGG/Opus; Muse Voice Transcribe takes
16 kHz mono WAV only, and a Cloudflare Worker can't run ffmpeg. This one endpoint does the conversion.
Nothing is written to disk or kept.

Deploy:
    pip install "modal==1.6.2"
    modal secret create accesspoint-audio AUDIO_TOKEN=<long random string>
    modal deploy bot/modal/audio.py
Then set the printed URL as AUDIO_URL (and the same token as AUDIO_TOKEN) on the Worker.
"""
import hmac
import os
import subprocess

import modal

image = modal.Image.debian_slim(python_version="3.12").apt_install("ffmpeg").pip_install("fastapi[standard]==0.115.12")
app = modal.App("accesspoint-audio", image=image)

MAX_BYTES = 8 * 1024 * 1024  # a few minutes of voice note at most


@app.function(secrets=[modal.Secret.from_name("accesspoint-audio")], timeout=60, min_containers=0)
@modal.fastapi_endpoint(method="POST")
async def wav(request: "fastapi.Request"):  # noqa: F821
    from fastapi import Response

    token = request.headers.get("authorization", "").removeprefix("Bearer ").strip()
    if not hmac.compare_digest(token, os.environ["AUDIO_TOKEN"]):
        return Response("Forbidden", status_code=403)
    data = await request.body()
    if not data or len(data) > MAX_BYTES:
        return Response("Bad audio", status_code=400)
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", "pipe:0", "-t", "120", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", "-f", "wav", "pipe:1"],
        input=data, capture_output=True, timeout=45,
    )
    if out.returncode != 0 or not out.stdout:
        return Response("Could not convert", status_code=422)
    return Response(out.stdout, media_type="audio/wav")
