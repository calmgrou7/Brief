import { config } from "@/lib/config";
export const metadata = { title: "이용약관" };

// ※ 초안 템플릿입니다. 법률 검토 후 확정하세요.
export default function Terms() {
  return (
    <main>
      <h1>이용약관</h1>
      <div className="card">
        <h3>제1조 (서비스의 성격)</h3>
        <p className="muted">{config.siteName}는 보험 관련 일반 정보와 점검 도구를 제공하는 정보 서비스입니다. 점검 결과 및 AI 답변은 참고용이며, 실제 보장·지급 여부는 각 보험사의 약관과 심사에 따릅니다.</p>
        <h3>제2조 (보험금 청구)</h3>
        <p className="muted">회사는 보험금 청구 절차를 안내할 뿐 청구 및 손해사정을 대행하지 않습니다.</p>
        <h3>제3조 (상담)</h3>
        <p className="muted">상담은 이용자가 신청한 경우에만 진행되며 무료입니다. 이용자는 언제든 상담 중단을 요청할 수 있습니다.</p>
        <h3>제4조 (금지 행위)</h3>
        <p className="muted">타인의 정보로 신청하거나 서비스를 부정한 목적으로 이용하는 행위를 금지합니다.</p>
      </div>
    </main>
  );
}
