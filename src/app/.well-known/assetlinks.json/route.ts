// 3단계(구글플레이 TWA) — 앱과 웹 도메인 소유 연결. 환경변수만 채우면 됩니다.
export function GET() {
  const pkg = process.env.ANDROID_PACKAGE;
  const fps = (process.env.ANDROID_SHA256 || "").split(",").map((s) => s.trim()).filter(Boolean);
  const body = pkg && fps.length
    ? [{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: pkg, sha256_cert_fingerprints: fps } }]
    : [];
  return Response.json(body);
}
