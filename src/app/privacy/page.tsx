import { config } from "@/lib/config";
import PrivacyRequest from "./PrivacyRequest";

export const metadata = { title: "개인정보처리방침" };

// ※ 초안 템플릿입니다. 개인정보보호위원회 작성지침에 맞춰 법률 검토 후 확정하세요.
export default function Privacy() {
  const op = config.operatorName;
  return (
    <main>
      <h1>개인정보처리방침</h1>
      <p className="small">시행일: 2026-11-16 · 버전 2026-11-v1</p>
      <div className="card">
        <h3>1. 처리 목적</h3>
        <p className="muted">{op}(이하 “회사”)는 보험 점검 결과 안내, 보험 상담 연락, (동의 시) 정보·혜택 알림을 위해 개인정보를 처리합니다.</p>
        <h3>2. 처리 항목</h3>
        <p className="muted">필수: 이름, 휴대폰번호 / 선택: 출생연도, 상담 희망 내용 / 민감정보(동의 시): 점검 문항 중 병원 이용 관련 응답 / 자동 수집: 접속 기록, 기기 식별자(익명), 유입 경로</p>
        <h3>3. 보유 기간</h3>
        <p className="muted">동의 철회 시 또는 수집일로부터 1년. 동의 기록은 분쟁 대응을 위해 3년간 보관합니다.</p>
        <h3>4. 제3자 제공</h3>
        <p className="muted">{config.thirdPartyRecipients ? `별도 동의한 경우에 한해 ${config.thirdPartyRecipients}에 제공합니다.` : "회사는 개인정보를 제3자에게 제공하지 않습니다."}</p>
        <h3>5. 처리 위탁</h3>
        <p className="muted">클라우드 데이터베이스(Supabase), 문자 발송(SOLAPI), AI 답변 생성(Anthropic — 대화 내용 중 개인정보는 마스킹 후 전송)</p>
        <h3>6. 정보주체의 권리</h3>
        <p className="muted">언제든 열람·정정·삭제·처리정지·동의 철회를 요청할 수 있습니다. 아래 양식 또는 개인정보 보호책임자에게 요청하세요.</p>
        <h3>7. 개인정보 보호책임자</h3>
        <p className="muted">성명: (입력) / 연락처: (입력)</p>
      </div>
      <h2 id="request">내 정보 삭제 · 수신 거부 요청</h2>
      <PrivacyRequest />
    </main>
  );
}
