import { describe, expect, it } from "vitest";
import { invoiceFor, invoiceText, isMonth, marginFor, monthRange, previousMonth, type Expense } from "./billing";
import type { Client } from "./types";

const base: Client = {
  id: "c",
  name: "테스트몰",
  industry: "",
  objective: "purchase",
  targetCpa: 20_000,
  monthlyBudget: 3_000_000,
  contract: { feeModel: "hybrid", feePercent: 15, minFee: 300_000 },
};

describe("월 계산", () => {
  it("지난달", () => {
    expect(previousMonth("2026-10")).toBe("2026-09");
    expect(previousMonth("2026-01")).toBe("2025-12");
  });
  it("월의 첫날·마지막 날 (윤년 포함)", () => {
    expect(monthRange("2026-09")).toEqual({ since: "2026-09-01", until: "2026-09-30" });
    expect(monthRange("2028-02").until).toBe("2028-02-29");
  });
  it("형식 검사", () => {
    expect(isMonth("2026-09")).toBe(true);
    expect(isMonth("2026-13")).toBe(false);
    expect(isMonth("9월")).toBe(false);
  });
});

describe("청구서", () => {
  it("고객 직결제: 수수료 + 부가세만", () => {
    const inv = invoiceFor(base, 2_800_000);
    expect(inv.items).toHaveLength(1);
    expect(inv.subtotal).toBe(420_000);
    expect(inv.vat).toBe(42_000);
    expect(inv.total).toBe(462_000);
  });
  it("최소 수수료 적용", () => {
    expect(invoiceFor(base, 1_000_000).subtotal).toBe(300_000);
  });
  it("대행 결제: 광고비까지 청구", () => {
    const inv = invoiceFor({ ...base, contract: { feeModel: "percent", feePercent: 12, spendPaidBy: "agency" } }, 6_000_000);
    expect(inv.items.map((i) => i.amount)).toEqual([6_000_000, 720_000]);
    expect(inv.total).toBe(Math.round(6_720_000 * 1.1));
  });
  it("안내문에 합계가 들어간다", () => {
    const text = invoiceText(base, "2026-09", invoiceFor(base, 2_800_000), "채움파트너스");
    expect(text).toContain("테스트몰 2026년 9월");
    expect(text).toContain("합계: 462,000원");
  });
});

describe("고객별 이익", () => {
  const exp = (clientId: string, amount: number): Expense => ({ id: String(amount), clientId, month: "2026-09", category: "creative", amount, memo: "" });

  it("수수료 - 이 고객의 비용", () => {
    const m = marginFor(base, 2_800_000, [exp("c", 100_000), exp("other", 999_999)]);
    expect(m).toEqual({ revenue: 420_000, costs: 100_000, profit: 320_000, rate: 320_000 / 420_000 });
  });
  it("대납 광고비는 내 매출이 아니다", () => {
    const m = marginFor({ ...base, contract: { feeModel: "percent", feePercent: 12, spendPaidBy: "agency" } }, 6_000_000, []);
    expect(m.revenue).toBe(720_000);
  });
});
