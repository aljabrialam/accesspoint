"""Original background music for the demo video, synthesised from scratch (no samples, no third-party audio).

Upbeat and warm: 112 BPM, I–V–vi–IV in C major, soft pad, plucked arpeggio, bass, light kick and hats.
    python3 music.py 175 music.wav
"""
import math
import random
import struct
import subprocess
import sys
import wave
from pathlib import Path

SR = 22050
BPM = 112
BEAT = 60 / BPM
BAR = BEAT * 4
# I – V – vi – IV, voiced around middle C (MIDI note numbers)
CHORDS = [[48, 55, 60, 64, 67], [43, 55, 59, 62, 67], [45, 57, 60, 64, 69], [41, 57, 60, 65, 69]]
TWO_PI = 2 * math.pi


def hz(n):
    return 440 * 2 ** ((n - 69) / 12)


def render(duration, out_path):
    n = int(duration * SR)
    buf = [0.0] * n
    rnd = random.Random(7)

    def add(start, length, fn, gain):
        i0 = int(start * SR)
        for i in range(max(0, i0), min(n, i0 + int(length * SR))):
            buf[i] += gain * fn((i - i0) / SR)

    def pad(freq):
        return lambda t: (math.sin(TWO_PI * freq * t) + 0.5 * math.sin(TWO_PI * 2 * freq * t) + 0.22 * math.sin(TWO_PI * 3 * freq * t)) * min(1, t / 0.35)

    def pluck(freq):
        return lambda t: (math.sin(TWO_PI * freq * t) + 0.35 * math.sin(TWO_PI * 2 * freq * t)) * math.exp(-t * 9)

    def bass(freq):
        return lambda t: math.sin(TWO_PI * freq * t) * math.exp(-t * 4) * min(1, t / 0.01)

    def kick(t):
        return math.sin(TWO_PI * (50 * t + 70 * (1 - math.exp(-t * 30)) / 30)) * math.exp(-t * 18)

    noise = [rnd.uniform(-1, 1) for _ in range(int(0.05 * SR) + 2)]

    def hat(t):
        i = int(t * SR)
        return (noise[i] - noise[i + 1]) * math.exp(-t * 90)

    bars = int(duration / BAR) + 1
    for b in range(bars):
        t0 = b * BAR
        chord = CHORDS[b % 4]
        intro = b < 2
        outro = t0 > duration - BAR * 1.5
        for note in chord[1:]:
            add(t0, BAR + 0.5, pad(hz(note)), 0.022)
        if not intro:
            add(t0, BEAT * 1.6, bass(hz(chord[0] - 12)), 0.2)
            add(t0 + BEAT * 2.5, BEAT * 1.2, bass(hz(chord[0] - 12)), 0.14)
        arp = [chord[2] + 12, chord[3] + 12, chord[4] + 12, chord[3] + 12]
        for s in range(8):
            if intro and s % 2:
                continue
            add(t0 + s * BEAT / 2, 0.5, pluck(hz(arp[s % 4])), 0.05 if s % 2 == 0 else 0.035)
        if not intro and not outro:
            for q in range(4):
                add(t0 + q * BEAT, 0.3, kick, 0.32)
                add(t0 + q * BEAT + BEAT / 2, 0.05, hat, 0.05)

    fade = int(2.5 * SR)
    for i in range(fade):
        buf[n - 1 - i] *= i / fade
        buf[i] *= min(1, i / (0.4 * SR))
    peak = max(abs(x) for x in buf) or 1
    raw = Path(out_path).with_suffix(".raw.wav")
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(struct.pack("<h", int(32000 * x / peak)) for x in buf))
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(raw), "-af",
                    "aresample=48000,pan=stereo|c0=c0|c1=c0,aecho=0.8:0.6:43|67:0.22|0.16,extrastereo=m=1.6,lowpass=f=9000,loudnorm=I=-18:TP=-2",
                    str(out_path)], check=True)
    raw.unlink()


if __name__ == "__main__":
    render(float(sys.argv[1]), sys.argv[2])
