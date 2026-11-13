# 브릿지노드 홈페이지(ChatGPT 사이트)에 붙여 넣을 지시문

ChatGPT에서 브릿지노드 사이트 편집 화면을 열고, 아래 상자 안의 내용을 그대로 붙여 넣으세요. 한 번만 하면 됩니다.

---

```
포트폴리오 섹션에 외부 포트폴리오 목록을 자동으로 함께 보여 주도록 수정해 줘.

1. 페이지가 열릴 때 https://bridgenode-portfolio.onrender.com/portfolio.json 을 fetch 해서 읽어 줘.
   (이 주소는 CORS가 열려 있어서 브라우저에서 바로 읽을 수 있어. 서버에서 읽어도 돼.)
2. JSON 구조:
   { "updatedAt": "...", "items": [ { "id", "title", "titleEn", "summary", "tags": [],
     "category": "홈페이지" | "앱", "kind": "자체 프로젝트" | "고객 제작",
     "status": "컨셉 시안" | "운영 중" | "완료", "url", "thumbnail", "year", "order" } ] }
3. items의 url과 thumbnail이 "/"로 시작하거나 상대경로면 https://bridgenode-portfolio.onrender.com 을 앞에 붙여서 절대주소로 만들어 줘.
4. 기존 포트폴리오 카드와 같은 디자인의 카드로, 기존 항목들 앞에 order 순서대로 넣어 줘.
   카드에는 썸네일, 제목, summary, 태그, 그리고 status 배지(예: "컨셉 시안")를 꼭 보여 줘.
   카드를 누르면 url을 새 탭으로 열어 줘.
5. 기존 필터(전체 / 홈페이지 / 앱, 자체 프로젝트 / 고객 제작)에 category와 kind 값으로 그대로 걸리게 해 줘.
   전체 건수 표시도 외부 항목 수를 더해서 보여 줘.
6. fetch가 실패하거나 3초 안에 응답이 없으면 외부 항목 없이 기존 포트폴리오만 조용히 보여 줘(에러 문구 표시 금지).
7. 기존 포트폴리오 8건 데이터와 관리자 페이지 기능은 건드리지 마.
```

---

## 이후 운영

- 새 포트폴리오는 실장(Claude)이 `portfolio-site/portfolio.json`에 추가 → 커밋·푸시 → Render가 자동 배포 → 브릿지노드 홈페이지에 자동 반영.
- 대표님이 할 일은 현황판에서 "승인하고 완료"를 누르는 것뿐입니다.
- 기존 샘플 8건을 내리고 싶을 때는 ChatGPT 관리자 페이지(/admin)에서 직접 비공개 처리하세요.
