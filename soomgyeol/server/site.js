"use strict";
/* 소개 웹사이트: 서버에서 HTML을 만들어 검색엔진이 본문을 읽을 수 있게 합니다. */
const config = require("./config");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const won = n => n.toLocaleString("ko-KR") + "원";
const O = config.operator;
const P = config.prices;
const FREE = config.plans.free, PREM = config.plans.premium;
const pending = s => /운영자 확인 필요/.test(s) ? `<mark class="todo">${esc(s)}</mark>` : esc(s);

const PATTERNS = [
  ["coherent", "공명 호흡", "5.5 · 5.5", "매일 5분 습관. 심장과 호흡의 리듬을 고르게 맞춥니다.", "free"],
  ["box", "박스 호흡", "4 · 4 · 4 · 4", "발표·면접 전 긴장을 진정시키고 집중을 되찾습니다.", "free"],
  ["sigh", "한숨 호흡", "3 + 1 · 6", "답답할 때 두 번 들이쉬고 길게 내쉬어 빠르게 풀어 줍니다.", "free"],
  ["lava", "용암 호흡", "8 · 8", "화가 날 때 아주 느린 동일 호흡으로 열기를 식힙니다.", "premium"],
  ["478", "달빛 4-7-8", "4 · 7 · 8", "잠자리에서 날숨을 길게 쉬어 잠들 준비를 돕습니다.", "premium"],
  ["nadi", "교호 호흡", "좌 4 · 우 6", "좌우 콧구멍을 번갈아 쓰며 복잡한 생각을 정리합니다.", "premium"],
];

function layout({ path, title, description, body }) {
  const url = config.app.publicUrl + path;
  const fullTitle = path === "/" ? `${config.app.name} | ${config.app.tagline}` : `${title} | ${config.app.name}`;
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(config.app.name)}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(config.app.publicUrl)}/assets/og.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="${config.app.background}">
<link rel="icon" href="/assets/icon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=IBM+Plex+Sans+KR:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;1,6..72,400&display=swap">
<link rel="stylesheet" href="/assets/site.css">
</head>
<body>
<a class="skip" href="#main">본문으로 건너뛰기</a>
<header class="nav">
  <div class="wrap nav-in">
    <a class="logo" href="/">숨결<small>breath atlas</small></a>
    <nav aria-label="주요 메뉴">
      <a href="/features"${path === "/features" ? ' aria-current="page"' : ""}>기능</a>
      <a href="/pricing"${path === "/pricing" ? ' aria-current="page"' : ""}>요금제</a>
      <a href="/support"${path === "/support" ? ' aria-current="page"' : ""}>고객지원</a>
      <a class="nav-cta" href="/app">무료로 시작</a>
    </nav>
  </div>
</header>
<main id="main">${body}</main>
<footer class="foot">
  <div class="wrap foot-in">
    <div>
      <div class="logo">숨결</div>
      <p class="muted">숨결은 휴식과 긴장 완화를 돕는 호흡 안내 서비스이며 의료 기기나 치료법이 아닙니다.</p>
    </div>
    <nav aria-label="정책">
      <a href="/terms">이용약관</a><a href="/privacy"><b>개인정보처리방침</b></a><a href="/refund">결제·해지·환불</a><a href="/account-deletion">계정 삭제</a><a href="/support">고객지원</a>
    </nav>
    <p class="biz">상호 ${pending(O.company)} · 대표 ${pending(O.ceo)} · 사업자등록번호 ${pending(O.bizNo)}<br>
    통신판매업 ${pending(O.mailOrderNo)} · ${pending(O.address)} · 문의 ${pending(O.email)}</p>
  </div>
</footer>
</body>
</html>`;
}

const cta = (label = "무료로 시작하기") => `<a class="btn" href="/app">${esc(label)}</a>`;

function home() {
  return layout({
    path: "/", title: config.app.name, description: config.app.description,
    body: `
