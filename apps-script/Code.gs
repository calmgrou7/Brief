/**
 * 적정단가 노트 — Google Apps Script 백엔드
 * - 웹앱으로 Index.html 을 제공
 * - 계산 결과를 구글 시트(계산기록)에 저장/조회/삭제
 *
 * 시트는 처음 저장할 때 자동으로 만들어지고, ID 는 스크립트 속성 SPREADSHEET_ID 에 보관됩니다.
 * 이미 쓰는 시트가 있으면 스크립트 속성에 SPREADSHEET_ID 를 직접 넣어도 됩니다.
 */

var SHEET_NAME = '계산기록';
var HEADERS = ['저장일시', 'ID', '모드', '상품명', '판매가(VAT포함)', '단위원가', '전체원가율(%)', '단위이익', '입력값(JSON)'];

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('적정단가 노트')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create('적정단가 노트 - 계산기록');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.getSheets()[0];
    sh.setName(SHEET_NAME);
  }
  if (sh.getLastRow() === 0) {
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sh;
}

/** 화면에서 호출: 계산 결과 저장 */
function saveRecord(rec) {
  var sh = getSheet_();
  var id = rec.id || Utilities.getUuid().slice(0, 8);
  sh.appendRow([
    new Date(), id, rec.mode, rec.name || '',
    Number(rec.price) || 0, Math.round(Number(rec.unitCost) || 0),
    Math.round((Number(rec.costRatio) || 0) * 10) / 10,
    Math.round(Number(rec.profit) || 0),
    JSON.stringify(rec.state || {})
  ]);
  return id;
}

/** 화면에서 호출: 최근 기록 50건 */
function listRecords() {
  var sh = getSheet_();
  var last = sh.getLastRow();
  if (last < 2) return [];
  var start = Math.max(2, last - 49);
  var rows = sh.getRange(start, 1, last - start + 1, HEADERS.length).getValues();
  return rows.reverse().map(function (r) {
    var state = {};
    try { state = JSON.parse(r[8]); } catch (e) {}
    return {
      date: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
      id: String(r[1]), mode: r[2], name: r[3],
      price: r[4], unitCost: r[5], costRatio: r[6], profit: r[7], state: state
    };
  });
}

/** 화면에서 호출: 기록 삭제 */
function deleteRecord(id) {
  var sh = getSheet_();
  var ids = sh.getRange(1, 2, sh.getLastRow(), 1).getValues();
  for (var i = ids.length - 1; i >= 1; i--) {
    if (String(ids[i][0]) === String(id)) { sh.deleteRow(i + 1); return true; }
  }
  return false;
}

/** 저장 시트 주소 확인용 (편집기에서 실행) */
function showSheetUrl() {
  Logger.log(getSheet_().getParent().getUrl());
}
