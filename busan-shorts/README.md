# 부산 라인아트 쇼츠 (HERITAGE STUDIO B)

얇은 잉크 선 + 낮→밤 전환 스타일의 세로 쇼츠(1080×1920, 30fps)를 코드로 그려 렌더링하는 프로젝트.
`lib/`는 [JDhruv14/line-art-animation](https://github.com/JDhruv14/line-art-animation) (MIT, `lib/LICENSE`)의 라이브러리를 그대로 가져왔다.

## 구성 (오후 → 밤으로 흐르는 하루)
| # | 명소 | 시간대 | 상태 |
|---|---|---|---|
| 01 | 감천문화마을 | 오후 | 완료 |
| 02 | 자갈치시장 | 늦은 오후 | 완료 |
| 03 | 영도대교 | 해질녘 | 완료 |
| 04 | 해운대 | 노을 | 완료 |
| 05 | 광안대교 | 밤 | 완료 |

## 실행
```sh
npm install
npm run dev                                  # 브라우저 미리보기 (?scene=3 으로 특정 장면부터)
node scripts/render.mjs --stills 1,4,8       # 특정 초의 스틸컷 → out/
node scripts/render.mjs                      # out/busan_lineart_shorts.mp4 + .srt
```

## 에피소드
| ep | 내용 | 브랜드 | 출력 |
|---|---|---|---|
| `busan` | 부산 5대 명소 하루 산책 | HERITAGE STUDIO B | `out/busan_lineart_shorts.mp4` |
| `gamcheon` | 감천문화마을 아침→밤 (전경·계단 골목·물고기 골목·지붕 위 노을·밤) | HERITAGE STUDIO B × NOWRO KOREA | `out/gamcheon_lineart_shorts.mp4` |
| `nowro` | 나우로 부산 광고 쇼츠 (훅→문제→해결→기능2개→CTA, 22초). 기획안 `docs/nowro_busan_ad_plan.md` | NOWRO KOREA | `out/nowro_busan_ad_shorts.mp4` |
| `soom` | 숨결 광고 쇼츠 (긴장→마음 고르기→추천→같이 숨쉬기→CTA, 24.6초). 기획안 `docs/soomgyeol_ad_plan.md` | 숨결 | `out/soomgyeol_ad_shorts.mp4` |
| `biz` | 기업정책지원사업 광고 쇼츠 (서류 더미→기관 창 난립→조건 설정→저장·PDF→CTA, 22초). 기획안 `docs/bizfunding_ad_plan.md` | 기업정책지원사업 | `out/bizfunding_ad_shorts.mp4` |
| `math` | 미니 수학의신 광고 쇼츠 (졸린 공부→VS 카운트다운→대결→레벨 업→CTA, 21.8초, **오리지널 음악 포함**). 기획안 `docs/mathgod_ad_plan.md` | 미니 수학의신 | `out/mathgod_ad_shorts.mp4` |
| `mathbn` | 미니 수학의신 광고 + **BridgeNode 엔딩** (24.5초, 음악·로고 사운드 포함) | 미니 수학의신 → BridgeNode | `out/mathgod_ad_shorts_bridgenode.mp4` |

`node scripts/render.mjs --ep gamcheon` · 미리보기 `npm run dev` 후 `/?ep=gamcheon` · 에피소드 추가는 `src/episodes.ts`.

## 결과물
- `out/busan_lineart_shorts.mp4` — 1080×1920, 30fps, 30.8초, 무음
- `out/busan_lineart_shorts.srt` — 자막 타이밍 기준 내레이션 SRT

## 새 명소 추가하기
`src/scenes/`에 장면 파일을 하나 추가하고(`gamcheon.ts` 참고: `title`, `caps`, `tau`=시간대, `update`),
`src/main.ts`의 `makers` 배열에 넣은 뒤 `node scripts/render.mjs`.

## 음악
에피소드에 `music: '<이름>'`을 주면 렌더 후 `scripts/music/<이름>.py`가 장면 시작 시각에 맞춘 WAV를 합성해 영상에 합친다.
샘플·외부 음원 없이 numpy로 직접 합성한 오리지널이라 저작권 걱정이 없다. (예: `scripts/music/math.py`)

## BridgeNode 엔딩
`src/scenes/bridgenode.ts`의 `bridgeNodeEnding`을 에피소드 `makers` 맨 끝에 넣으면 어느 영상이든 3.4초 브랜드 엔딩이 붙는다
(노드 두 개 → 다리 연결 → 워드마크, 상단 칩 자동 숨김). 색은 파일 상단 `BN`에서 바꾼다.
