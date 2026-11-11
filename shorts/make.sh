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
  # 음성 다듬기: 잡음 컷 → 치찰음 완화 → 압축(크기 고르게) → 살짝 공간감
  # 음악은 말할 때만 자동으로 줄어듦(사이드체인 덕킹), 최종 -14 LUFS(SNS 표준 음량)
  VOICE_FX="aresample=48000:resampler=soxr,highpass=f=80,lowpass=f=14000,deesser=i=0.4,acompressor=threshold=-20dB:ratio=3:attack=5:release=150:makeup=2,aecho=0.8:0.6:35:0.07"
  MIX="[2:a]${VOICE_FX},asplit=2[v][sc];[1:a]aresample=48000:resampler=soxr,volume=0.13[m0];[m0][sc]sidechaincompress=threshold=0.015:ratio=5:attack=40:release=500[m];[m][v]amix=inputs=2:duration=first:normalize=0"
  # 1차: 음량 측정 → 2차: 측정값으로 '선형' 정규화 (말과 쉬는 구간의 차이 유지)
  M=$(ffmpeg -hide_banner -i "$EP/bgm.wav" -i "$EP/bgm.wav" -i "$EP/voice.wav" -filter_complex "${MIX},loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json" -f null - 2>&1 \
      | python3 -c "import sys,json,re;d=json.loads(re.findall(r'\{[^{}]*\}',sys.stdin.read())[-1]);print(f\"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}\")")
  ffmpeg -y -loglevel error -i "$EP/video_silent.mp4" -i "$EP/bgm.wav" -i "$EP/voice.wav" \
    -filter_complex "${MIX},loudnorm=I=-14:TP=-1.5:LRA=11:${M}:linear=true[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$EP/short.mp4"
else
  ffmpeg -y -loglevel error -i "$EP/video_silent.mp4" -i "$EP/bgm.wav" \
    -c:v copy -c:a aac -b:a 160k -shortest -movflags +faststart "$EP/short.mp4"
fi
rm -f "$EP/video_silent.mp4" "$EP/bgm.wav" "$EP/voice.wav" "$EP"/preview_*.png
echo "✅ $EP/short.mp4"