<section class="hero">
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="eyebrow">요가 호흡 코치</p>
      <h1>숨을 고르면,<br>마음이 놓여요</h1>
      <p class="lead">화가 날 때, 긴장될 때, 잠이 안 올 때. 지금 마음을 고르면 맞는 호흡법을 추천하고, 빛나는 입자와 음성이 한 호흡씩 함께 셉니다.</p>
      <div class="row">${cta()}<a class="btn ghost" href="/features">어떻게 쓰나요</a></div>
      <p class="muted small">가입 1분 · 카드 등록 없이 무료로 시작 · 휴대폰과 PC에서 같은 계정</p>
    </div>
    <figure class="phone" aria-label="실제 사용 화면: 화산 모양의 입자가 들숨에 차오르는 용암 호흡">
      <img src="/assets/screen-run.png" alt="숨결 앱 사용 화면. 들이쉬기 8초 안내와 숫자, 빛나는 화산 모양 입자" width="400" height="860">
    </figure>
  </div>
</section>

<section class="band">
  <div class="wrap grid3">
    <div><h2 class="h3">이런 분께</h2><p>하루에도 몇 번씩 긴장과 감정이 올라오는 직장인과 1인 사업자, 잠들기 어려운 분, 명상이 어렵게 느껴지는 분.</p></div>
    <div><h2 class="h3">이런 문제를</h2><p>"심호흡하세요"라는 말은 쉽지만 몇 초 들이쉬고 몇 초 내쉴지, 지금 어떤 호흡이 맞는지는 혼자 정하기 어렵습니다.</p></div>
    <div><h2 class="h3">이렇게 바꿉니다</h2><p>질문 두 개로 맞는 호흡을 고르고, 눈은 빛을 따라가고 귀는 숫자를 들으면 됩니다. 끝나면 전후 기분을 기록해 나에게 맞는 호흡을 찾습니다.</p></div>
  </div>
</section>

<section class="wrap section">
  <h2>여섯 가지 호흡, 여섯 가지 그림</h2>
  <p class="lead">각 호흡법의 근거와 주의사항을 확인해 담았습니다.</p>
  <ul class="cards">${PATTERNS.map(([id, n, r, d, tier]) => `
    <li class="card"><div class="card-top"><b>${n}</b><span class="tag ${tier}">${tier === "free" ? "무료" : "프리미엄"}</span></div>
    <div class="rhythm">${r}</div><p>${d}</p></li>`).join("")}
  </ul>
</section>

<section class="wrap section steps">
  <h2>시작은 세 단계</h2>
  <ol>
    <li><b>지금 마음 고르기</b><span>화가 나요, 긴장돼요, 잠이 안 와요 중에서 고르고 시간을 정합니다.</span></li>
    <li><b>빛과 소리를 따라 숨쉬기</b><span>입자가 차오를 때 들이쉬고, 식을 때 내쉽니다. 음성이 숫자를 세어 줍니다.</span></li>
    <li><b>기분 남기기</b><span>끝나고 기분과 한 줄 메모를 남기면 보관함에 쌓입니다.</span></li>
  </ol>
  ${cta("지금 호흡 시작하기")}
</section>`,
  });
}

function features() {
  return layout({
    path: "/features", title: "기능 소개", description: "마음 상태 질문으로 호흡 추천, 입자 그림과 음성 안내, 호흡 보관함과 주간 기록까지. 숨결의 기능과 사용 방법을 소개합니다.",
    body: `
