#!/usr/bin/env bash
# 나우로 부산 쇼츠 전체 빌드: 본편(31.5초) + 브릿지노드 엔딩 다크 버전(7초) + 오리지널 사운드 → nowro-busan-shorts.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
SCENE=nowro/scene.html node render.js nowro/main-silent.mp4 30 >/dev/null
[[ -f ending/bridgenode-ending-dark.mp4 ]] || SCENE='ending/ending.html?theme=dark' node render.js ending/bridgenode-ending-dark.mp4 30 >/dev/null
cd nowro && python3 audio.py audio.wav
ffmpeg -v error -y -i main-silent.mp4 -i ../ending/bridgenode-ending-dark.mp4 -i audio.wav \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v];[2:a]aresample=48000,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map "[v]" -map "[a]" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest -movflags +faststart nowro-busan-shorts.mp4
rm -f main-silent.mp4 audio.wav
echo "✅ nowro/nowro-busan-shorts.mp4"
