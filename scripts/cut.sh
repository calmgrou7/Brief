#!/usr/bin/env bash
# FFmpeg: 자르기 · 붙이기 · 음량 맞추기를 한 줄로
#   scripts/cut.sh trim  rec.mp4 2.4 8.7 out/clip.mp4    # 2.4초~8.7초 자르고 음량 정규화(-14 LUFS)
#   scripts/cut.sh join  out/joined.mp4 a.mp4 b.mp4 ...   # 여러 클립 이어붙이기
#   scripts/cut.sh voice video.mp4 voice.wav out/final.mp4  # 영상에 내레이션 입히기
#   scripts/cut.sh subs  video.mp4 subs.srt out/subbed.mp4  # 자막 burn-in
set -euo pipefail
LOUD="loudnorm=I=-14:TP=-1.5:LRA=11"

case "${1:-}" in
  trim)  ffmpeg -y -i "$2" -ss "$3" -to "$4" -af "$LOUD" -c:v libx264 -preset fast -crf 20 -c:a aac "$5" ;;
  join)  out="$2"; shift 2
         list=$(mktemp); for f in "$@"; do echo "file '$(realpath "$f")'" >> "$list"; done
         ffmpeg -y -f concat -safe 0 -i "$list" -c copy "$out"; rm "$list" ;;
  voice) ffmpeg -y -i "$2" -i "$3" -map 0:v -map 1:a -af "$LOUD" -c:v copy -c:a aac -shortest "$4" ;;
  subs)  ffmpeg -y -i "$2" -vf "subtitles=$3:force_style='FontSize=14,Outline=2'" -c:a copy "$4" ;;
  *)     sed -n '2,6p' "$0"; exit 1 ;;
esac