<section class="wrap section">
  <p class="eyebrow">기능 소개</p>
  <h1>눈으로 보고, 귀로 듣고, 기록으로 남기는 호흡</h1>
  <div class="feature">
    <div><h2>1. 지금 마음에 맞는 호흡 추천</h2>
    <p>"지금 마음이 어떤가요?"와 "시간은 얼마나 있나요?" 두 질문에 답하면 여섯 가지 호흡법 중 하나를 추천하고, 왜 지금 그 호흡이 맞는지 설명합니다.</p>
    <p class="muted">예: 발표 10분 전 → "긴장돼요" + 3분 → 박스 호흡 11회</p></div>
    <img src="/assets/screen-reco.png" alt="추천 화면: 지금 당신에게 필요한 호흡, 박스 호흡" width="400" height="860" loading="lazy">
  </div>
  <div class="feature">
    <div><h2>2. 빛나는 입자와 음성 안내</h2>
    <p>수천 개의 입자가 화산·달·파도·폐 모양으로 숨에 맞춰 차오르고 식습니다. "들이쉬세요", "하나, 둘, 셋" 음성과 호흡에 맞춰 화음이 바뀌는 음악이 함께 나옵니다.</p>
    <p class="muted">화면을 끄지 않아도 되도록 화면 꺼짐을 막고, 다른 앱으로 넘어가면 자동으로 일시정지합니다.</p></div>
    <img src="/assets/screen-run.png" alt="호흡 진행 화면" width="400" height="860" loading="lazy">
  </div>
  <div class="feature">
    <div><h2>3. 호흡 보관함과 기록</h2>
    <p>끝난 호흡마다 전후 기분(1~5)과 메모를 남깁니다. 보관함에서 호흡법·메모로 검색하고, 이번 주 호흡 시간과 연속 기록일을 확인하고, CSV로 내보낼 수 있습니다.</p>
    <p class="muted">무료는 최근 7일, 프리미엄은 전체 기록을 볼 수 있습니다.</p></div>
    <img src="/assets/screen-records.png" alt="보관함 화면: 지난 호흡 목록" width="400" height="860" loading="lazy">
  </div>
  ${cta()}
</section>`,
  });
}

function pricing() {
  const monthlyOfYearly = Math.round(P.yearly.amount / 12);
  const save = Math.round((1 - P.yearly.amount / (P.monthly.amount * 12)) * 100);
  return layout({
    path: "/pricing", title: "요금제", description: "무료로 하루 3회, 프리미엄은 여섯 가지 호흡법과 최대 20분 세션, 전체 기록을 제공합니다. 요금제와 결제·해지 방식을 안내합니다.",
    body: `
<section class="wrap section">
  <p class="eyebrow">요금제</p>
  <h1>무료로 시작하고, 더 필요할 때 올리세요</h1>
  ${P.draft ? `<p class="notice">가격은 출시 전 확정 예정인 가안입니다. 현재 결제는 <b>테스트 모드</b>라 실제로 청구되지 않습니다.</p>` : ""}
  <div class="plans">
    <section class="plan">
      <h2>무료</h2>
      <div class="price">0원</div>
      <ul>
        <li>공명·박스·한숨 호흡 ${FREE.patterns.length}가지</li>
        <li>하루 ${FREE.dailySessions}회 (매일 자정 초기화, 이월 없음)</li>
        <li>한 번에 최대 ${FREE.maxMinutes}분</li>
        <li>최근 ${FREE.historyDays}일 기록 보기</li>
        <li>음성 안내·배경 음악</li>
      </ul>
      <a class="btn ghost" href="/app">무료로 시작</a>
    </section>
    <section class="plan best">
      <h2>프리미엄</h2>
      <div class="price">${won(P.monthly.amount)}<small> / 월</small></div>
      <div class="sub">연간 결제 시 ${won(P.yearly.amount)} / 년 (월 ${won(monthlyOfYearly)} 상당, ${save}% 할인)</div>
      <ul>
        <li>여섯 가지 호흡법 모두 (용암·달빛 4-7-8·교호 호흡 포함)</li>
        <li>사실상 횟수 제한 없음 (남용 방지 하루 ${PREM.dailySessions}회)</li>
        <li>한 번에 최대 ${PREM.maxMinutes}분</li>
        <li>전체 기록 보기와 CSV 내보내기</li>
      </ul>
      <a class="btn" href="/app#upgrade">프리미엄 시작</a>
    </section>
  </div>
  <h2 class="h3">자주 묻는 결제 질문</h2>
  <dl class="faq">
    <dt>무료 횟수를 다 쓰면 어떻게 되나요?</dt><dd>그날은 더 시작할 수 없고, 다음 날 자정(한국 시간)에 다시 3회가 채워집니다. 시작 후 ${config.usage.restoreIfUnderSec}초 안에 그만두면 횟수를 되돌려 드립니다.</dd>
    <dt>연간 결제는 어떻게 청구되나요?</dt><dd>결제할 때 1년치 ${won(P.yearly.amount)}이 한 번에 청구됩니다. 월 환산 금액은 비교를 위한 참고값입니다.</dd>
    <dt>해지하면 어떻게 되나요?</dt><dd>다음 자동 결제가 멈추고, 이미 결제한 기간이 끝날 때까지 프리미엄을 그대로 쓸 수 있습니다. 자세한 내용은 <a href="/refund">결제·해지·환불 안내</a>를 확인하세요.</dd>
  </dl>
