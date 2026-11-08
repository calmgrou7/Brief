# DOIT 홈페이지

> 생각은 그만, 오늘 할 일부터. — 실행·할일 관리 앱 **DOIT** 사전등록 랜딩페이지

빌드 도구 없는 정적 사이트입니다. `index.html`을 브라우저로 열면 바로 보입니다.

## 파일 구성

| 파일 | 역할 |
| --- | --- |
| `index.html` | 페이지 내용 (히어로 · 문제 · 사용법 · 기능 · 추천대상 · 사전등록 · FAQ) |
| `styles.css` | 디자인 (모바일 대응 포함) |
| `main.js` | 사전등록 폼 전송, 스크롤 애니메이션 |
| `config.js` | **설정 파일 — 폼 수신 주소, 문의 이메일** |
| `automation/waitlist-to-sheet.gs` | 사전등록 → 구글 시트 저장 + 메일 알림 (Apps Script) |
| `.github/workflows/pages.yml` | `main` 브랜치에 푸시하면 GitHub Pages 자동 배포 |

## 사전등록 → 구글시트 자동화 (5분)

1. 구글 시트 생성 → **확장 프로그램 → Apps Script**
2. `automation/waitlist-to-sheet.gs` 내용 붙여넣기, `NOTIFY_EMAIL`에 알림 받을 메일 입력
3. **배포 → 새 배포 → 웹 앱** (실행: 나 / 액세스: 모든 사용자)
4. 받은 `https://script.google.com/macros/s/.../exec` 주소를 `config.js`의 `FORM_ENDPOINT`에 입력

이후 등록이 들어오면 시트에 한 줄씩 쌓이고(중복 이메일 자동 제외), 알림 메일이 옵니다.
`FORM_ENDPOINT`가 비어 있으면 데모 모드로 동작합니다(방문자 브라우저에만 저장).

## 배포 (GitHub Pages)

1. 이 브랜치를 `main`에 머지
2. 저장소 **Settings → Pages → Source: GitHub Actions** 선택
3. 이후 `main`에 푸시할 때마다 자동 배포 → `https://<계정>.github.io/<저장소>/`

## 수정 포인트

- 문구: `index.html`에서 바로 수정
- 메인 색상: `styles.css` 상단 `--lime`(포인트), `--ink`(본문)
- 사전등록 혜택(얼리버드 3개월 등)과 FAQ의 가격 안내는 **예시 문구**이니 실제 정책에 맞게 바꿔 주세요.
