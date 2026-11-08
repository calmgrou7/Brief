# 수학의 신 · God of Math

책과 이론으로 겨루는 수학 랭킹 앱 — 중학교부터 대학원·연구 수준까지, 한국어/English.

- 기획서: [`docs/PLAN.md`](docs/PLAN.md)
- 서버 연결 가이드: [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md)
- DB 마이그레이션: [`supabase/migrations/`](supabase/migrations)

## 두 가지 모드
| 모드 | 조건 | 용도 |
|---|---|---|
| 로컬(데모) | `.env.local` 없음 | 기획 확인·오프라인 데모. 데이터는 브라우저에만 저장 |
| 서버(Supabase) | `.env.local`에 URL·공개키 | 실서비스. 회원가입·랭킹 공유, 정답·점수는 서버가 처리 |

## 실행
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 채점·레벨·Elo·문제은행 검증
npm run build    # dist/ 정적 파일 → Vercel/Netlify/GitHub Pages 배포
npm run seed:gen # 문제은행 → supabase/migrations/0002_seed_problems.sql 재생성
```
개발 모드의 프로필 화면에 **데모: +1000 XP** 버튼이 있어 Lv.10 출제 기능을 바로 시험할 수 있습니다. (심사는 다른 계정으로 로그인해 진행)

## 구조
```
src/
  data/problems.ts   5단계 40문항 (한/영, 근거 이론, 해설)
  lib/game.ts        레벨·XP·Elo·채점·등급 규칙
  lib/actions.ts     문제 제출 처리 (보상·레이팅)
  lib/api/           데이터 계층: local.ts(브라우저) / supabase.ts(서버) — 화면은 이 인터페이스만 사용
  lib/store.ts       로컬 모드 저장소
  pages/             홈, 문제, 대결, 랭킹, 연구소(출제·심사), 프로필, 로그인
  i18n.ts            한국어/영어 사전
public/logo.svg      로고 (원본 PNG가 있으면 public/logo.png 로 교체 가능)
```