</section>`,
  });
}

function support(db) {
  const faqs = db.all("SELECT title, body FROM content WHERE kind='faq' AND published=1 ORDER BY sort, id");
  return layout({
    path: "/support", title: "고객지원", description: "숨결 자주 묻는 질문, 사용 가이드, 문의 방법을 안내합니다.",
    body: `
<section class="wrap section narrow">
  <p class="eyebrow">고객지원</p>
  <h1>무엇을 도와드릴까요?</h1>
  <h2 class="h3">사용 가이드</h2>
  <ol class="guide">
    <li>조용한 곳에 앉거나 누워 휴대폰 소리를 켭니다.</li>
    <li>앱에서 지금 마음과 시간을 고르면 호흡법이 추천됩니다.</li>
    <li>입자가 차오르면 코로 들이쉬고, 식으면 내쉽니다. 숫자는 속으로 함께 셉니다.</li>
    <li>숨이 차거나 어지러우면 바로 멈추고 평소 호흡으로 돌아옵니다.</li>
  </ol>
  <h2 class="h3">자주 묻는 질문</h2>
  <dl class="faq">${faqs.map(f => `<dt>${esc(f.title)}</dt><dd>${esc(f.body)}</dd>`).join("")}</dl>
  <h2 class="h3">문의하기</h2>
  <p>로그인 후 <a href="/app#account">내 정보 &gt; 문의하기</a>에서 남겨 주시면 답변을 이메일과 앱에서 확인할 수 있습니다. 이메일 문의: ${pending(O.email)}</p>
</section>`,
  });
}

function policy(path, title, description, sections) {
  return layout({
    path, title, description,
    body: `<section class="wrap section narrow policy">
  <p class="eyebrow">약관·정책</p><h1>${esc(title)}</h1>
  <p class="notice">이 문서는 초안입니다. <mark class="todo">표시된 항목</mark>은 운영자가 확인·입력해야 하며, 출시 전 법률 검토를 권장합니다.</p>
  <p class="muted">시행일: ${pending(O.effectiveDate)}</p>
  ${sections.map(([h, b]) => `<h2 class="h3">${esc(h)}</h2>${b}`).join("")}
