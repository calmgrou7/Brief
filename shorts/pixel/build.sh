#!/usr/bin/env bash
# 한장견적 픽셀 쇼츠 전체 빌드: 본편(28초) + 브릿지노드 엔딩(7초) + 8bit 사운드 → hanjang-pixel-shorts.mp4
set -euo pipefail
cd "$(dirname "$0")"
SCENE=pixel/pixel.html node ../render.js pixel/pixel-silent.mp4 30 >/dev/null
[[ -f ../ending/bridgenode-ending.mp4 ]] || SCENE=ending/ending.html node ../render.js ending/bridgenode-ending.mp4 30 >/dev/null
python3 audio.py audio.wav
ffmpeg -v error -y -i pixel-silent.mp4 -i ../ending/bridgenode-ending.mp4 -i audio.wav \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a]aresample=48000,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart hanjang-pixel-shorts.mp4
rm -f pixel-silent.mp4 audio.wav
echo "✅ hanjang-pixel-shorts.mp4"
