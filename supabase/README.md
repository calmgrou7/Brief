# FACE:D AI 스튜디오 서버

앱의 **AI 스튜디오**(배경 바꾸기 · 물체 제거 · 헤어 · 의상 · 문장 편집)를 실제로 동작시키는 백엔드입니다.
Supabase Edge Function 하나(`ai-edit`)로 돌아가고, 이미지 AI는 OpenAI(기본) 또는 Gemini 중에서 고를 수 있어요.

## 앱과 맞춘 요청 형식

배포 이후 기준 주소: `https://<project-ref>.supabase.co/functions/v1/ai-edit`

| 요청 | 설명 |
| --- | --- |
| `GET  /api/ai/capabilities` | `{"enabled": true}`가 오면 앱에 AI 스튜디오가 열려요 |
| `POST /api/ai/edit` | multipart로 `image`, `kind`, `prompt`, `consent=true`를 받아 PNG 결과를 돌려줘요 |

실패하면 `{"message": "..."}` 형태로 한국어 안내 문구를 돌려주고, 앱은 이 문구를 그대로 보여줘요.

## 비용·악용 방지 (기본값)

| 환경변수 | 기본값 | 의미 |
| --- | --- | --- |
| `AI_PER_MINUTE_LIMIT` | 3 | IP 하나당 분당 요청 수 |
| `AI_DAILY_LIMIT_PER_IP` | 10 | IP 하나당 하루 요청 수 (DB 사용) |
| `AI_DAILY_LIMIT_GLOBAL` | 300 | 서비스 전체 하루 요청 수. **하루 비용 상한**으로 쓰는 값이에요 |
| `AI_ENABLED` | (켜짐) | `false`로 두면 코드 배포 없이 AI 스튜디오를 바로 끌 수 있어요 |

- 하루 기준은 한국 시간(Asia/Seoul)이에요.
- 한도를 세는 DB에 장애가 나면 요청을 **막는 쪽**으로 동작해요(비용 보호가 우선).
- 허용된 Origin(`ALLOWED_ORIGINS`)에서 온 요청만 받아요.
- 모든 요청에는 "얼굴·체형·표정은 바꾸지 말 것"이라는 지시가 자동으로 붙어요.

## 설정 순서 (한 번만 하면 돼요)

```bash
supabase link --project-ref <project-ref>
```

```bash
supabase db push
```

```bash
supabase secrets set OPENAI_API_KEY=sk-... ALLOWED_ORIGINS="https://*.tossmini.com,http://localhost:5173"
```

```bash
supabase functions deploy ai-edit --no-verify-jwt
```

Gemini를 쓰려면 `AI_PROVIDER=gemini GEMINI_API_KEY=...`로 설정하면 돼요.
모델은 `OPENAI_IMAGE_MODEL`(기본 `gpt-image-1.5`)과 `OPENAI_IMAGE_QUALITY`(기본 `medium`)로 바꿀 수 있어요.

> `ALLOWED_ORIGINS`: 토스 미니앱 WebView가 실제로 어떤 Origin으로 요청하는지는 공식 문서에 명시돼 있지 않아요.
> 처음 배포한 뒤 토스 앱의 웹 디버그 툴(Network 탭)에서 `capabilities` 요청의 `Origin` 헤더를 확인하고 그 값으로 맞춰 주세요.
> 함수 로그에서 403 응답이 보이면 Origin 설정이 맞지 않는 거예요.

## 앱에 연결

빌드본의 AI 서버 주소가 빈 문자열로 들어가 있어서 지금은 AI 스튜디오가 "연결 준비 중"으로 보여요.
소스의 `.env.production`에 위 함수 주소를 넣고 다시 빌드(`npm run build`)하면 연결돼요. (환경변수 이름은 소스에서 확인해 연결할 예정이에요.)

## 테스트

```bash
node --experimental-strip-types --test supabase/tests/handler.test.ts
```
