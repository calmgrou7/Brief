import type { Metadata, Viewport } from 'next';
// Pretendard는 앱에 함께 배포(외부 CDN 의존 없음). 화면에 쓰인 글자 조각만 내려받는다
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './globals.css';

export const metadata: Metadata = {
  title: { default: '채움기업컨설팅관리대시보드', template: '%s · 채움 컨설팅' },
  description: '채움파트너스 고객사 통합 관리 대시보드',
  appleWebApp: { capable: true, title: '채움 컨설팅', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#ffffff',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
