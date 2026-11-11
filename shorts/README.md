# Bridge Node 쇼츠 자동화

기획(대본) → 영상 → 음성 → 자막까지 한 번에. 업로드만 직접 하면 됩니다.

```
episodes/ep01.json  ──(python3 make.py)──▶  out/ep01.mp4   1080×1920, 음성·자막이 들어간 영상
   (대본: Claude가 작성)                    out/ep01.srt   자막 파일
                                            out/ep01.meta.json  유튜브 제목/설명/태그
```

## 토큰을 아끼는 구조
| 단계 | 누가 | 토큰 |
|---|---|---|
| 대본(JSON 30~40줄) | Claude | 한 편에 약 1~2천 토큰 |
| 영상 그리기, 음성(TTS), 합치기 | `make.py` (내 컴퓨터) | 0 |

- 영상 생성 AI(Veo, Kling 등)를 쓰지 않아서 영상 생성 비용이 없고, 결과도 매번 같은 디자인으로 나옵니다.
- 음성은 **edge-tts**(무료, API 키 없음)를 씁니다. 인터넷이 안 되면 espeak-ng로 대신 만듭니다(로봇 음성, 임시용).
- Claude에게는 "ep04 만들어줘"처럼 짧게만 말하면 됩니다. 규칙은 `CLAUDE.md`에 있어서 매번 다시 설명할 필요가 없습니다.

## 설치 (처음 한 번)
```bash
pip install pillow edge-tts
# ffmpeg 설치: macOS `brew install ffmpeg` / Windows `winget install ffmpeg`
# 한글 폰트: Noto Sans CJK (macOS·Windows는 기본 폰트로 대신 씀)
```

## 사용
```bash
cd shorts
python3 make.py episodes/ep01.json      # 한 편
python3 make.py episodes/*.json         # 전부
```

## 대본(JSON) 형식
```json
{
  "title": "유튜브 제목", "description": "설명", "tags": ["태그"],
  "scenes": [
    {"head": "화면 위 큰 제목, [강조]는 주황 박스",
     "say": "내레이션(음성). 장면 길이는 음성 길이에 자동으로 맞춤",
     "cap": "(선택) 아래 자막. 없으면 say를 그대로 씀",
     "cards": [{"n": 1, "t": "카드 제목", "s": "작은 설명", "kind": "check | pending | lock"}],
     "min": 3.0, "stagger": 0.4}
  ]
}
```
- 장면은 5개, 카드는 장면마다 4개까지 권장합니다. 전체 25~35초.
- 브랜드 이름, 색, 목소리, 서비스 설명은 `brand.json`에서 한 번만 고치면 모든 편에 적용됩니다.
