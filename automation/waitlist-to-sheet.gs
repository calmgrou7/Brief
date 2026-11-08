/**
 * DOIT 사전등록 → 구글 시트 자동 저장 (+ 신규 등록 시 메일 알림)
 *
 * 설치 방법
 * 1. 구글 시트 새로 만들기 → 확장 프로그램 → Apps Script
 * 2. 이 파일 내용을 전부 붙여넣고 저장
 * 3. NOTIFY_EMAIL 에 알림 받을 이메일 입력 (알림이 필요 없으면 "" 로 두기)
 * 4. 배포 → 새 배포 → 유형: 웹 앱
 *    - 실행 사용자: 나 / 액세스 권한: 모든 사용자
 * 5. 발급된 웹 앱 URL(https://script.google.com/macros/s/.../exec)을
 *    홈페이지 config.js 의 FORM_ENDPOINT 에 붙여넣기
 */
const NOTIFY_EMAIL = "";
const SHEET_NAME = "사전등록";

function doPost(e) {
  const data = JSON.parse(e.postData.contents || "{}");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["등록일시", "이름", "이메일", "사용 목적", "동의", "유입 페이지"]);
    sheet.setFrozenRows(1);
  }

  // 같은 이메일 중복 등록 방지
  const email = String(data.email || "").trim().toLowerCase();
  if (!email) return json({ ok: false, error: "email required" });
  const last = sheet.getLastRow();
  if (last > 1) {
    const emails = sheet.getRange(2, 3, last - 1, 1).getValues().flat()
      .map(function (v) { return String(v).toLowerCase(); });
    if (emails.indexOf(email) !== -1) return json({ ok: true, duplicate: true });
  }

  sheet.appendRow([
    new Date(), data.name || "", email, data.use || "",
    data.consent ? "Y" : "N", data.source || "",
  ]);

  if (NOTIFY_EMAIL) {
    MailApp.sendEmail(NOTIFY_EMAIL, "[DOIT] 새 사전등록: " + email,
      "이름: " + (data.name || "-") + "\n이메일: " + email +
      "\n사용 목적: " + (data.use || "-") + "\n누적: " + (sheet.getLastRow() - 1) + "명");
  }
  return json({ ok: true });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
