import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  // 앱인토스 콘솔에 등록한 앱 이름(kebab-case)과 반드시 같아야 한다. 콘솔 등록 후 확인·수정.
  appName: "sangkwon-first-step",
  brand: { primaryColor: "#3182F6" }, // 3.9.0에서 필수. 앱 대표 색상
  // P0는 권한 없이 완결 (기획서 5.1). 현재 위치 기능(P1) 도입 시 geolocation 추가.
  permissions: [],
  navigationBar: {
    withBackButton: true,
    withHomeButton: true,
  },
  webBundleDir: "dist",
});
