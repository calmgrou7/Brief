# 실제 데이터 연결 안내 · v0.2

## 필요한 설정

| 변수 | 위치 | 용도 |
|---|---|---|
| KAKAO_REST_API_KEY | 서버 .env | 주소 → 좌표 검색 |
| DATA_GO_KR_SERVICE_KEY | 서버 .env | 상가(상권)정보 업종/반경 조회 |
| ALLOWED_ORIGINS | 서버 .env | 프런트엔드의 정확한 origin 목록(쉼표 구분, 끝 / 없음) |
| VITE_API_BASE_URL | 프런트엔드 빌드 환경 | 별도 HTTPS 백엔드 주소. 같은 출처 웹이면 공란 |
| PORT / HOST | 서버 .env | 기본 8787 / 127.0.0.1 |

.env는 git 제외 대상입니다. .env.example은 비밀값 없이 배포합니다. 실제 키를 VITE_ 접두사로 만들지 마세요.

## 공식 자료 확인

확인일: 2026-11-07. 키 발급과 활용신청은 해당 계정에서 진행합니다.

- Kakao Local REST: https://developers.kakao.com/docs/latest/ko/local/dev-guide#address-coord
  - GET https://dapi.kakao.com/v2/local/search/address.json
  - Authorization: KakaoAK (서버 REST 키)
  - query, page, size 사용. REGION_ADDR/ROAD_ADDR만 선택 후보로 처리.
- 공공데이터포털 상가(상권)정보: https://www.data.go.kr/data/15012005/openapi.do
  - 포털 HTML에 포함된 현재 Swagger 명세 직접 확인
  - base: https://apis.data.go.kr/B553077/api/open/sdsc2
  - storeListInRadius: ServiceKey, pageNo, numOfRows, radius, cx, cy, type=json
  - radius 최대 2000m로 안내되어 있으며 본 앱은 500m 고정. cx 경도, cy 위도(WGS84).
  - smallUpjongList: servicekey, type=json으로 전체 분류 요청. 이름이 카페 또는 커피 전문점으로 일치하는 유일한 소분류 코드만 사용. 불명확하면 중단.
  - Swagger의 평탄한 필드 명세에서 resultCode, stdrYm, totalCount, pageNo, numOfRows, bizesId, indsSclsCd 확인.

## 외부 응답 검증 상태

실제 인증키는 없으며 호출 성공은 확인하지 않았습니다. 어댑터는 JSON의 header/body 또는 response.header/body 봉투를 받고 resultCode 00, body.items 배열(또는 body.items.item 배열)을 기대합니다. 실제 계정 응답과 일치하는지 첫 통합 테스트에서 확인해야 합니다. 예상과 다르면 실패로 처리하며 수치를 생성하지 않습니다.

포털 명세에 numOfRows의 최대치가 명시되지 않아 요청값 1000을 사용하고 응답의 numOfRows를 기준으로 페이지 완결성을 확인합니다. 실제 상한과 할당량은 계정 활용신청 결과로 확인하세요. 최대 40페이지/조회 약 45초를 넘거나 부분 응답이면 미완료 안내를 보여줍니다. 제공기관당 호출은 10초 제한입니다.

## 서버 실행

Node 24, npm ci 이후 .env.example을 .env로 복사합니다.

- 개발: npm run dev:api + npm run dev (터미널 2개)
- 웹 빌드: npm run build:web
- 같은 출처 서비스: npm start
- 기능 검증: npm test
- 실데이터 연결 확인: npm run check:live (발급받은 키로 부산 주소 두 곳을 조회하고 500m 집계를 출력합니다. 키 값은 출력하지 않습니다.)

서버는 dist만 정적 제공하며 .env, server 코드, 경로 밖 파일은 제공하지 않습니다. /api/status는 키의 설정 여부만 반환합니다. 설정됨이 인증 성공을 뜻하지 않습니다. GET /api/addresses?q=...&page=1 → 검색 결과의 임시 id → GET /api/analysis?id=... 순서입니다. 브라우저가 임의로 전달한 위경도로 직접 집계하지 않습니다.

## 운영 전 필수 확인

1. 실제 부산 주소 3개로 공식 API 응답과 앱 수치를 대조합니다. 전체 페이지 수신, 중복, 업종코드, 기준월, 0건 응답을 확인합니다.
2. 카카오 주소 결과의 표시·캐시·보관 조건과 공공자료 이용조건을 운영 계정 기준으로 검토합니다. 현재 주소 선택은 메모리 30분, 집계 캐시는 15분이며 영구 저장하지 않습니다.
3. 서버를 HTTPS로 배포하고 실제 origin만 허용합니다. 현재 요청 제한은 프로세스 메모리 기반이고 socket IP를 사용합니다. 프록시 환경에서는 신뢰할 프록시 설정, 공유 rate limiter/캐시, 장애/호출량 모니터링을 보강합니다. CORS는 사용자 인증 수단이 아닙니다.
4. 토스 번들은 공개 백엔드 주소를 VITE_API_BASE_URL에 넣고 다시 빌드합니다. 현재 번들은 실제 조회용 배포본이 아닙니다. SDK 3.8.1 기준 정확한 토스 origin은 배포 시 공식 서버 연동 문서로 확인합니다.
5. 브라우저 320/390/768/1440px, 키보드, 검색 취소/재시도, 한 후보 실패, 다운로드 및 토스 앱의 뒤로가기/저장소/safe area를 확인합니다.

현재 서버에는 사용자별 데이터나 로그인·결제 기능이 없으며 토스 파트너 API를 호출하지 않습니다. 따라서 이 버전에 mTLS나 토스 로그인 인증서를 요구하지 않습니다.
