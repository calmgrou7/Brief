#!/usr/bin/env bash
# 쇼츠 한 편 빌드: ./shorts/make.sh shorts/ep01 [--no-voice]
# slides.json → (내레이션 TTS) → 무음 영상 → BGM → 최종 MP4 (1080x1920, 30fps, H.264 + AAC)
set -euo pipefail
EP="${1:-$(dirname "$0")/ep01}"
HERE="$(cd "$(dirname "$0")" && pwd)"
rm -f "$EP/timing.json" "$EP/voice.wav"
if [[ "${2:-}" != "--no-voice" ]] && grep -q '"narration"' "$EP/slides.json"; then
  python3 "$HERE/voice.py" "$EP"
fi
node "$HERE/render.js" "$EP"
python3 "$HERE/bgm.py" "$EP"
if [[ -f "$EP/voice.wav" ]]; then
  # 음성이 있으면 BGM을 낮추고(덕킹) 음성을 앞으로
  ffmpeg -y -loglevel error -i "$EP/video_silent.mp4" -i "$EP/bgm.wav" -i "$EP/voice.wav" \
    -filter_complex "[1:a]volume=0.16[m];[2:a]aresample=44100,volume=1.0[v];[m][v]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.95[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$EP/short.mp4"
else
  ffmpeg -y -loglevel error -i "$EP/video_silent.mp4" -i "$EP/bgm.wav" \
    -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$EP/short.mp4"
fi
rm -f "$EP/video_silent.mp4" "$EP/bgm.wav" "$EP/voice.wav" "$EP"/preview_*.png
echo "✅ $EP/short.mp4"
