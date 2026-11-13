# Brief · 미팅 음성메모 미니앱

코치·컨설턴트가 미팅 직후 1~3분 말하면, 상담기록이 항목별로 정리되어 Notion에 저장되는 모바일 웹앱입니다.

```
[녹음 버튼] → AssemblyAI(한국어 받아쓰기) → Claude(항목별 정리) → [확인·수정 화면] → Notion DB 저장
```

## 화면 구성
1. **녹음** – 고객명(선택), 미팅 유형 선택, 녹음 버튼 / 기존 파일 올리기, 말하는 순서 가이드
2. **처리 중** – 업로드 → 받아쓰기 → 정리 단계 표시
3. **확인·수정** – AI가 채운 항목을 바로 고치고 저장, 원본 받아쓰기 확인, 텍스트 복사(카톡·메일용)
4. **완료** – Notion 페이지 바로가기, 최근 기록 20건(기기에 저장)

## 바로 실행 (데모 모드)
API 키 없이도 화면 흐름을 확인할 수 있어요. 받아쓰기·정리는 예시 결과로 동작합니다.

```bash
npm install
npm start          # http://localhost:3000
```

## 실제 연결
`.env.example`을 `.env`로 복사하고 값을 채우면 됩니다. 비어 있는 단계만 데모로 동작해요.

| 항목 | 어디서 | 비고 |
|---|---|---|
| `ASSEMBLYAI_API_KEY` | AssemblyAI 대시보드 | 받아쓰기 (`language_code: ko`) |
| `ANTHROPIC_API_KEY` | Anthropic Console | 정리 (구조화 출력, 기본 `claude-opus-5-5`, effort `low`) |
| `NOTION_TOKEN` | notion.so/my-integrations → 내부 통합 | 상담기록 DB의 `···` → 연결에서 이 통합을 추가해야 저장됨 |
| `NOTION_DATABASE_ID` | DB 주소의 32자리 | 기본값: 🎙️ 미팅 음성메모 상담기록 |
| `APP_PASSCODE` | 직접 정함 | 공개 주소로 배포할 때 권장 (API 비용 보호) |
| `WORD_BOOST` | 직접 정함 | 자주 쓰는 고유명사, 쉼표 구분 |

## 폰에서 쓰기
- 배포 후 주소를 폰 브라우저로 열고 **홈 화면에 추가** → 앱처럼 실행
- 마이크 사용에는 **https 주소**가 필요해요 (Render 배포 시 자동)

## 배포 (Render)
`render.yaml` 포함. Render에서 이 저장소를 Blueprint로 연결하고 키 값만 넣으면 됩니다.
무료 플랜은 한동안 접속이 없으면 잠들어서 첫 접속이 30초가량 느릴 수 있어요.

## 구조
```
server.js            API 서버 (작업 생성·상태 조회·저장, 접속 코드)
lib/assemblyai.js    업로드 → 받아쓰기 → 완료 대기
lib/structure.js     Claude 구조화 출력 (항목 스키마·프롬프트)
lib/notion.js        Notion DB 저장
lib/demo.js          데모용 예시 데이터
public/              모바일 화면 (PWA)
```

## 알아둘 점
- 음성·텍스트는 AssemblyAI, Anthropic(미국)으로 전송됩니다. 고객 서비스로 제공할 때는 개인정보 국외 이전 고지·동의가 필요해요.
- 작업 상태는 서버 메모리에 30분만 보관하고, 음성 파일은 서버에 저장하지 않습니다.
