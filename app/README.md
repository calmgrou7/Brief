# FACE:D 앱 (빌드본 기반)

원본 소스 없이, 기존 .ait 안의 빌드 결과물(`dist/`)을 그대로 쓰면서 AI 스튜디오 서버 주소만 연결해 다시 패키징하는 프로젝트예요.

## 새 .ait 만들기

AI 서버를 아직 배포하지 않았다면 (AI 스튜디오는 "연결 준비 중"으로 보임):

```bash
cd app && npm install && npm run build
```

AI 서버(`supabase/`)를 배포한 뒤 주소를 넣어 빌드:

```bash
cd app && AI_BASE=https://<project-ref>.supabase.co/functions/v1/ai-edit npm run build
```

결과물은 `app/faced.ait`이고, `npm run deploy`(= `ait deploy`)로 올리거나 앱인토스 콘솔에 업로드하면 돼요.

## 원본 대비 바뀐 점

| 파일 | 변경 |
| --- | --- |
| `dist/assets/index-*.js` | 빈 문자열로 고정돼 있던 AI 주소를 `globalThis.FACED_AI_BASE`에서 읽도록 한 군데만 바꿈 |
| `dist/ai-config.js` | 새 파일. AI 서버 주소 저장 (`npm run build` 때 자동으로 만들어짐) |
| `dist/index.html` | `ai-config.js`를 먼저 불러오는 줄 한 줄 추가 |

앱 이름, 권한(카메라, 사진 읽기), WebView와 내비게이션 설정은 원본 `bundle.json`과 똑같이 `apps-in-toss.config.mjs`에 옮겼어요.

## 한계

새 화면이나 기능처럼 큰 변경은 압축된 빌드본을 고쳐야 해서 위험해요. 원본 소스를 찾으면 그쪽으로 옮기는 걸 추천해요.
