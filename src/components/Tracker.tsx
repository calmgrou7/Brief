"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { getAnonId, getChannel, getUtm } from "@/lib/client";

/** 페이지뷰 + 최초 방문(채널·UTM) 기록 */
export default function Tracker() {
  const path = usePathname();
  useEffect(() => {
    const anonId = getAnonId();
    const first = (() => { try { const f = sessionStorage.getItem("first_visit") === "1"; sessionStorage.removeItem("first_visit"); return f; } catch { return false; } })();
    const body = JSON.stringify({ name: "page_view", anonId, channel: getChannel(), path, utm: getUtm(), first, referrer: document.referrer });
    try { navigator.sendBeacon("/api/events", body); } catch { /* noop */ }
    document.documentElement.dataset.channel = getChannel();
  }, [path]);
  return null;
}
