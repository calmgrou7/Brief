# 쇼츠 자동 생성기 (벤처 심사실 시리즈)

주제 하나 → `slides.json` 작성 → 명령 한 줄로 세로 쇼츠 MP4 완성.

```bash
./shorts/make.sh shorts/ep01             # 최종 영상(음성 포함): shorts/ep01/short.mp4 (+ thumbnail.png)
./shorts/make.sh shorts/ep01 --no-voice  # 음성 없이 자막+BGM만
node shorts/render.js shorts/ep01 --preview   # 슬라이드별 PNG로 빠른 검수
```

- `characters.js` 오리지널 픽셀 캐릭터 7종 (대표·투자 매니저·연구소장·혁신 심사위원·예비 창업자·세무 담당·행정 담당)
- `render.js` 슬라이드 HTML 생성 → Playwright 프레임 캡처 → ffmpeg 인코딩
- `voice.py` 슬라이드별 `narration` → 한국어 TTS 음성 (오프라인·무료, sherpa-onnx + KSS 여성 음성). 슬라이드 길이를 음성에 맞춰 자동으로 늘리고, BGM은 음성 아래로 낮춤
- `bgm.py` 오리지널 BGM 합성 (기본 `soft` 이어지는 패드 / `"bgm": "8bit"`로 변경 가능, 저작권 걱정 없음)
- 음성 다듬기: 치찰음 완화·압축·공간감, 말할 때만 음악 자동으로 줄이기(덕킹), 최종 -14 LUFS
- 목소리 바꾸기: `slides.json` → `"voice": {"engine": "google", "name": "ko-KR-Chirp3-HD-Algieba"}` (Google TTS 키 필요). 후보 비교: `python3 shorts/voice.py shorts/ep01 --samples`
- 슬라이드 타입: `lineup`(캐릭터 단체), `speech`(말풍선), `cards`(카드 목록), `focus`(강조)
- 새 편: `shorts/ep01`을 복사해 `slides.json`과 `script.md`만 고치면 됩니다.
- 폰트: Pretendard (SIL OFL 1.1, 상업적 이용 가능)

필요한 것: Node 18+, `playwright`, ffmpeg, Python3 + numpy, `pip install sherpa-onnx==1.12.40 soundfile`
