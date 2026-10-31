# 둘러보기 전용 시안 만들기

데모 모드로 띄운 앱(`ADMIN_PASSWORD=test1234`, 포트 3100)의 화면을 모아 저장 기능 없는 단일 HTML(`docs/demo-v3.html`)로 묶습니다.

```bash
node scripts/demo-snapshot/capture.js
node scripts/demo-snapshot/build.js docs/demo-v3.html
```
