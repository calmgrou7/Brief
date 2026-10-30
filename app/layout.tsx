import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brief · 광고 운영 대시보드",
  description: "고객별 메타 광고 성과, 예산, 수수료를 한 화면에서",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
