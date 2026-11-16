/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 미니앱(WebView)·TWA에서 같은 웹앱을 그대로 띄우므로 iframe/WebView 호환 헤더만 최소로 둡니다.
  async rewrites() {
    // 3단계 TWA 도메인 연결 파일
    return [{ source: "/.well-known/assetlinks.json", destination: "/api/assetlinks" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};
export default nextConfig;
