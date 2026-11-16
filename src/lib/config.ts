export const config = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "보담체크",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME || "(상호명 입력)",
  thirdPartyRecipients: (process.env.NEXT_PUBLIC_THIRD_PARTY_RECIPIENTS || "").trim(),
};

export const CHANNELS = ["web", "toss", "android", "kakao"] as const;
export type Channel = (typeof CHANNELS)[number];

export function normalizeChannel(v: unknown): Channel {
  return CHANNELS.includes(v as Channel) ? (v as Channel) : "web";
}
