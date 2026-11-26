# FACE:D 업그레이드 작업 내역 — 2026-11-07 (원문 보관)

> 사용자가 공유한 원문을 그대로 보관. 다음 업데이트는 `2026-11-26-benchmark-upgrade.md` 참조.

## 이번 구현 범위
- 목적(업무·SNS·일상·네컷)·분위기 기반 규칙형 추천 3개와 실제 미리보기
- 색감/피부/형태 강도 분리, 얼굴 형태 유지
- 피부결 정리, 붉은기 완화, 얼굴 밝기·그림자 완화
- 전체 대비·채도, 눈썹 색 온도·경계, 립 컬러·광택
- 배경 경계 부드러움, 배경 평균색 혼합, 인물 그림자
- 1:1·4:5·9:16 출력, 좌우 구도, 원형 프로필 잘림 가이드
- 네컷 슬롯별 사진·필터, 순서 교환, 동일 필터, 문구·날짜·색상·여백
- 앨범 최대 4장, 한 컷씩 추가 촬영, 네컷·개별 저장
- 내 스타일 이름 변경·삭제·재사용 (사진·배경·브러시 미저장)
- 초안 1건 저장·복원·삭제 (IndexedDB)
- 입력 사진 밝기·선명도 안내
- 기본 900px / 고화질 최대 2048px, 초해상도 재생성 없음
- 고화질 네컷 2×2 1620×2025, 세로 900×3600
- 로컬 집계 카운터, 원격 분석 없음
- 기존 라벤더 디자인 유지, 자체 상단 내비 미추가

## 생성형 AI 연결 준비
생성형 배경·물체 제거·헤어·의상·문장 편집의 요청/미리보기/동의/취소/오류 처리와 서버 어댑터 작성. 서버·AI 서비스 미보유로 비활성. 연결 전에는 사진 전송 없음. `server/README.md` 참조.

## 남은 검증
- 다양한 피부색·안경·가림·역광·복잡한 머리카락 사진군, 저사양 기기
- 토스 iOS/Android 실기기 촬영·저장·권한 흐름, 출시 검토
- 자동 카운트다운 4연속 촬영 없음, 사진 바깥 확장 없음

## 검증 파일
tests/app.spec.ts, portrait.spec.ts, editor-background.spec.ts, studio.spec.ts, upgrade.spec.ts / node --test server/ai-handler.test.mjs / npm run lint / npm run build

## 변경 중심 파일
src/UnifiedEditor.tsx / Workbench.tsx / ExportSheet.tsx / AIStudio.tsx / editorModel.ts / editorRender.ts / drafts.ts / public/portrait-worker.js / src/engine.ts / src/platform.ts / src/upgrade.css / server/ai-handler.mjs
