import { describe, expect, it } from "vitest";
import { createReportToken, verifyReportToken } from "./report-link";

const SECRET = "test-secret-0123456789";

describe("report link", () => {
  const token = createReportToken("haru", "2026-12-31", SECRET);

  it("유효한 링크는 고객 ID와 만료일을 돌려준다", () => {
    expect(verifyReportToken(token, SECRET, "2026-10-30")).toEqual({ clientId: "haru", expires: "2026-12-31" });
  });

  it("만료일 당일까지 열리고 다음 날부터 막힌다", () => {
    expect(verifyReportToken(token, SECRET, "2026-12-31")).not.toBeNull();
    expect(verifyReportToken(token, SECRET, "2027-01-01")).toBeNull();
  });

  it("다른 비밀값으로 만든 링크는 거부", () => {
    expect(verifyReportToken(createReportToken("haru", "2026-12-31", "other-secret-0123456"), SECRET, "2026-10-30")).toBeNull();
  });

  it("고객 ID를 바꿔치기하면 서명이 맞지 않는다", () => {
    const [, sig] = token.split(".");
    const forged = `${Buffer.from("ongyeol.2026-12-31").toString("base64url")}.${sig}`;
    expect(verifyReportToken(forged, SECRET, "2026-10-30")).toBeNull();
  });

  it("형식이 틀린 토큰은 거부", () => {
    expect(verifyReportToken("garbage", SECRET, "2026-10-30")).toBeNull();
    expect(verifyReportToken(`${token}.x`, SECRET, "2026-10-30")).toBeNull();
    expect(verifyReportToken("", SECRET, "2026-10-30")).toBeNull();
  });
});
