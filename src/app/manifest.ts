import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '채움기업컨설팅관리대시보드',
    short_name: '채움 컨설팅',
    description: '채움파트너스 고객사 통합 관리',
    start_url: '/',
    display: 'standalone',
    background_color: '#102a3c',
    theme_color: '#102a3c',
    lang: 'ko',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
