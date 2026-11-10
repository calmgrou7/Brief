# 진로산사 (테스트 버전 v0.1)

중·고등학생이 **하루 한 질문**으로 "나는 어떤 사람이 될까?"를 스스로 풀어보는 산사 느낌의 진로 코칭 웹앱입니다.

- 기획서: [`docs/PLAN.md`](docs/PLAN.md)
- 앱: [`app/`](app/) (빌드 없는 순수 HTML/CSS/JS)

## 흐름
산문(입구, 자동 닉네임) → 숨 고르기 → 오늘의 질문(칩 선택 + 한 줄) → 종 치기 → 길잡이의 한마디 + 작은 실천 → 염주(7일 진행) → 7일 완주 시 **나의 길 카드** (PNG 저장 / 텍스트 복사)

## 바로 실행해 보기
```bash
cd app && python3 -m http.server 8080
```
- 일반 모드: http://localhost:8080 (하루에 질문 하나씩 열림)
- **테스트 모드**: http://localhost:8080/?test=1 (7일을 한 번에 체험)

## 수정 포인트
| 바꾸고 싶은 것 | 파일 |
|---|---|
| 질문, 선택지, 코칭 문장, 작은 실천 | `app/js/content.js` |
| 추천 분야·학과 (RIASEC) | `app/js/content.js`의 `RIASEC` |
| 실시간 '함께하기' 켜기 | `app/js/config.js`에 Supabase URL과 anon 키 입력 |
| 색, 글꼴 | `app/css/style.css` 맨 위 `:root` |

## 실시간 '함께하기' (선택)
Supabase 프로젝트의 URL과 anon 키를 `app/js/config.js`에 넣으면 다음 기능이 켜집니다. 테이블은 만들 필요가 없습니다.
- "지금 N명이 함께 생각하는 중" (Presence, 방 하나에 100명)
- 다른 학생이 종을 치면 화면에 등불이 떠오름 (Broadcast)

주고받는 데이터는 자동 닉네임과 종을 쳤다는 신호뿐이고, **답변은 학생 기기에만 저장**됩니다.

## 배포
`app/` 폴더를 정적 호스팅(Render Static Site, Vercel, Netlify, GitHub Pages)에 올리면 됩니다.
