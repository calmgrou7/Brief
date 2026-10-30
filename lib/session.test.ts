import { describe, expect, it } from "vitest";
import { createSession, passwordMatches, safeNext, verifySession } from "./session";

const PW = "correct horse battery";

describe("owner session", () => {
  const token = createSession("2026-11-29", PW);

  it("유효한 세션", () => expect(verifySession(token, PW, "2026-10-30")).toBe(true));
  it("만료 후 거부", () => expect(verifySession(token, PW, "2026-11-30")).toBe(false));
  it("비밀번호가 바뀌면 기존 세션 무효", () => expect(verifySession(token, "new password!!", "2026-10-30")).toBe(false));
  it("만료일을 늘리는 위조 거부", () => {
    const [, sig] = token.split(".");
    expect(verifySession(`2099-12-31.${sig}`, PW, "2026-10-30")).toBe(false);
  });
  it("형식이 틀린 값 거부", () => {
    expect(verifySession(undefined, PW, "2026-10-30")).toBe(false);
    expect(verifySession("abc", PW, "2026-10-30")).toBe(false);
  });
});

describe("passwordMatches", () => {
  it("같으면 true, 다르면 false", () => {
    expect(passwordMatches(PW, PW)).toBe(true);
    expect(passwordMatches("wrong", PW)).toBe(false);
    expect(passwordMatches("", PW)).toBe(false);
  });
});

describe("safeNext", () => {
  it("내부 경로만 허용", () => {
    expect(safeNext("/clients/haru")).toBe("/clients/haru");
    expect(safeNext("https://evil.com")).toBe("/");
    expect(safeNext("//evil.com")).toBe("/");
    expect(safeNext("/\\evil.com")).toBe("/");
    expect(safeNext(null)).toBe("/");
  });
});
