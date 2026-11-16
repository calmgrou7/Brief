import type { Metadata, Viewport } from "next";
import Link from "next/link";
import Tracker from "@/components/Tracker";
import { config } from "@/lib/config";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(config.siteUrl),
  title: { default: `${config.siteName} · 30초 보험 점검`, template: `%s · ${config.siteName}` },
  description: "놓친 보험금, 부족한 보장을 30초 만에 점검하고 AI에게 보험을 물어보세요. 전문가 무료 상담까지.",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2459e8" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Tracker />
        <div className="wrap">
          <header className="top">
            <Link href="/" className="brand">{config.siteName}</Link>
            <nav>
              <Link href="/check">보험점검</Link>
              <Link href="/ask">AI상담</Link>
              <Link href="/claim">청구가이드</Link>
            </nav>
          </header>
          {children}
          <footer className="footer">
            <p>{config.siteName}는 보험 정보 안내 서비스이며, 실제 보장·지급 여부는 각 보험사 약관과 심사에 따릅니다.</p>
            <p>
              <Link href="/privacy">개인정보처리방침</Link>
              <Link href="/terms">이용약관</Link>
              <Link href="/privacy#request">내 정보 삭제 요청</Link>
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
