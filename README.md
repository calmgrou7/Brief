# 수학의 신 · God of Math

책과 이론으로 겨루는 수학 랭킹 앱 — 중학교부터 대학원·연구 수준까지, 한국어/English.

- 기획서: [`docs/PLAN.md`](docs/PLAN.md)
- 운영 DB 스키마(Supabase): [`supabase/schema.sql`](supabase/schema.sql)

## 실행
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 채점·레벨·Elo·문제은행 검증
npm run build    # dist/ 정적 파일 → Vercel/Netlify/GitHub Pages 배포
```
개발 모드의 프로필 화면에 **데모: +1000 XP** 버튼이 있어 Lv.10 출제 기능을 바로 시험할 수 있습니다. (심사는 다른 계정으로 로그인해 진행)

## 구조
```
src/
  data/problems.ts   5단계 40문항 (한/영, 근거 이론, 해설)
  lib/game.ts        레벨·XP·Elo·채점·등급 규칙
  lib/actions.ts     문제 제출 처리 (보상·레이팅)
  lib/store.ts       데이터 계층 (로컬) — Supabase로 교체 지점
  pages/             홈, 문제, 대결, 랭킹, 연구소(출제·심사), 프로필, 로그인
  i18n.ts            한국어/영어 사전
public/logo.svg      로고 (원본 PNG가 있으면 public/logo.png 로 교체 가능)
```
