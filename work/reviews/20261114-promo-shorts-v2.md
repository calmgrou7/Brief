# 검토 보고서: Stay B 숏폼 A안 "에디토리얼 노트" 재제작 (aae31d0)

- 검토일: 2026-11-14 (KST) · 검토자: reviewer
- 대상: `work/video/output/stayb-shorts-01/`(draft.mp4, storyboard 00~08, thumbnail.png, script.md, srt 3종, upload.md, fonts/Gaegu-Bold.ttf + OFL-Gaegu.txt), `stayb-shorts-02·03/`(thumbnail.png, upload.md), `work/handoffs/promo.md` 끝 편집자 메모
- 기준: `work/marketing/20261114-shorts-visual-review.md` A안 지시 1~11, 이전 검토 `work/reviews/20261114-promo-shorts.md`(필수 문구·금지 표현), 대표 결정(Stay B 가칭, 심볼 A, 질문 무료, 오프라인 선택 서비스 유료·준비 중 = 기획안 v2 결정 8)
- 확인 방법: ffprobe, 오디오 음량 측정, mp4에서 직접 프레임 추출(0·1·2.2·4.3·6.9·9.2·11.5·14.1·16.6·19.7초 + 11.75~12.5초 등장 모션 6장), 썸네일 3장 원본·25%(270px 폭) 비교, 썸네일 글자 오른쪽 끝 픽셀 측정, 색 대비 계산, srt·upload.md diff 정독, 폰트 라이선스 파일 확인
- 법적 판단은 법률 자문이 아니다. 2·3편은 게시 전 협업 행정사 감수가 전제다.

---

## 판정: 수정 요청 (반려 → 영상 편집자, 필수 1건)

- 디자인 재제작 자체는 잘 됐다. A안 지시 11개가 실제 영상·썸네일에 반영됐고, 이전 검토의 필수 문구·금지 표현도 그대로 지켜졌다.
- 반려 사유는 하나: **영상 화면에 오프라인 서비스가 "준비 중"이라는 표시가 없다.** 4~6번 장면(7.1~14.3초, 영상의 3분의 1 이상)이 `And real help in Busan.` → 웰컴 키트·멤버십 카드 → `Meet us offline.` + `Info sessions · First-week help · Meetups`로 지금 운영 중인 서비스처럼 보여 준다. 대표 결정 8과 공개 사이트는 `Optional paid service · coming soon / 유료 선택 서비스 · 준비 중`으로 표기한다. 캡션(upload.md)에는 `(coming soon)`이 있지만 영상은 캡션 없이 따로 퍼지므로(저장·공유·리포스트) 화면에도 있어야 한다. 과장 광고 위험이고, 한 줄 추가로 고칠 수 있다.
- 대표 판단이 필요한 쟁점: 없음.

---

## 1. 규격·파일

| 항목 | 결과 |
|---|---|
| `draft.mp4` | H.264 1080×1920, 30fps, yuv420p, 19.8초, AAC 48kHz 스테레오, 555,218바이트. 공통 규격(9:16, 15~30초) 충족 |
| 음원 | 무음 트랙만(음원·효과음 없음). 저작권 문제 없음 |
| 썸네일 3장 | 1080×1920 RGB. 25% 크기에서 세 제목 모두 읽힘 |
| 폰트 | `fonts/Gaegu-Bold.ttf` + `OFL-Gaegu.txt`(SIL OFL 1.1 전문 + 저작권 표기). Bricolage Grotesque·Figtree OFL 파일도 그대로. 영상 번인·이미지 사용 가능(폰트 파일 단독 판매만 금지). 적합 |
| 이미지 | 전부 코드로 그린 도형. 외부 이미지·상표 로고 없음. 사람 없음 |
| `__pycache__` | 저장소에 없음(이전 검토 정리 항목 해소) |

## 2. A안 지시 1~11 확인