</section>`,
  });
}

function terms() {
  return policy("/terms", "이용약관", "숨결 서비스 이용약관", [
    ["제1조 목적", `<p>이 약관은 ${pending(O.company)}(이하 "회사")가 제공하는 숨결 서비스(이하 "서비스")의 이용 조건과 절차, 회사와 이용자의 권리·의무를 정합니다.</p>`],
    ["제2조 서비스의 성격", "<p>서비스는 호흡 안내와 기록 기능을 제공하는 웰니스 서비스이며 의료 행위, 진단, 치료를 대신하지 않습니다. 이용자는 자신의 건강 상태를 고려해 이용해야 하며, 이상을 느끼면 즉시 중단해야 합니다.</p>"],
    ["제3조 회원가입과 계정", "<p>이용자는 이메일과 비밀번호로 가입합니다. 계정 정보를 안전하게 관리할 책임은 이용자에게 있으며, 타인의 정보로 가입해서는 안 됩니다.</p>"],
    ["제4조 무료·유료 서비스", `<p>무료 서비스와 유료 서비스(프리미엄)의 제공 범위, 가격, 결제 주기는 <a href="/pricing">요금제</a> 페이지에 게시합니다. 회사가 가격이나 제공 범위를 바꾸는 경우 기존 구독자에게는 다음 결제일 최소 30일 전에 알리고, 동의하지 않으면 다음 결제 전에 해지할 수 있습니다.</p>`],
    ["제5조 결제·해지·환불", `<p><a href="/refund">결제·해지·환불 안내</a>에 따릅니다.</p>`],
    ["제6조 이용 제한", "<p>회사는 이용자가 서비스를 비정상적으로 이용하거나(자동화된 대량 요청 등) 타인의 권리를 침해하는 경우 사전 안내 후 이용을 제한할 수 있습니다.</p>"],
    ["제7조 탈퇴", "<p>이용자는 언제든 앱의 내 정보 화면에서 탈퇴할 수 있습니다. 탈퇴 시 계정과 호흡 기록은 즉시 삭제되며, 결제 기록은 관련 법령이 정한 기간 동안 보관됩니다.</p>"],
    ["제8조 책임 제한", `<p>${pending("[운영자 확인 필요: 책임 제한 범위와 분쟁 해결 관할 법원]")}</p>`],
  ]);
}

function privacy() {
  return policy("/privacy", "개인정보처리방침", "숨결 개인정보처리방침", [
    ["1. 수집하는 항목과 목적", `<table><tr><th>항목</th><th>목적</th><th>보관 기간</th></tr>
      <tr><td>이메일, 비밀번호(암호화), 이름(선택)</td><td>회원 식별, 로그인, 계정 복구</td><td>탈퇴 시까지</td></tr>
      <tr><td>호흡 기록(호흡법, 시간, 기분 점수, 메모)</td><td>보관함·통계 제공</td><td>이용자가 삭제하거나 탈퇴할 때까지</td></tr>
      <tr><td>결제 기록(주문번호, 금액, 상태)</td><td>결제·환불 처리, 법정 보관</td><td>전자상거래법에 따라 5년</td></tr>
      <tr><td>문의 내용</td><td>고객 응대</td><td>${pending("[운영자 확인 필요: 문의 보관 기간]")}</td></tr>
      <tr><td>접속 기록, 오류 기록</td><td>서비스 안정성 확인</td><td>${pending("[운영자 확인 필요: 로그 보관 기간]")}</td></tr></table>
      <p>오류 기록과 이용 통계에는 호흡 메모 등 이용자가 작성한 내용을 남기지 않습니다. 관리자 화면에서도 메모 내용은 보이지 않습니다.</p>`],
    ["2. 처리 위탁과 제3자 제공", `<p>${pending("[운영자 확인 필요: 서버 호스팅, 결제대행사(PG), 메일 발송 업체명과 위탁 업무]")}</p>`],
    ["3. 이용자의 권리", "<p>이용자는 앱에서 자신의 정보를 조회·수정하고, 호흡 기록을 삭제하거나 내보낼 수 있으며, 탈퇴로 개인정보 삭제를 요청할 수 있습니다.</p>"],
    ["4. 안전성 확보 조치", "<p>비밀번호는 복원할 수 없는 방식(scrypt)으로 암호화해 저장하고, 로그인 정보는 보안 쿠키로만 주고받으며, 관리자 권한은 서버에서 확인합니다.</p>"],
    ["5. 개인정보 보호책임자", `<p>${pending(O.privacyOfficer)} · ${pending(O.email)}</p>`],
  ]);
}

function refund() {
  return policy("/refund", "결제·해지·환불 안내", "숨결 프리미엄 결제, 자동 갱신, 해지, 환불 기준을 안내합니다.", [
    ["결제와 자동 갱신", `<p>프리미엄은 월간(${won(P.monthly.amount)}) 또는 연간(${won(P.yearly.amount)}, 1년치 일괄 청구) 구독이며, 해지하지 않으면 매 기간이 끝나는 날 같은 금액으로 자동 결제됩니다. ${P.draft ? "<b>가격은 가안이며 현재 테스트 결제만 가능합니다.</b>" : ""}</p>`],
    ["해지", "<p>앱의 내 정보 &gt; 구독 관리에서 언제든 해지할 수 있습니다. 해지는 다음 자동 결제를 멈추는 것이며, 이미 결제한 기간이 끝날 때까지 프리미엄을 계속 쓸 수 있습니다. 기간 안에는 해지를 취소할 수 있습니다.</p>"],
    ["만료", "<p>해지 후 결제 기간이 끝나거나, 자동 결제에 실패한 뒤 3일 안에 결제가 되지 않으면 무료 요금제로 바뀝니다. 기록은 지워지지 않습니다.</p>"],
    ["환불", `<p>${pending("[운영자 확인 필요: 결제 후 7일 이내 미사용 시 전액 환불 등 환불 기준과 중도 해지 시 환불 계산 방식]")}</p><p>환불이 완료되면 해당 결제로 받은 프리미엄 이용권은 즉시 종료됩니다.</p>`],
    ["문의", `<p>결제 관련 문의: ${pending(O.email)}</p>`],
  ]);
}

function accountDeletion() {
  return layout({
    path: "/account-deletion", title: "계정 삭제 안내", description: "숨결 계정과 호흡 기록을 삭제하는 방법과 삭제·보관되는 정보를 안내합니다.",
    body: `<section class="wrap section narrow policy">
  <p class="eyebrow">계정 삭제</p><h1>숨결 계정 삭제 안내</h1>
  <h2 class="h3">앱에서 직접 삭제</h2>
  <ol class="guide">
    <li>숨결 앱(또는 <a href="/app">웹앱</a>)에 로그인합니다.</li>
    <li>오른쪽 위 사람 모양 버튼을 눌러 <b>내 정보</b>로 갑니다.</li>
    <li>맨 아래 <b>탈퇴하기</b>를 열고 비밀번호를 입력한 뒤 <b>계정 삭제</b>를 누릅니다.</li>
  </ol>
  <h2 class="h3">로그인할 수 없을 때</h2>
  <p>가입한 이메일 주소로 ${pending(O.email)} 에 "계정 삭제 요청"을 보내 주세요. 본인 확인 후 7일 안에 처리하고 결과를 알려 드립니다.</p>
  <h2 class="h3">삭제되는 정보</h2>
  <p>계정(이메일, 비밀번호, 이름), 호흡 기록(호흡법, 시간, 기분 점수, 메모), 이용량 기록, 로그인 정보가 <b>즉시</b> 삭제되며 되돌릴 수 없습니다.</p>
  <h2 class="h3">보관되는 정보</h2>
  <p>결제 기록(주문번호, 금액, 상태)은 전자상거래법에 따라 5년간 보관한 뒤 삭제하며, 계정과의 연결은 끊깁니다. 이용 중인 구독은 탈퇴와 함께 해지됩니다.</p>
</section>`,
  });
}

function sitemap() {
  const paths = ["/", "/features", "/pricing", "/support", "/terms", "/privacy", "/refund", "/account-deletion"];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map(p => `  <url><loc>${config.app.publicUrl}${p}</loc></url>`).join("\n")}
</urlset>`;
}

function robots() {
  return `User-agent: *
Allow: /
Disallow: /app
Disallow: /admin
Disallow: /api/
Sitemap: ${config.app.publicUrl}/sitemap.xml
`;
}

module.exports = {
  pages: { "/": home, "/features": features, "/pricing": pricing, "/support": support, "/terms": terms, "/privacy": privacy, "/refund": refund, "/account-deletion": accountDeletion },
  sitemap, robots, layout,
};
