# BRIDGENODE 포트폴리오 사이트 (`portfolio-site/`) 운영 메모

`portfolio-site/`는 Render 정적 사이트 `bridgenode-portfolio`의 배포 루트(publishPath)입니다. 그 폴더 안의 파일이 그대로 웹에 올라가므로, **배포 폴더에는 공개 페이지·json·이미지만 둡니다.** 이 메모처럼 내부 운영 문서는 배포 폴더 밖(`work/builds/`)에 둡니다.

| 파일 | 역할 |
|---|---|
| `index.html` | 포트폴리오 갤러리. `portfolio.json`을 읽어 카드로 보여 줌 (필터: 전체 + 항목이 1건 이상 있는 분류만 자동 표시) |
| `portfolio.json` | 포트폴리오 목록 피드. 브릿지노드 본 홈페이지도 이 파일을 읽어 감 |
| `stay-busan/` | Stay Busan 컨셉 시안 (`index.html`, 썸네일 `thumb.png`) |

## 새 포트폴리오 추가하는 방법

1. **페이지 파일 넣기** (이 사이트에 직접 올리는 작업일 때만)
   `portfolio-site/새-작업-id/index.html` 처럼 폴더를 하나 만들어 넣습니다. 고객 사이트처럼 다른 주소에 있는 작업이면 이 단계는 건너뜁니다.

2. **썸네일 만들기** (선택)
   1200×750 PNG를 `portfolio-site/새-작업-id/thumb.png`로 저장합니다. 없으면 `null`로 두면 카드에 BRIDGENODE 글자 자리가 대신 나옵니다.

3. **`portfolio.json`의 `items`에 항목 하나 추가**

   ```json
   {
     "id": "new-work",
     "title": "한국어 제목",
     "titleEn": "English title",
     "summary": "한 줄 설명",
     "tags": ["홈페이지", "랜딩 페이지"],
     "category": "홈페이지",
     "kind": "고객 제작",
     "status": "완료",
     "note": "카드에 한 줄로 보일 구분 표기 (선택)",
     "url": "/new-work/",
     "thumbnail": "new-work/thumb.png",
     "year": 2026,
     "order": 2
   }
   ```

   - `category`: `"홈페이지"` 또는 `"앱"` (갤러리 필터 버튼이 이 값으로 자동 생성됨. 해당 분류 항목이 0건이면 버튼이 안 보임)
   - `kind`: `"자체 프로젝트"` 또는 `"고객 제작"`
   - `status`: `"컨셉 시안"` / `"운영 중"` / `"완료"` (배지 색이 달라짐)
   - `note`: 선택. 카드에 한 줄로 표시. 자체 컨셉 작업은 `"자체 프로젝트 NN · 실제 운영 서비스 아님"`
   - 컨셉 시안은 본 홈페이지가 배지를 안 그려도 오해가 없도록 `summary` 맨 앞에 `[컨셉 시안 · 실제 운영 서비스 아님]`을 붙입니다.
   - `url`: 이 사이트 안이면 `/폴더명/`, 다른 사이트면 `https://...` 전체 주소
   - `thumbnail`: 이 사이트 기준 상대 경로 또는 `null`
   - `order`: 작은 숫자가 앞에 나옴
   - 맨 위 `updatedAt`도 오늘 날짜로 바꿔 줍니다.
   - 모든 항목은 검토자(reviewer) 검토와 대표 승인(done) 후에만 넣습니다. 고객 작업은 공개 전에 고객 동의도 받습니다.

4. **JSON 문법 확인**
   `python3 -m json.tool portfolio-site/portfolio.json` 이 에러 없이 출력되면 됩니다. (쉼표 하나만 빠져도 갤러리 전체가 "불러오지 못했어요"로 바뀝니다.)

5. **커밋하고 푸시**
   `git add portfolio-site && git commit -m "포트폴리오 추가: 작업명" && git push`

6. **Render가 자동으로 배포**
   연결된 브랜치에 푸시되면 Render가 몇 분 안에 새 버전을 올립니다. 갤러리와 본 홈페이지 피드에 바로 반영됩니다.

## 본 홈페이지에서 피드를 읽을 때

- 주소: `https://<render 도메인>/portfolio.json`
- `url`, `thumbnail`이 `/stay-busan/`, `stay-busan/thumb.png`처럼 상대 경로이면 **피드 주소 기준으로** 풀어서 써야 합니다.
  예: `new URL(item.thumbnail, "https://<render 도메인>/portfolio.json")`
- 다른 도메인에서 읽으므로 `portfolio.json`에 `Access-Control-Allow-Origin: *` 헤더가 필요합니다. 아래 "응답 헤더" 절대로 Render에 설정합니다.

## 응답 헤더 (이전 `portfolio-site/_headers` 내용)

예전에는 Netlify/Cloudflare Pages 형식의 `_headers` 파일을 배포 폴더에 두었지만, **Render 정적 사이트는 이 파일을 읽지 않고** 오히려 `/_headers`로 공개되기만 해서 삭제했습니다. 같은 내용을 Render 대시보드 Settings > Headers(또는 `render.yaml`의 `headers:`)에 넣습니다.

왜 필요한가: 브릿지노드 본 홈페이지(bridgenode-studio.calmgrou.chatgpt.site)가 다른 도메인인 이 사이트의 `portfolio.json`을 읽어 갑니다. `Access-Control-Allow-Origin`이 없으면 브라우저가 그 요청을 막습니다(CORS).

| Path | Name | Value |
|---|---|---|
| `/portfolio.json` | `Access-Control-Allow-Origin` | `*` |
| `/portfolio.json` | `Content-Type` | `application/json; charset=utf-8` |
| `/portfolio.json` | `Cache-Control` | `public, max-age=300` |
| `/*` | `X-Content-Type-Options` | `nosniff` |
| `/*` | `Referrer-Policy` | `strict-origin-when-cross-origin` |

참고용 원문(`_headers` 형식):

```
/portfolio.json
  Access-Control-Allow-Origin: *
  Content-Type: application/json; charset=utf-8
  Cache-Control: public, max-age=300

/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
```

## 로컬에서 미리 보기

`fetch`를 쓰기 때문에 파일을 더블클릭(file://)하면 목록이 안 나옵니다. 간이 서버로 엽니다.

```
cd portfolio-site
python3 -m http.server 8000
# http://localhost:8000/ 접속
```
