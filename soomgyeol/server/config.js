"use strict";
/*
 * 앱별 설정 (요청서 9장: 이름·색상·요금제·제공량·안내 문구).
 * 다른 앱을 만들 때는 이 파일과 앱별 화면(public/app)만 바꾸면 됩니다.
 * [가안] 표시는 운영자가 확정해야 하는 값입니다.
 */
const env = process.env;

const PATTERN_IDS = ["lava", "box", "478", "coherent", "sigh", "nadi"];

module.exports = {
  app: {
    name: "숨결",
    nameEn: "Soomgyeol",
    tagline: "지금 마음에 맞는 호흡을 빛과 소리로 안내하는 호흡 코치",
    description:
      "화가 날 때, 긴장될 때, 잠이 안 올 때. 지금 마음을 고르면 맞는 요가 호흡법을 추천하고, 빛나는 입자와 음성으로 한 호흡씩 안내합니다.",
    accent: "#ff6a3d",
    background: "#07060a",
    publicUrl: (env.PUBLIC_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, ""),
  },

  // [운영자 확인 필요] 약관·정책·푸터에 그대로 노출됩니다.
  operator: {
    company: "[운영자 확인 필요: 상호]",
    ceo: "[운영자 확인 필요: 대표자명]",
    bizNo: "[운영자 확인 필요: 사업자등록번호]",
    mailOrderNo: "[운영자 확인 필요: 통신판매업 신고번호]",
    address: "[운영자 확인 필요: 사업장 주소]",
    email: "[운영자 확인 필요: 문의 이메일]",
    privacyOfficer: "[운영자 확인 필요: 개인정보 보호책임자]",
    effectiveDate: "[운영자 확인 필요: 시행일]",
  },

  timezone: "Asia/Seoul",
  patterns: PATTERN_IDS,

  plans: {
    free: {
      id: "free",
      label: "무료",
      patterns: ["coherent", "box", "sigh"],
      dailySessions: 3,     // 서버에서 차감, 한국 시간 자정 초기화, 이월 없음
      maxMinutes: 3,
      historyDays: 7,       // 보관함에서 최근 7일만 보임 (데이터는 유지)
    },
    premium: {
      id: "premium",
      label: "프리미엄",
      patterns: PATTERN_IDS,
      dailySessions: 50,    // 사실상 제한 없음. 남용 방지용 상한
      maxMinutes: 20,
      historyDays: null,
    },
  },

  // [가안] 원가가 거의 없는 앱(모든 처리가 기기에서 실행)이라 콘텐츠·기능 차이로 과금합니다.
  prices: {
    draft: true,
    monthly: { id: "monthly", label: "월간", amount: 4900, months: 1 },
    yearly: { id: "yearly", label: "연간", amount: 39000, months: 12 },
  },

  usage: {
    restoreIfUnderSec: 30, // 30초 안에 그만두면 오늘 이용 횟수를 되돌려 줍니다
  },

  billing: {
    mode: env.BILLING_MODE || "test",
    webhookSecret: env.WEBHOOK_SECRET || "dev-webhook-secret",
    graceDays: 3,            // 갱신 실패 후 이용권 유지 기간
    refundRevokesAccess: true,
  },

  // 구글 플레이 앱(TWA)과 웹 도메인 연결. 지문은 플레이 콘솔 > 앱 무결성 > 앱 서명에서 확인합니다.
  android: {
    packageName: env.ANDROID_PACKAGE || "app.soomgyeol.breath",
    certSha256: (env.ANDROID_CERT_SHA256 || "").split(",").map(s => s.trim().toUpperCase()).filter(Boolean),
  },

  auth: {
    sessionDays: 30,
    adminEmail: (env.ADMIN_EMAIL || "").trim().toLowerCase(),
    cookieSecure: env.COOKIE_SECURE === "1",
  },
};
