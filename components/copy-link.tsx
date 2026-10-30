"use client";

import { useState } from "react";

/** 고객 리포트 링크를 복사한다. 클립보드가 막힌 환경에서는 링크 칸을 선택해 직접 복사하게 한다. */
export function CopyReportLink({ path, expires }: { path: string; expires: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");
  const [url, setUrl] = useState("");

  async function copy() {
    const full = `${window.location.origin}${path}`;
    setUrl(full);
    try {
      await navigator.clipboard.writeText(full);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <div className="flex items-center gap-2">
        <a href={path} target="_blank" rel="noreferrer" className="rounded-lg px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
          고객 화면 보기
        </a>
        <button type="button" onClick={copy} className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90">
          {state === "copied" ? "복사했습니다" : "고객 리포트 링크 복사"}
        </button>
      </div>
      {state === "manual" && (
        <input
          id="report-link"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          autoFocus
          className="w-72 max-w-full rounded-md border border-line bg-surface px-2 py-1 text-xs text-ink"
          aria-label="고객 리포트 링크"
        />
      )}
      <span className="text-[11px] text-muted">수수료·내부 판정 없이 성과만 보입니다 · {expires}까지 유효</span>
    </div>
  );
}
