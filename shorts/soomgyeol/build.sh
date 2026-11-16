#!/usr/bin/env bash
# 숨결 쇼츠 전체 빌드: 본편(32.5초) + 브릿지노드 엔딩 크림 버전(7초) + 오리지널 사운드 → soomgyeol-shorts.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
SCENE=soomgyeol/scene.html node render.js soomgyeol/main-silent.mp4 30 >/dev/null
[[ -f ending/bridgenode-ending-warm.mp4 ]] || SCENE='ending/ending.html?theme=warm' node render.js ending/bridgenode-ending-warm.mp4 30 >/dev/null
cd soomgyeol && python3 audio.py audio.wav
ffmpeg -v error -y -i main-silent.mp4 -i ../ending/bridgenode-ending-warm.mp4 -i audio.wav \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a]aresample=48000,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart soomgyeol-shorts.mp4
rm -f main-silent.mp4 audio.wav
echo "✅ soomgyeol/soomgyeol-shorts.mp4"
