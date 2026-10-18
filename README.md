# Brief — 영상 제작 자동화 스택

편집 프로그램 없이 **대본 → 내레이션 → 자막 → 컷 편집 → 모션그래픽**을 코드로 처리하는 무료 툴 5종.

| # | 툴 | 역할 | 위치 / 명령 |
|---|----|------|-------------|
| 1 | **HyperFrames** | 모션 그래픽을 HTML+GSAP 코드로 | `motion/` · `npm run motion:dev` / `motion:render` |
| 2 | **Remotion** | 같은 틀로 시리즈 대량 생산 (React) | `remotion/` · `npm run series:render -- out/ep02.mp4 --props='{"episode":2,"title":"...","subtitle":"..."}'` |
| 3 | **Whisper** | 단어 단위 받아쓰기 · 자막(SRT) | `npm run transcribe -- rec.mp4` → `out/rec.words.json`, `out/rec.srt` |
| 4 | **FFmpeg** | 자르기 · 붙이기 · 음량 · 자막 입히기 | `npm run cut -- trim rec.mp4 2.4 8.7 out/clip.mp4` |
| 5 | **Google AI Studio** | 대본 → 내레이션 목소리 (Gemini TTS) | `npm run tts -- script.txt out/voice.wav Kore` |

## 설치 (한 번만)

필요: Node.js 22+, Python 3.10+

```bash
npm run setup        # FFmpeg(없으면) + npm 패키지 + Python venv(Whisper) 설치
# .env 에 GEMINI_API_KEY 입력 (https://aistudio.google.com/apikey 무료 발급)
npm run doctor       # 설치 상태 점검
```

## 하루 한 편 파이프라인 예시

```bash
npm run tts -- script.txt out/voice.wav                       # 1. 대본 → 목소리
npm run series:render -- out/base.mp4 --props='{"episode":3,"title":"FFmpeg","subtitle":"자르기 한 줄로"}'  # 2. 템플릿 영상
npm run cut -- voice out/base.mp4 out/voice.wav out/voiced.mp4 # 3. 목소리 입히기
npm run transcribe -- out/voiced.mp4                          # 4. 자막 생성
npm run cut -- subs out/voiced.mp4 out/voiced.srt out/final.mp4 # 5. 자막 burn-in
```

## 참고
- `motion/CLAUDE.md` 는 HyperFrames 가 생성한 AI 작업 가이드입니다. Claude 에게 "motion 폴더에 15초 인트로 만들어줘" 처럼 말로 시키면 됩니다.
- Whisper 모델은 첫 실행 때 자동 다운로드됩니다 (`--model small` 기본, 정확도 원하면 `large-v3`).
- Remotion 은 개인/3인 이하 회사는 무료, 그 이상은 상업 라이선스가 필요합니다.
