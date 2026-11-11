# 쇼츠 제작 규칙 (토큰 절약)

사용자가 "쇼츠 N편 만들어줘" / "epXX 만들어줘"라고 하면:
1. `brand.json`과 마지막 에피소드 JSON 1개만 읽는다. `make.py`는 읽지 않는다(형식은 README에 있음).
2. `episodes/epXX.json`을 새로 쓴다. 장면 5개, 25~35초 분량, 마지막 장면은 팔로우/홈페이지 상담 CTA, 앞 편에서 예고한 주제를 이어간다.
3. `python3 make.py episodes/epXX.json` 실행.
4. 결과 확인은 프레임 1장만 본다: `ffmpeg -ss 12 -i out/epXX.mp4 -frames:v 1 -vf scale=360:-1 /tmp/c.png`
5. 보고는 짧게: 파일 경로, 길이, 제목.

확인되지 않은 수치(기간 몇 %, 비용 얼마)는 쓰지 않는다. 브랜드 정보는 brand.json에 있는 내용만 쓴다.
