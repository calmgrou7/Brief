import type { Metadata } from "next";
import Link from "next/link";
import { getMode, listClients } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brief · 광고 운영 대시보드",
  description: "고객별 메타 광고 성과, 예산, 수수료를 한 화면에서",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [mode, clients] = await Promise.all([getMode(), listClients()]);
  return (
    <html lang="ko">
      <body className="min-h-dvh">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <nav className="flex min-w-0 items-center gap-1 overflow-x-auto text-sm">
              <Link href="/" className="mr-2 flex shrink-0 items-center gap-1.5 text-base font-bold tracking-tight text-ink">
                <span aria-hidden className="inline-flex size-6 items-center justify-center rounded-md bg-accent text-xs text-white">B</span>
                Brief
              </Link>
              <Link href="/" className="shrink-0 rounded-md px-2 py-1 font-medium text-ink hover:bg-surface-2">
                결정함
              </Link>
              {clients.map((c) => (
                <Link key={c.id} href={`/clients/${c.id}`} className="shrink-0 rounded-md px-2 py-1 text-ink-2 hover:bg-surface-2 hover:text-ink">
                  {c.name}
                </Link>
              ))}
            </nav>
            {mode === "sample" ? (
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2" title="META_ACCESS_TOKEN과 clients.config.json을 설정하면 실제 데이터로 바뀝니다">
                샘플 데이터
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-surface-2 px-2.5 py-1 text-xs text-ink-2">메타 연결됨</span>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
