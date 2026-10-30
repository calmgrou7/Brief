# Brief Studio — 3채널 숏폼 자동 제작기

글(JSON 대본) 하나만 넣으면 **1080×1920 세로 영상(유튜브 쇼츠·인스타 릴스)**, **SRT 자막**,
**업로드용 제목·설명·해시태그 텍스트**가 함께 나옵니다.

| 채널 | 프리셋 | 장면 형태 |
|---|---|---|
| 나우로 (부산 관광) | `nowro` | 카드뉴스/사진 이미지 + 줌·패닝 |
| 벤처의 기준 | `venture` | 캐릭터 + 말풍선 + 핵심 포인트 |
| 지혜로운 보험생활 (보험지기) | `bohumjigi` | 캐릭터 + 말풍선 + 상담 연결 CTA |

## 실행
```bash
pip install pillow edge-tts      # edge-tts: 한국어 AI 내레이션 (무료, 인터넷 필요)
# ffmpeg 필요
python3 studio/make_video.py studio/examples/nowro.json studio/examples/venture.json studio/examples/bohumjigi.json
```
결과물은 `studio/output/`에 저장됩니다: `*.mp4`, `*.srt`, `*_post.txt`

- edge-tts가 동작하면 장면별 내레이션을 만들고, 장면 길이를 **음성 길이에 자동으로 맞춥니다**.
- 인터넷이 안 되면 무음 영상 + SRT로 만들어집니다.

## 대본(JSON) 쓰는 법
```json
{
  "channel": "bohumjigi",
  "out": "../output/파일명.mp4",
  "character": "assets/bohumjigi.png",
  "bgm": "assets/bgm.mp3",
  "scenes": [
    {"type": "talk", "top": "위쪽 큰 제목", "say": "말풍선 대사", "point": "강조 박스", "narration": "읽어줄 문장"},
    {"type": "card", "img": "cards/1.png", "top": "제목", "sub": "부제", "move": "in|out|pan|up", "narration": "..."},
    {"type": "cta",  "top": "마지막 제목", "say": "상담 유도 대사", "narration": "..."}
  ],
  "cta": ["버튼 문구 1줄", "버튼 문구 2줄"],
  "post": {"title": "업로드 제목", "description": "설명", "hashtags": ["#추가태그"]}
}
```
- `character`: 배경이 투명한 PNG 캐릭터 이미지 (`assets/`에 보관, 예: `assets/bohumjigi_female.png`). 비워두면 임시 캐릭터가 들어갑니다.
- `img`가 비어 있으면 임시 카드가 들어갑니다 (나우로 카드뉴스 PNG로 교체).
- 채널별 색상·뱃지·푸터·목소리·연락처·기본 해시태그는 `channels.json`에서 바꿉니다.
- `\n`으로 직접 줄을 나눌 수 있습니다.

## 폰트
`fonts/`의 Pretendard (SIL Open Font License 1.1).

## 모션 장면 (캐릭터 표정 + 애니메이션 그래픽)
`make_video.py`보다 더 복잡한 움직임이 필요할 때 씁니다. HTML로 장면을 짜고, 브라우저로 한 프레임씩 찍어서 영상으로 만듭니다.

```bash
# 1) 캐릭터 PNG 한 장 → 눈 감은 프레임, 입 벌린 프레임 생성 (얼굴 좌표는 *.face.json)
python3 studio/motion/char_frames.py studio/assets/bohumjigi_female.png studio/assets/bohumjigi_female.face.json
# 2) 장면 녹화 (Playwright + ffmpeg 필요)
node studio/motion/record.js studio/motion/scenes/bohumjigi_duplicate.html studio/output/motion_demo.mp4 10 30
```
- 캐릭터: 눈 깜빡임, 말할 때 입 움직임, 숨쉬듯 흔들림, 깜짝 점프, 끄덕임, 돋보기 반짝임
- 그래픽: 카드 슬라이드·겹침, 도장 쾅, 숫자 카운트업, 동전 새어 나감, 체크 표시 그리기, 화면 흔들림
- 장면 파일의 `window.seek(t)`가 t초의 화면을 정하므로 길이·타이밍은 숫자만 바꾸면 됩니다.
