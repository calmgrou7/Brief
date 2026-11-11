# 정우회 회원 플랫폼

기업가 대표 모임 **정우회**의 회원명부·가디언(추천인)·임원진·행사·연혁을 관리하는 회원 전용 대시보드.

- 기획서: [`docs/PLAN.md`](docs/PLAN.md)
- 사이트: [`web/index.html`](web/index.html) (빌드 없는 단일 페이지, 정적 호스팅은 `web/` 폴더만 공개)
- DB 스키마: [`supabase/migrations/`](supabase/migrations/)
- 초기 회원명부: [`data/members_seed.csv`](data/members_seed.csv) (DB에 이관 완료)

## 구조
| 구성 | 내용 |
|---|---|
| DB / 로그인 / 파일 | Supabase 프로젝트 `dongne-expert` 안의 `jw_` 테이블, `jw-media` 비공개 저장소 |
| 로그인 | 이메일 로그인 링크 (회원 이메일이 등록된 사람만 메일 발송) |
| 호스팅 | Render 정적 사이트 (publish path: `web`) |

## 권한
| 역할 | 판정 | 할 수 있는 것 |
|---|---|---|
| 관리자 | `jw_admins` 테이블에 이메일 등록 | 전체 관리, 회원 등록/삭제, 직책 변경, CSV 일괄 등록 |
| 임원 | 현재 직책(`jw_terms.ended_on is null`)이 있는 회원 | 행사·연혁 등록/수정 |
| 일반회원 | `jw_members.email` 이 로그인 이메일과 일치 | 열람, 본인 정보·사진 수정 (이메일/가디언/입회/상태는 변경 불가) |

모든 권한은 DB의 RLS 정책으로 강제됩니다 (화면에서 버튼만 숨기는 것이 아님).

## 운영
- **관리자 추가**: Supabase SQL Editor에서 `insert into jw_admins(email) values ('관리자@이메일');`
- **회원 로그인 허용**: 회원 정보 수정 → 로그인 이메일 입력
- **로그인 링크 주소**: Supabase → Authentication → URL Configuration → Redirect URLs 에 사이트 주소 등록 필요