| # | 지시 | 결과 |
|---|---|---|
| 1 | 안전 영역(위 220·아래 420·오른쪽 140, 왼쪽 88, 왼쪽 정렬) | 적합. 모든 글자 왼쪽 정렬, 고지는 y 약 1440~1480. 썸네일 3편 제목 오른쪽 끝 최대 929px(< 940). 휴대폰 4번째 버튼은 글자 대신 회색 막대로 처리 |
| 2 | 글자 크기 | 적합. 첫 제목 230px, 장면 제목 140~170px, 보조 56~64px, 라벨 34px, 고지 32px |
| 3 | 번인 말 자막 띠 | 해당 없음(말소리 없는 시안). 편집자 판단 수용 |
| 4 | 색 면적 | 적합. 크림 4컷 / 청록 전면 2컷 / 웜틴트 2컷, 노랑은 장면당 형광펜 1단어 + 그림 면. 노랑 위 글자 ink(대비 7.9:1) |
| 5 | 노선 진행 막대 | 적합. y≈260, 정거장 8개, 현재 정거장 노랑, 지난 정거장 청록. 8번 장면에서 광안대교 아치 + 노랑 정거장 |
| 6 | 모션 | 적합. 11.75~12.5초 프레임에서 줄 단위 마스크 등장 확인(반투명 글자 없음 = 페이드 아님). 회전·확대·튕김 없음. 정지 1.23~1.64초 |
| 7 | 컷 길이 | 적합. 0초 프레임에 `New to Busan?` 이미 보임. 8컷, 장면 2.0~3.0초, 19.8초 |
| 8 | 일러스트 | 적합. 잉크 외곽선 + 3색 면, 화면 가장자리에 걸치거나 잘리게 배치. 부산 모티프(언덕 마을, 광안대교, 페리, 물결, 갈매기) |
| 9 | 손글씨 | 적합. 8번 장면 `see you / in Busan` 1곳, Gaegu Bold, 잉크색, 기울임 |
| 10 | 썸네일 공통 틀 | 적합. 라벨+번호 → 큰 제목 2~3줄 + 형광펜 → 오른쪽 아래 사물 → 색 띠(01 청록 / 02 노랑 / 03 웜틴트). 로고는 라벨 크기 누운 B 심볼 |
| 11 | 고지·DRAFT 유지 | 적합. `Concept · Stay B is a working name` 문구 그대로 전 장면. 2·3편 `DRAFT · NOT FOR POSTING · needs expert review` 유지(위 안전선 아래) |

## 3. 대표 결정·이전 검토 기준 유지

| 기준 | 결과 |
|---|---|
| Stay B(가칭) | 적합. 고지 전 장면·썸네일·upload.md 유지 |
| 심볼 A(누운 B) | 적합. 라벨·멤버십 카드·엔드카드 모두 누운 B 심볼, 청록 위 반전형 |
| 질문 무료 | 적합. `Free guides. / Free to ask.`만 무료로 표기. 오프라인 서비스를 무료라고 쓴 곳 없음 |
| 오프라인 유료·준비 중 | **영상 화면 미반영 → 필수 V2-1.** upload.md 1편 Reels·TikTok·Threads `(coming soon)`, YouTube `(details to be shared later)`는 유지됨 |
| 웰컴 키트·카드 | `(mockup)` 표기 유지. 적합 |
| 필수 문구·금지 표현(이전 검토) | 이번 커밋은 2·3편 upload.md의 썸네일·폰트 줄만 바꿈. 3편 필수 한 줄(직업소개 경계), 2편 `We do not apply for you`·`Not an official government or school service`, `licensed immigration administrative agent` 표기, 행정사 감수 전 게시 금지 표시 모두 그대로. srt는 시간만 바뀌고 문구 동일(diff 확인) |
| 개인정보 | 해당 없음(사람·실제 서류·장소 없음) |

## 4. 편집자 메모 "검토자가 판단할 것" 4가지

1. **3편 썸네일 제목 `Your first part-time job?`** — **수용.** 바로 아래 `Get permission first.`가 25% 크기에서도 읽혀 "허가부터 받으라"는 안내로 읽히고, 일자리를 소개·알선한다는 문장(예: "Find your job", "We connect you")이 없다. 원문 `Before your first part-time job`은 200px·3줄 규칙에 들어가지 않아 줄인 판단도 합리적이다. 3편은 어차피 행정사 감수 전 게시 금지이므로 감수 때 제목도 함께 본다. (권장 R-1에 대안 문구)
2. **고지 두 줄 나눔(`Concept ·` / `Stay B is a working name`)** — **수용.** 문구·크기(32px) 동일, 그림과 겹치지 않음. 첫 줄 끝 가운뎃점이 혼자 남아 조금 어색한 정도(권장 R-2).
3. **웜틴트 장면 고지 흙빛·라벨 청록** — **수용.** 지시 11의 흰색은 웜틴트 `#FCEBD7` 위 대비 1.17:1로 읽히지 않는다. 흙빛 `#A9481F` 4.95:1, 청록 `#0B6B66` 5.44:1로 둘 다 기준(4.5:1) 이상이고, 명세의 "오프라인 = 흙빛 글자" 규칙과도 맞다.
4. **3번 장면 체크리스트 `SIM card · Transit card · Bank account`** — **수용.** 기획안 v2 입국 단계 카드(유심·교통카드)·카드 2-2(은행·휴대폰 개설 순서)와 같은 주제의 생활 항목이고, 순서·서류·요건 같은 사실 주장이 없다. 체크 표시는 "목록 예시"로만 읽힌다.

---

## 5. 고칠 목록

