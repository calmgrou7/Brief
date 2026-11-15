# 브릿지노드 엔딩컷 (7초)

앞으로 만들 앱 홍보 쇼츠 끝에 그대로 붙이는 공통 엔딩이에요.

| 시간 | 연출 |
|---|---|
| 0.0–0.5초 | 주황 점 두 개(노드)가 나타남 |
| 0.5–1.1초 | 점이 위로 올라가며 기둥이 솟음 |
| 1.0–1.6초 | 아치가 왼쪽에서 오른쪽으로 그려지며 두 기둥을 연결 (= 브릿지) |
| 1.5–2.6초 | BRIDGENODE 글자가 한 자씩 올라옴 |
| 2.5–3.2초 | IDEAS CONNECT. POSSIBILITIES BEGIN. |
| 3.0–3.7초 | 좋은 생각이 / **좋은 서비스**가 되는 곳 |
| 3.9–4.7초 | [앱·홈페이지 제작 문의 ↗] 버튼 + "더 많은 앱은 프로필 링크에서" |
| 4.7–7.0초 | 정지 화면 (버튼만 살짝 움직임) |

## 파일
- `bridgenode-ending.mp4` — 흰 배경 (기본)
- `bridgenode-ending-dark.mp4` — 검은 배경 (어두운 톤 영상 뒤에 붙일 때)
- `ending.html` — 원본. 문구는 HTML에서 바로 수정
- `assets/` — 로고 원본과 애니메이션용으로 자른 심볼·글자

## 다시 렌더링
```
cd shorts
SCENE=ending/ending.html node render.js ending/bridgenode-ending.mp4
SCENE='ending/ending.html?theme=dark' node render.js ending/bridgenode-ending-dark.mp4
```

## 앱 쇼츠에 붙이기
```
ffmpeg -i 앱쇼츠.mp4 -i ending/bridgenode-ending.mp4 \
  -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[v]" -map "[v]" \
  -c:v libx264 -crf 18 -pix_fmt yuv420p 앱쇼츠-엔딩포함.mp4
```
(두 영상 모두 1080×1920 · 30fps여야 해요. 음원은 업로드할 때 쇼츠 앱에서 넣는 걸 추천해요.)
