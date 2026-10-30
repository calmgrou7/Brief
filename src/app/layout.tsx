import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '채움기업컨설팅관리대시보드', template: '%s · 채움 컨설팅' },
  description: '채움파트너스 고객사 통합 관리 대시보드',
  appleWebApp: { capable: true, title: '채움 컨설팅', statusBarStyle: 'black-translucent' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#102a3c',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
