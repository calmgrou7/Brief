import type { DateRange, RangePreset } from "./types";

// 날짜는 모두 YYYY-MM-DD 문자열로 다루고, 계산은 UTC 자정 기준으로 해서 시간대 오차를 피한다.

const DAY_MS = 86_400_000;

export function toDate(s: string): Date {
  return new Date(`${s}T00:00:00Z`);
}

export function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  return fmt(new Date(toDate(s).getTime() + n * DAY_MS));
}

export function daysBetween(range: DateRange): number {
  return Math.round((toDate(range.until).getTime() - toDate(range.since).getTime()) / DAY_MS) + 1;
}

export function eachDay(range: DateRange): string[] {
  const out: string[] = [];
  for (let d = range.since; d <= range.until; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 광고계정 시간대(기본 서울)의 오늘 날짜 */
export function today(timeZone = "Asia/Seoul"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function daysInMonth(s: string): number {
  const d = toDate(s);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
}

export function monthStart(s: string): string {
  return `${s.slice(0, 8)}01`;
}

/**
 * 기간 프리셋. 오늘은 데이터가 덜 쌓였으므로 7일/30일은 어제까지,
 * "이번 달"은 월 진행 상황을 봐야 하므로 오늘까지 포함한다.
 */
export function presetRange(preset: RangePreset, anchor: string): DateRange {
  const yesterday = addDays(anchor, -1);
  switch (preset) {
    case "7d":
      return { since: addDays(yesterday, -6), until: yesterday };
    case "30d":
      return { since: addDays(yesterday, -29), until: yesterday };
    case "mtd":
      return { since: monthStart(anchor), until: anchor };
  }
}

/** 같은 길이의 직전 기간 */
export function previousRange(range: DateRange): DateRange {
  const len = daysBetween(range);
  return { since: addDays(range.since, -len), until: addDays(range.since, -1) };
}

export const PRESET_LABEL: Record<RangePreset, string> = {
  "7d": "최근 7일",
  "30d": "최근 30일",
  mtd: "이번 달",
};

export function isPreset(v: unknown): v is RangePreset {
  return v === "7d" || v === "30d" || v === "mtd";
}
