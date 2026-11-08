# DOIT 앱 (Expo / React Native)

Android 우선 출시용 실행·할일 관리 앱. 연결·배포 절차는 [`../docs/setup-guide.md`](../docs/setup-guide.md).

## 구조
```
src/app/                 화면 (Expo Router — 파일 = 화면)
  (auth)/index.tsx       시작·구글 로그인
  (auth)/email.tsx       이메일 6자리 코드 로그인
  consent.tsx            만14세·약관·개인정보·마케팅 동의
  (app)/(tabs)/index.tsx 오늘의 DO 3 + 연속기록
  (app)/(tabs)/goals.tsx 목표 목록·추가
  (app)/goal/[id].tsx    할 일 목록, AI 쪼개기, ☆ 오늘에 추가
  (app)/(tabs)/settings.tsx 구독·약관·로그아웃·탈퇴
src/lib/                 supabase·결제(RevenueCat)·API 함수
src/providers/session.tsx 로그인·동의·프리미엄 상태
```

## 명령어
```
npm install
npx expo start          # 개발 서버 (결제·구글로그인은 development build 필요)
npx tsc --noEmit        # 타입체크
npx expo lint           # 린트
```
