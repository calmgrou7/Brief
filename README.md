# 예스시스템 홈페이지 (시안 v1)

바튼(VATON) 폴딩도어·시스템창호·썬룸 판매·시공점 **예스시스템**의 홈페이지 시안입니다.
도메인과 공식 정보 없이도 바로 띄울 수 있는 정적 사이트이고, 견적 문의는 Supabase로 자동 접수됩니다.

## 구성
| 파일 | 역할 |
|---|---|
| `index.html` | 메인, 제품, 강점, 시공 과정, 시공사례, 견적 문의 (한 페이지) |
| `css/style.css` | 디자인 (모바일 우선, 반응형) |
| `js/config.js` | **회사 정보·전화·카톡·Supabase 키** — 이 파일만 고치면 사이트 전체 반영 |
| `js/cases.js` | **시공사례 목록** — 사진 경로와 제목만 한 줄씩 추가 |
| `js/main.js` | 탭, 필터, 폼 검증·전송, 스크롤 효과 |
| `supabase/schema.sql` | 견적 문의 테이블 + 보안 정책 |

## 로컬에서 보기
```bash
python3 -m http.server 8000
```
브라우저에서 http://localhost:8000

## 실제 정보로 바꿀 때
1. `js/config.js` 의 상호·대표·사업자번호·주소·전화·카톡 URL 입력
2. 시공 사진을 `images/cases/` 에 넣고 `js/cases.js` 의 `img` 에 경로 입력
3. 메인 일러스트를 실제 시공 사진·영상으로 교체 (`.hero__visual`)
4. 바튼 제품명·이미지 사용 범위는 본사와 대리점 계약 조건을 확인

## 메인 배경 (움직이는 배경)
`js/config.js` 의 `hero` 에서 고릅니다. 위에 있는 것이 우선 적용됩니다.

| 방식 | 넣을 값 | 언제 쓰나 |
|---|---|---|
| Vimeo 영상 | `vimeo: "영상ID"` | 사이트 용량 부담 없이 고화질. 바튼과 같은 방식 |
| 직접 올린 영상 | `video`, `videoMobile`, `poster` | Vimeo 계정 없이 바로 |
| 사진 슬라이드 | `photos: [{src, label}]` | 영상이 없을 때. 사진이 천천히 확대·이동하며 넘어가 영상처럼 보임 |

영상 변환 (소리 제거, PC 16:9 / 휴대폰 9:16 자동 크롭, 용량 압축, 포스터 생성):
```bash
tools/make-hero-video.sh 원본영상.mp4 0 12
```
사진을 영상으로 만들고 싶으면 시공 사진 1장을 AI 영상 생성 도구(Veo, Runway, Kling 등)에 넣어
"카메라가 천천히 앞으로 이동, 폴딩도어가 부드럽게 열림" 같은 문장으로 5~8초 영상을 만든 뒤 위 변환기를 돌리면 됩니다.
현재 `images/hero/sample-*.svg` 는 자리표시용 샘플 그림입니다.

## 견적 문의 자동 접수 켜기
1. Supabase 프로젝트에서 `supabase/schema.sql` 실행
2. `js/config.js` 에 `supabaseUrl`, `supabaseKey`(publishable/anon 키) 입력
3. 이후 문의는 `leads` 테이블에 쌓이고 `status`(신규→상담중→실측예약→견적발송→계약)로 관리
4. (다음 단계) Supabase Database Webhook 또는 Zapier로 새 문의 시 카톡·메일 알림 연결

## 배포 (도메인 없이)
GitHub Pages: 저장소 Settings → Pages → Branch 선택 → `https://<계정>.github.io/<저장소>/` 로 공개.
도메인이 생기면 같은 화면에서 Custom domain만 연결하면 됩니다.

## 스크롤 효과 (패럴랙스 고정 배경 + 스티키 섹션 전환)
- `index.html` 의 `<div class="stack">` 안에 있는 화면(메인 + 쇼케이스 3장)이 한 장씩 화면에 고정되고, 다음 장이 위로 올라오며 덮습니다.
- 덮이는 화면은 살짝 확대·어두워지고, 들어오는 화면은 글자가 아래에서 떠오릅니다.
- 모바일 사파리에서도 동작하도록 `background-attachment: fixed` 대신 `position: sticky` + 가벼운 JS(스크롤 진행도 계산)로 구현했습니다. 외부 라이브러리 없음.
- 쇼케이스 화면 추가: `<section class="show">…</section>` 블록을 복사해 사진(src)과 문구만 바꾸면 됩니다.
- 움직임 줄이기 설정을 켠 사용자에게는 확대·이동 효과가 꺼집니다.

## 살아있는 이미지 (쇼케이스·시공사례)
- 사진만 넣어도 천천히 확대·이동을 반복해 영상처럼 보입니다.
- 짧은 영상이 있으면: 쇼케이스는 `<div class="show__bg" data-video="images/show/파일.mp4">`, 시공사례는 `js/cases.js` 에 `video: "경로"` 추가.
- 영상은 화면에 처음 보일 때 불러오고, 화면 밖으로 나가면 멈춰서 휴대폰 데이터·배터리를 아낍니다.
- 영상 압축은 `tools/make-hero-video.sh` 를 그대로 쓰면 됩니다.
