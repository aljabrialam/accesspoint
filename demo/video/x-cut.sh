#!/usr/bin/env bash
# X (Twitter) cut of the 4K master: whole scenes only (no sentence cut mid-way), 1920x1080, H.264 + AAC, under 2:20.
# Scene times come from timeline.json, so re-run after `python3 build.py timeline` and compose.
set -euo pipefail
cd "$(dirname "$0")"
SRC=../accesspoint-demo.mp4
OUT=../accesspoint-x.mp4
read -r -a SEGS <<< "$(python3 - <<'EOF'
import json
sc = json.load(open("timeline.json"))["scenes"]
spans = [("hero", "brand"), ("arch", "arch"), ("demo-airport", "demo-airport"), ("demo-mismatch", "demo-mismatch"),
         ("chat-amara", "chat-amara"), ("chat-lim", "chat-lim"), ("results", "close")]
print(" ".join(f"{sc[a]['start']}:{sc[b]['end']}" for a, b in spans))
EOF
)"
inputs=() filt="" n=0
for seg in "${SEGS[@]}"; do
  a=${seg%%:*}; b=${seg##*:}; d=$(python3 -c "print(round($b-$a,3))")
  inputs+=(-ss "$a" -t "$d" -i "$SRC")
  fo=$(python3 -c "print(round($d-0.25,3))")
  filt+="[$n:v]scale=1920:1080:flags=lanczos,fps=30,fade=t=in:st=0:d=0.25,fade=t=out:st=$fo:d=0.25,setsar=1[v$n];"
  filt+="[$n:a]afade=t=in:st=0:d=0.2,afade=t=out:st=$fo:d=0.25[a$n];"
  n=$((n+1))
done
for i in $(seq 0 $((n-1))); do filt+="[v$i][a$i]"; done
filt+="concat=n=$n:v=1:a=1[v][a]"
ffmpeg -hide_banner -loglevel error -y "${inputs[@]}" -filter_complex "$filt" -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -crf 10 -profile:v high -level 4.2 -pix_fmt yuv420p -minrate 12M -maxrate 25M -bufsize 50M \
  -x264-params keyint=60:bframes=2:colorprim=bt709:transfer=bt709:colormatrix=bt709 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration,size:stream=codec_name,width,height -of compact "$OUT"
