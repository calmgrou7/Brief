// 브라우저 화면 검사: npm run build 후 node scripts/ui-check.mjs
// Playwright 필요. PLAYWRIGHT_MODULE 로 설치 경로 지정 가능. 결과·화면은 test-output/ 에 저장.
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.mjs";
import { createApp } from "../server/index.mjs";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const PASSWORD = "ui-check-password-1";
const out = "test-output";
mkdirSync(out, { recursive: true });
const dir = mkdtempSync(join(tmpdir(), "bn-ui-"));
const store = new Store(join(dir, "ui.sqlite"));
const server = createApp(store, { password: PASSWORD, secureCookie: false });
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const URL = `http://127.0.0.1:${server.address().port}`;

const results = [];
const check = (name, ok) => {
  results.push([name, !!ok]);
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}`);
};
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {},
);
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on(
    "console",
    (m) =>
      m.type() === "error" &&
      !m.text().includes("401") &&
      errors.push(m.text()),
  );
  page.on("dialog", (d) => d.accept());
  await page.goto(URL);

  check("로그인 화면 표시", await page.isVisible("#login-pw"));
  await page.fill("#login-pw", "wrong-password-0");
  await page.click("button:has-text('로그인')");
  await page.waitForSelector(".notice");
  check("틀린 관리자 비밀번호 거부", await page.isVisible("#login-pw"));
  await page.fill("#login-pw", PASSWORD);
  await page.click("button:has-text('로그인')");
  await page.waitForSelector(".ring");
  check("개요 렌더링", true);
  check("트랙 카드 3개", (await page.locator(".g3 .card").count()) === 3);
  await page.screenshot({ path: `${out}/overview.png`, fullPage: true });

  await page.click("[role=tab]:has-text('프로젝트')");
  const before = await page.locator(".stage.on").count();
  await page.click(".stage:not(.on) >> nth=0");
  await page.waitForFunction(
    (n) => document.querySelectorAll(".stage.on").length === n + 1,
    before,
  );
  check(
    "단계 토글 → 서버 저장",
    store
      .list("projects")
      .some((p) => p.stages.filter((s) => s.done).length > 0) &&
      !store.getMeta("sample"),
  );
  await page.screenshot({ path: `${out}/projects.png`, fullPage: true });

  await page.click("button:has-text('+ 프로젝트')");
  await page.fill("#f_name", "UI 검사 프로젝트");
  await page.selectOption("#f_type", "web");
  await page.click("dialog button:has-text('저장')");
  await page.waitForSelector("text=UI 검사 프로젝트");
  check(
    "프로젝트 추가",
    store
      .list("projects")
      .some((p) => p.name === "UI 검사 프로젝트" && p.type === "web"),
  );

  await page.click("[role=tab]:has-text('출시·업데이트')");
  await page.selectOption(".inline-select >> nth=0", "released");
  await page.waitForTimeout(300);
  check(
    "릴리스 상태 변경",
    store.list("releases").some((r) => r.status === "released"),
  );

  await page.click("[role=tab]:has-text('도메인·서버')");
  await page.screenshot({ path: `${out}/infra.png`, fullPage: true });
  check(
    "도메인 표 표시",
    (await page.locator("table >> nth=0").locator("tbody tr").count()) >= 1,
  );

  await page.click("[role=tab]:has-text('계정 보관함')");
  await page.fill("#vpw1", "master-pass-123");
  await page.fill("#vpw2", "master-pass-123");
  await page.click("button:has-text('보관함 생성')");
  await page.waitForSelector("#add-acc");
  await page.click("#add-acc");
  await page.fill("#f_service", "앱인토스 콘솔");
  await page.fill("#f_username", "plain-user@test");
  await page.fill("#f_password", "PlainSecret!42");
  await page.click("dialog button:has-text('저장')");
  await page.waitForSelector("text=plain-user@test");
  const dbDump =
    JSON.stringify(store.state()) + JSON.stringify(store.auditLog(500));
  check(
    "서버에 평문 미저장",
    !dbDump.includes("plain-user@test") &&
      !dbDump.includes("PlainSecret!42") &&
      !!store.state().vault?.ct,
  );
  await page.click("button:has-text('잠그기')");
  await page.fill("#vpw", "wrong-master-0");
  await page.click("button:has-text('잠금 해제')");
  await page.waitForTimeout(1200);
  check("틀린 마스터 비밀번호 거부", await page.isVisible("#vpw"));
  await page.fill("#vpw", "master-pass-123");
  await page.click("button:has-text('잠금 해제')");
  await page.waitForSelector("text=plain-user@test");
  check("보관함 복호화", true);
  await page.reload();
  await page.click("[role=tab]:has-text('계정 보관함')");
  check("새로고침 시 다시 잠김", await page.isVisible("#vpw"));

  await page.click("[role=tab]:has-text('백업·설정')");
  await page.screenshot({ path: `${out}/settings.png`, fullPage: true });

  await page.click("button:has-text('로그아웃')");
  await page.waitForSelector("#login-pw");
  check("로그아웃", true);

  const ctx = await browser.newContext({
    viewport: { width: 390, height: 800 },
  });
  const m = await ctx.newPage();
  m.on("pageerror", (e) => errors.push(e.message));
  await m.goto(URL);
  await m.fill("#login-pw", PASSWORD);
  await m.click("button:has-text('로그인')");
  await m.waitForSelector(".ring");
  for (const tab of [
    "개요",
    "프로젝트",
    "출시·업데이트",
    "도메인·서버",
    "계정 보관함",
    "백업·설정",
  ]) {
    await m.click(`[role=tab]:has-text('${tab}')`);
    await m.waitForTimeout(100);
    check(
      `모바일 가로스크롤 없음: ${tab}`,
      !(await m.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
    );
  }
  await m.click("[role=tab]:has-text('개요')");
  await m.screenshot({ path: `${out}/mobile.png`, fullPage: true });
  check("콘솔 에러 없음", errors.length === 0);
  if (errors.length) console.log(errors);
} finally {
  await browser.close();
  server.close();
  store.close();
  rmSync(dir, { recursive: true, force: true });
}
const failed = results.filter((r) => !r[1]).length;
console.log(failed ? `\n${failed} FAILED` : "\nALL PASS");
process.exit(failed ? 1 : 0);
