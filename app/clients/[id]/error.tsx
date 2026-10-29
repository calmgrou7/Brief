"use client";

import Link from "next/link";

export default function ClientError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-6">
      <h1 className="text-base font-semibold">데이터를 불러오지 못했습니다</h1>
      <p className="mt-2 text-sm text-ink-2">
        메타 토큰이 만료됐거나 광고계정 권한이 없는 경우가 많습니다. 설정을 확인한 뒤 다시 시도하세요.
      </p>
      {/* 운영 빌드에서는 서버 오류 내용이 가려지므로, 원인은 서버 로그에서 digest로 찾는다 */}
      {error.digest && <p className="mt-2 text-xs text-muted">오류 코드: {error.digest}</p>}
      <div className="mt-4 flex gap-3 text-sm">
        <button onClick={reset} className="rounded-md bg-accent px-3 py-1.5 font-medium text-white">
          다시 시도
        </button>
        <Link href="/" className="rounded-md px-3 py-1.5 text-ink-2 hover:text-ink">
          전체 고객
        </Link>
      </div>
    </div>
  );
}
