"use client";
/**
 * 브라우저 공통 유틸 — 웹 / 미니앱(WebView) / 안드로이드 앱(TWA)에서 동일하게 동작.
 * 채널 판별: ?ch= 파라미터 > TWA referrer(android-app://) > 세션 저장값 > web
 */
import type { Channel } from "./config";

const safe = <T,>(fn: () => T, fallback: T): T => {
  try { return fn(); } catch { return fallback; }
};

export function getAnonId(): string {
  return safe(() => {
    let id = localStorage.getItem("anon_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("anon_id", id);
      sessionStorage.setItem("first_visit", "1");
    }
    return id;
  }, "no-storage");
}

export function getChannel(): Channel {
  return safe(() => {
    const q = new URLSearchParams(location.search).get("ch");
    if (q && ["web", "toss", "android", "kakao"].includes(q)) {
      sessionStorage.setItem("channel", q);
      return q as Channel;
    }
    if (document.referrer.startsWith("android-app://")) {
      sessionStorage.setItem("channel", "android");
      return "android";
    }
    return (sessionStorage.getItem("channel") as Channel) || "web";
  }, "web");
}

export function getUtm(): Record<string, string> {
  return safe(() => {
    const p = new URLSearchParams(location.search);
    const fresh: Record<string, string> = {};
    for (const k of ["source", "medium", "campaign"]) {
      const v = p.get(`utm_${k}`);
      if (v) fresh[k] = v.slice(0, 100);
    }
    if (Object.keys(fresh).length) localStorage.setItem("utm", JSON.stringify(fresh));
    return JSON.parse(localStorage.getItem("utm") || "{}");
  }, {});
}

export function track(name: string, props: Record<string, unknown> = {}) {
  const body = JSON.stringify({ name, props, anonId: getAnonId(), channel: getChannel(), path: location.pathname });
  safe(() => (navigator.sendBeacon ? navigator.sendBeacon("/api/events", body) : fetch("/api/events", { method: "POST", body, keepalive: true })), false);
}

export async function api<T = unknown>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "요청에 실패했어요");
  return data as T;
}
