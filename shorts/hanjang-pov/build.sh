#!/usr/bin/env bash
# 한장견적 POV 밈 쇼츠 빌드: 본편(26.4초) + 브릿지노드 엔딩 크림(7초) + 밈 비트 → hanjang-pov-shorts.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
SCENE=hanjang-pov/scene.html node render.js hanjang-pov/main-silent.mp4 30 >/dev/null
[[ -f ending/bridgenode-ending-warm.mp4 ]] || SCENE='ending/ending.html?theme=warm' node render.js ending/bridgenode-ending-warm.mp4 30 >/dev/null
cd hanjang-pov && python3 audio.py audio.wav
ffmpeg -v error -y -i main-silent.mp4 -i ../ending/bridgenode-ending-warm.mp4 -i audio.wav \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a]aresample=48000,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart hanjang-pov-shorts.mp4
rm -f main-silent.mp4 audio.wav
echo "✅ hanjang-pov/hanjang-pov-shorts.mp4"
