/**
 * 보담체크 리드 → 구글시트 기록 + HOT 리드 메일 알림 (Google Apps Script)
 *
 * 설치 (5분):
 *  1. 리드용 구글시트 열기 → 확장 프로그램 → Apps Script → 이 코드 전체 붙여넣기 → 저장
 *  2. 왼쪽 ⚙ 프로젝트 설정 → 스크립트 속성 추가
 *       WEBHOOK_SECRET = (Render 환경변수 LEAD_WEBHOOK_SECRET 과 같은 값)
 *       ALERT_EMAIL    = 알림 받을 메일 (비우면 시트 소유자 메일)
 *  3. 배포 → 새 배포 → 유형: 웹 앱 → 실행: 나 / 액세스: 모든 사용자 → 배포 → 권한 승인
 *  4. 나온 웹 앱 URL(…/exec)을 Render 환경변수 LEAD_WEBHOOK_URL 에 입력
 */
const SHEET_NAME = "리드";
const HEADERS = ["접수시각", "이벤트", "등급", "점수", "이름", "연락처", "관심분야", "채널", "점검결과", "남긴말", "리드ID", "상태", "메모"];
const INTEREST = { claim: "보험금 청구", check: "보장 점검", remodel: "리모델링", new: "신규 가입", etc: "기타" };
const CHANNEL = { web: "웹", toss: "미니앱", android: "앱", kakao: "카카오" };

function doPost(e) {
  const props = PropertiesService.getScriptProperties();
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false, error: "bad json" }); }
  if (!props.getProperty("WEBHOOK_SECRET") || d.secret !== props.getProperty("WEBHOOK_SECRET")) return out({ ok: false, error: "unauthorized" });

  const sheet = getSheet();
  sheet.appendRow([
    new Date(d.created_at || Date.now()),
    d.event === "lead.returning" ? "재신청" : "신규",
    d.grade, d.score, d.name, "'" + d.phone,
    INTEREST[d.interest] || d.interest, CHANNEL[d.channel] || d.channel,
    (d.findings || []).join(", "), d.message || "", d.id, "미연락", "",
  ]);

  if (d.grade === "HOT") {
    const to = props.getProperty("ALERT_EMAIL") || Session.getEffectiveUser().getEmail();
    MailApp.sendEmail({
      to,
      subject: `🔥 [HOT 리드] ${d.name} · ${INTEREST[d.interest] || ""} (${d.score}점)`,
      body: [
        `이름: ${d.name}`, `연락처: ${d.phone}`, `관심: ${INTEREST[d.interest] || d.interest}`,
        `채널: ${CHANNEL[d.channel] || d.channel}`, `점검결과: ${(d.findings || []).join(", ") || "-"}`,
        `남긴 말: ${d.message || "-"}`, "", "응답이 빠를수록 계약 전환율이 올라갑니다. 가능하면 10분 안에 연락하세요.",
        SpreadsheetApp.getActiveSpreadsheet().getUrl(),
      ].join("\n"),
    });
  }
  return out({ ok: true });
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  // 미리 만들어 둔 시트(첫 탭에 헤더가 있는 경우)는 그대로 사용
  if (!sh && ss.getSheets()[0].getRange("A1").getValue() === HEADERS[0]) {
    sh = ss.getSheets()[0];
    sh.setName(SHEET_NAME);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e8efff");
  }
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#e8efff");
  }
  return sh;
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 설치 확인용: Apps Script 편집기에서 이 함수를 한 번 실행하면 테스트 행이 추가됩니다. */
function testInsert() {
  const secret = PropertiesService.getScriptProperties().getProperty("WEBHOOK_SECRET");
  doPost({ postData: { contents: JSON.stringify({ secret, event: "lead.created", grade: "HOT", score: 80, name: "테스트", phone: "01000000000", interest: "claim", channel: "web", findings: ["수술비 청구 누락 가능성"], id: "test" }) } });
}
