# 인생실록 질문카드 쇼츠 생성기

`config.json`의 질문, 장면 좌표, 문구만 바꾼 뒤 아래 명령을 실행하면 1080x1920 쇼츠가 자동으로 만들어집니다.

    python3 make_short.py            # → output/insaengsillok_short.mp4 + _thumbnail.png

- `cards[].box`: 포스터에서 잘라 쓸 장면 좌표 `[x0, y0, x1, y1]`
- `cards[].q` / `hint`: 질문 / 보조 문구 (`\n`은 줄바꿈)
- 다른 포스터를 쓰려면 `poster` 경로와 좌표만 바꾸면 됩니다.
- 폰트(고운바탕, OFL)는 처음 실행할 때 자동으로 내려받습니다.
- 오디오는 무음 트랙만 들어 있으므로, 배경음악은 업로드할 때 쇼츠 앱에서 추가하세요.
