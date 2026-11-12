# 부산 라인아트 쇼츠 (HERITAGE STUDIO B)

얇은 잉크 선 + 낮→밤 전환 스타일의 세로 쇼츠(1080×1920, 30fps)를 코드로 그려 렌더링하는 프로젝트.
`lib/`는 [JDhruv14/line-art-animation](https://github.com/JDhruv14/line-art-animation) (MIT, `lib/LICENSE`)의 라이브러리를 그대로 가져왔다.

## 구성 (오후 → 밤으로 흐르는 하루)
| # | 명소 | 시간대 | 상태 |
|---|---|---|---|
| 01 | 감천문화마을 | 오후 | 작성 완료 (렌더 검수 전) |
| 02 | 자갈치시장 | 늦은 오후 | 예정 |
| 03 | 영도대교 | 해질녘 | 예정 |
| 04 | 해운대 | 노을 | 예정 |
| 05 | 광안대교 | 밤 | 예정 |

## 실행
```sh
npm install
npm run dev                                  # 브라우저 미리보기 (?scene=3 으로 특정 장면부터)
node scripts/render.mjs --stills 1,4,8       # 특정 초의 스틸컷 → out/
node scripts/render.mjs                      # out/busan_lineart_shorts.mp4 + .srt
```
