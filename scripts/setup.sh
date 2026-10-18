#!/usr/bin/env bash
# 5가지 영상 제작 툴 한 번에 설치: HyperFrames · Remotion · Whisper · FFmpeg · Google AI Studio(Gemini)
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v ffmpeg >/dev/null; then
  echo "▶ FFmpeg 설치"
  if command -v brew >/dev/null; then brew install ffmpeg
  elif command -v apt-get >/dev/null; then sudo apt-get update && sudo apt-get install -y ffmpeg
  elif command -v winget >/dev/null; then winget install Gyan.FFmpeg
  else echo "FFmpeg 를 수동 설치하세요: https://ffmpeg.org/download.html"; exit 1; fi
fi

echo "▶ Node 패키지 (HyperFrames, Remotion, Gemini SDK)"
npm install

echo "▶ Python 가상환경 (Whisper)"
python3 -m venv .venv
.venv/bin/pip install -q -r requirements.txt

[ -f .env ] || cp .env.example .env
echo
echo "✓ 설치 완료. .env 에 GEMINI_API_KEY 를 넣고 'npm run doctor' 로 확인하세요."
