# 쇼츠 자동 생성기 (벤처 심사실 시리즈)

주제 하나 → `slides.json` 작성 → 명령 한 줄로 세로 쇼츠 MP4 완성.

```bash
./shorts/make.sh shorts/ep01           # 최종 영상: shorts/ep01/short.mp4 (+ thumbnail.png)
node shorts/render.js shorts/ep01 --preview   # 슬라이드별 PNG로 빠른 검수
```

- `characters.js` 오리지널 픽셀 캐릭터 7종 (대표·투자 매니저·연구소장·혁신 심사위원·예비 창업자·세무 담당·행정 담당)
- `render.js` 슬라이드 HTML 생성 → Playwright 프레임 캡처 → ffmpeg 인코딩
- `bgm.py` 오리지널 8비트 BGM + 전환 효과음 합성 (저작권 걱정 없음)
- 슬라이드 타입: `lineup`(캐릭터 단체), `speech`(말풍선), `cards`(카드 목록), `focus`(강조)
- 새 편: `shorts/ep01`을 복사해 `slides.json`과 `script.md`만 고치면 됩니다.
- 폰트: Pretendard (SIL OFL 1.1, 상업적 이용 가능)

필요한 것: Node 18+, `playwright`, ffmpeg, Python3 + numpy
