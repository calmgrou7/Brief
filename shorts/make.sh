#!/usr/bin/env bash
# 쇼츠 한 편 빌드: ./shorts/make.sh shorts/ep01
# slides.json → 무음 영상 → BGM → 최종 MP4 (1080x1920, 30fps, H.264 + AAC)
set -euo pipefail
EP="${1:-$(dirname "$0")/ep01}"
HERE="$(cd "$(dirname "$0")" && pwd)"
node "$HERE/render.js" "$EP"
python3 "$HERE/bgm.py" "$EP"
ffmpeg -y -loglevel error -i "$EP/video_silent.mp4" -i "$EP/bgm.wav" \
  -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$EP/short.mp4"
rm -f "$EP/video_silent.mp4" "$EP/bgm.wav" "$EP"/preview_*.png
echo "✅ $EP/short.mp4"
