#!/usr/bin/env bash
# 메인 배경 영상 자동 변환기
# 사용법: tools/make-hero-video.sh <원본영상> [시작초] [길이초]
#   예)   tools/make-hero-video.sh ~/Downloads/시공영상.mp4 0 12
# 결과:   images/hero/main.mp4        (PC용 1920px, 소리 제거)
#         images/hero/main-mobile.mp4 (휴대폰용 720px 세로, 소리 제거)
#         images/hero/poster.jpg      (로딩 전 첫 화면)
# 그 다음 js/config.js 의 hero.video / videoMobile / poster 에 위 경로를 넣으면 끝.
set -euo pipefail
command -v ffmpeg >/dev/null || { echo "ffmpeg 가 필요합니다 (brew install ffmpeg / apt install ffmpeg)"; exit 1; }

IN="${1:?원본 영상 경로를 입력하세요}"
SS="${2:-0}"
DUR="${3:-12}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/images/hero"
mkdir -p "$OUT"

# PC: 16:9 로 가운데 잘라 1920x1080, 소리 제거, 웹 스트리밍 최적화
ffmpeg -loglevel error -y -ss "$SS" -t "$DUR" -i "$IN" -an \
  -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=24,format=yuv420p" \
  -c:v libx264 -preset slow -crf 28 -profile:v high -movflags +faststart "$OUT/main.mp4"

# 휴대폰: 9:16 로 가운데 잘라 720x1280, 더 가볍게
ffmpeg -loglevel error -y -ss "$SS" -t "$DUR" -i "$IN" -an \
  -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280,fps=24,format=yuv420p" \
  -c:v libx264 -preset slow -crf 30 -profile:v main -movflags +faststart "$OUT/main-mobile.mp4"

# 포스터 이미지 (첫 프레임)
ffmpeg -loglevel error -y -i "$OUT/main.mp4" -frames:v 1 -q:v 4 "$OUT/poster.jpg"

ls -lh "$OUT"/main.mp4 "$OUT"/main-mobile.mp4 "$OUT"/poster.jpg
echo "완료 → js/config.js 에 video: \"images/hero/main.mp4\", videoMobile: \"images/hero/main-mobile.mp4\", poster: \"images/hero/poster.jpg\""
