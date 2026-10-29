import type { Metadata } from "next";
import Link from "next/link";
import { getMode } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brief · 광고 운영 대시보드",
  description: "고객별 메타 광고 성과, 예산, 수수료를 한 화면에서",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const mode = await getMode();
  return (
    <html lang="ko">
      <body className="min-h-dvh">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <Link href="/" className="text-base font-bold tracking-tight text-ink">
              Brief
            </Link>
            {mode === "sample" ? (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2" title="META_ACCESS_TOKEN과 clients.config.json을 설정하면 실제 데이터로 바뀝니다">
                샘플 데이터
              </span>
            ) : (
              <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">메타 연결됨</span>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