### 영상 편집자 (필수)
| # | 어디 | 무엇을 | 어떻게 |
|---|---|---|---|
| V2-1 | `stayb-shorts-01/make_draft.py` 6번 장면(11.7~14.3초) → `draft.mp4`, `storyboard/storyboard_06.png`·`storyboard_00_safe-zone-check.png` 재생성 | 오프라인 서비스 목록이 운영 중처럼 보임(대표 결정 8 "유료 선택 서비스 · 준비 중"과 불일치) | 정거장 목록(`Meetups`) 아래에 한 줄 추가: `Coming soon` (Figtree 600, 40px 이상, 흙빛 `#A9481F` 또는 청록, 왼쪽 88px 정렬, 안전 영역 안). 목록과 같은 마스크 등장 규칙, 추가 후에도 정지 1.2초 이상 유지. 문구를 더 넣고 싶으면 `Some services will be paid · coming soon`까지 허용(사이트 표기와 같은 뜻). 4·5번 장면은 손대지 않아도 됨 |
| V2-1(자막) | `captions_en.srt`·`captions_ko.srt`·`captions_ne_draft_needs-native-review.srt` 6번 | 화면과 맞춤 | EN 6번 끝 줄에 `(coming soon)`, KO `(준비 중)`, NE 초안에도 같은 위치 추가(검수 표기 유지). `script.md` A안 장면표 6번 행에도 반영 |

### 영상 편집자 (권장, 이번 통과 조건 아님)
- R-1: 3편 썸네일을 감수 때 바꿀 필요가 생기면 대안 `Part-time job? / Permission first.`(질문 + 행동 지시가 한 화면에 들어가 오해 여지가 더 적음).
- R-2: 고지 두 줄 나눔에서 첫 줄 끝 `·`가 혼자 남음. 지시 11상 문구 변경 금지라 그대로 둬도 됨. 다음 템플릿 손볼 때 `Concept · Stay B` / `is a working name`처럼 끊는 위치만 바꾸는 방안 검토.
- R-3: `captions_en.srt` 6번에 화면 제목 `Meet us offline.`이 빠져 있음(영어는 번인이라 영향 작음). V2-1 고칠 때 같이 넣으면 좋다.
- R-4: 1편 upload.md YouTube 긴 설명 `(details to be shared later)`를 사이트 FAQ와 같은 뜻 `(some will be paid services, details coming soon)`로 맞추면 대표 결정 8과 문장까지 일치.

## 6. 다시 검토할 때 볼 것
- 6번 장면 프레임(약 14.0초)에 `Coming soon` 표시, 안전 영역·정지 시간 유지
- srt 3종 6번 반영, 나머지 장면·썸네일은 바뀌지 않았는지 diff만 확인

---

## 재검토(bbc9e9b) — V2-1만

**판정: 통과**

| 항목 | 확인 결과 |
|---|---|
| draft.mp4 규격 | ffprobe: h264 1080×1920, 30fps, 19.8초. aac 트랙은 max -91dB(사실상 무음) — 이전과 동일 |
| 6번 `Coming soon` | `make_draft.py` s6에 `body_lines(["Coming soon"], 48, CLAY, 1200, T0 + 5*STAGGER)` 한 줄 추가. Figtree 600 48px(기준 40px 이상), 흙빛 `#A9481F`, 왼쪽 88px로 목록 글머리와 정렬 |
| 프레임 12.5초 | 목록 2번째 줄 마스크 등장 중, `Coming soon` 아직 없음(같은 줄 단위 등장 규칙 확인) |
| 프레임 12.9·14.1초 | `Coming soon` 전부 보임. 청록 띠(1380)·고지 문구·엽서 그림(x 640~)과 겹치지 않고 안전 영역 안 |
| 정지 시간 | 12.9초 이전 완료 → 장면 끝 14.3초까지 1.3초 이상(기준 1.2초 이상) |
| 다시 만든 파일 | `draft.mp4`, `storyboard_06.png`, `storyboard_00_safe-zone-check.png`만. 다른 장면·썸네일 변경 없음(커밋 stat) |
| 자막 3종 6번 | EN `(coming soon)` 끝 줄 + R-3 `Meet us offline.` 첫 줄 추가(화면 제목과 일치). KO `모임 (준비 중)`, NE `भेटघाट (छिट्टै आउँदैछ)`, NE 파일명 검수 표기 유지. 시간 코드 변경 없음 |
| script.md | 장면표 6번 행에 `Coming soon`·자막 표기 반영 |
| upload.md | YouTube 설명 `(some will be paid services, details coming soon)` — 대표 결정 8·사이트 FAQ와 같은 뜻(R-4 반영). 게시 전 체크리스트에 "운영 시작해도 유료 표기는 유지" 명시. Reels·TikTok·Threads `(coming soon)` 유지 |
| 추가 문구 `Meet us offline.` | 화면 제목 그대로 옮긴 것. 새 주장 없음, 금지 표현 없음 |

**남은 수정: 없음(필수).**

권장(통과 조건 아님)
- R-5: KO·NE 자막은 `(준비 중)`이 `모임` 줄 끝에만 붙어 "모임만 준비 중"으로 읽힐 여지가 있음(화면의 `Coming soon`은 세 항목 전체 아래). 다음 수정 때 KO를 `설명회 · 첫 주 지원 · 모임` / `(준비 중)` 두 줄로, NE도 같은 방식으로 나누면 화면과 뜻이 정확히 일치. 영어는 번인이라 화면 기준으로 이미 맞음.
- R-1·R-2는 편집자 판단대로 다음 템플릿 작업 때.
