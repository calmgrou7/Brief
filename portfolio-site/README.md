# BRIDGENODE 포트폴리오 사이트 (`portfolio-site/`)

Render 정적 사이트 `bridgenode-portfolio`의 배포 루트(publishPath)입니다. 이 폴더 안의 파일이 그대로 웹에 올라갑니다.

| 파일 | 역할 |
|---|---|
| `index.html` | 포트폴리오 갤러리. `portfolio.json`을 읽어 카드로 보여 줌 (필터: 전체/홈페이지/앱) |
| `portfolio.json` | 포트폴리오 목록 피드. 브릿지노드 본 홈페이지도 이 파일을 읽어 감 |
| `stay-busan/` | Stay Busan 컨셉 시안 (`index.html`, 썸네일 `thumb.png`) |
| `_headers` | 필요한 응답 헤더 메모 (Render는 이 파일을 읽지 않음, 아래 참고) |

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
     "url": "/new-work/",
     "thumbnail": "new-work/thumb.png",
     "year": 2026,
     "order": 2
   }
   ```

   - `category`: `"홈페이지"` 또는 `"앱"` (필터 버튼과 같은 글자여야 함)
   - `kind`: `"자체 프로젝트"` 또는 `"고객 제작"`
   - `status`: `"컨셉 시안"` / `"운영 중"` / `"완료"` (배지 색이 달라짐)
   - `url`: 이 사이트 안이면 `/폴더명/`, 다른 사이트면 `https://...` 전체 주소
   - `thumbnail`: 이 사이트 기준 상대 경로 또는 `null`
   - `order`: 작은 숫자가 앞에 나옴
   - 맨 위 `updatedAt`도 오늘 날짜로 바꿔 줍니다.
   - 고객 작업은 공개 전에 고객 동의를 받고, 검토자(reviewer) 검토를 거칩니다.

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
- 다른 도메인에서 읽으므로 `portfolio.json`에 `Access-Control-Allow-Origin: *` 헤더가 필요합니다.
  Render 정적 사이트는 `_headers` 파일을 읽지 않으니, Render 대시보드 Settings > Headers에 아래처럼 추가합니다.
  - Path: `/portfolio.json`
  - Name: `Access-Control-Allow-Origin`
  - Value: `*`

## 로컬에서 미리 보기

`fetch`를 쓰기 때문에 파일을 더블클릭(file://)하면 목록이 안 나옵니다. 간이 서버로 엽니다.

```
cd portfolio-site
python3 -m http.server 8000
# http://localhost:8000/ 접속
```
