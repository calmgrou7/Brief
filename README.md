# Global Mini App

코드 하나로 **웹앱(PWA)**과 **텔레그램 미니앱**을 동시에 운영하는 해외용 앱의 기본 뼈대입니다.
앱 아이디어가 정해지면 `src/App.tsx`의 예시 기능(탭 카운터)만 실제 기능으로 바꾸면 됩니다.

## 이미 들어 있는 것

| 기능 | 설명 | 파일 |
|---|---|---|
| PWA | 홈 화면 설치, 오프라인 캐시, 자동 업데이트 | `vite.config.ts` |
| 텔레그램 미니앱 | 텔레그램에서 열면 자동 감지, 사용자 이름·언어·테마 반영, 진동 피드백 | `src/telegram.ts` |
| 다국어 6개 | 영어, 한국어, 스페인어, 포르투갈어, 러시아어, 인도네시아어. 저장된 선택 → 텔레그램 언어 → 브라우저 언어 순으로 자동 선택 | `src/i18n/` |
| 결제 버튼 | `VITE_CHECKOUT_URL`에 Lemon Squeezy/Paddle 결제 링크를 넣으면 웹에서만 표시 | `src/App.tsx` |
| 자동 빌드 검사 | GitHub에 푸시할 때마다 빌드가 깨지지 않았는지 확인 | `.github/workflows/build.yml` |

## 로컬 실행

```bash
npm install
npm run dev      # 개발 서버
npm run build    # 배포용 빌드 (dist/)
```

설정값은 `.env.example`을 `.env`로 복사해서 바꿉니다.

## 배포 순서 (1회 설정 후 자동)

### 1. 웹 배포: Vercel (무료)
1. https://vercel.com 에 GitHub 계정으로 가입
2. **Add New → Project**에서 이 저장소 선택. Vite가 자동 감지되므로 설정은 그대로 둡니다.
3. **Environment Variables**에 `VITE_APP_NAME`(앱 이름)과, 결제 링크가 있으면 `VITE_CHECKOUT_URL` 입력
4. **Deploy**를 누르면 `https://<프로젝트명>.vercel.app` 주소가 생깁니다.

이후에는 연결한 브랜치에 푸시할 때마다 자동으로 재배포됩니다.

### 2. 텔레그램 미니앱 연결
1. 텔레그램에서 **@BotFather**와 대화를 열고 `/newbot`으로 봇 생성
2. `/newapp` → 방금 만든 봇 선택 → 제목, 설명, 이미지 입력 → **Web App URL**에 위 Vercel 주소 입력
3. BotFather가 알려주는 `https://t.me/<봇이름>/<앱이름>` 링크가 미니앱 공유 링크입니다.
4. (선택) `/mybots` → 봇 선택 → **Bot Settings → Menu Button**에 같은 URL을 넣으면 봇 채팅창 하단에 실행 버튼이 생깁니다.

### 3. 결제
- **웹**: Lemon Squeezy 또는 Paddle에서 상품을 만들고 체크아웃 링크를 `VITE_CHECKOUT_URL`에 넣습니다. 두 곳 모두 판매자(Merchant of Record)로서 해외 부가세 처리를 대신합니다.
- **텔레그램 안**: 디지털 상품은 텔레그램 정책상 **Telegram Stars**로만 판매할 수 있어서, 텔레그램에서 열면 외부 결제 버튼이 자동으로 숨겨집니다. Stars 결제는 봇 서버(인보이스 발급)가 필요하므로 유료 기능을 확정할 때 추가합니다.

## 언어 추가하기
`src/i18n/messages.ts`에서 `en` 블록을 복사해 번역한 뒤 `messages`와 `languageNames`에 추가하면 됩니다.

## 다음 단계
- 실제 앱 기능으로 `src/App.tsx` 교체
- 커스텀 도메인 연결 (Vercel → Settings → Domains)
- 반응이 좋으면 같은 코드 기반으로 구글 플레이 앱 확장 (TWA 또는 Expo)
