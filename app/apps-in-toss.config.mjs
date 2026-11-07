// 원본 .ait(bundle.json)의 설정을 그대로 옮긴 것. 값을 바꾸면 토스 검수 대상이 될 수 있어요.
import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "faced",
  brand: { primaryColor: "#514483" },
  permissions: [
    { name: "camera", access: "access" },
    { name: "photos", access: "read" },
  ],
  webBundleDir: "dist",
  webView: {
    mediaPlaybackRequiresUserAction: true,
    allowsInlineMediaPlayback: false,
    bounces: true,
    allowsBackForwardNavigationGestures: true,
    pullToRefreshEnabled: false,
    overScrollMode: "always",
  },
  navigationBar: {
    withBackButton: true,
    withHomeButton: false,
    withTitle: true,
    transparentBackground: false,
  },
});
