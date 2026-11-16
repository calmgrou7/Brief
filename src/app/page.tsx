import Link from "next/link";

export default function Home() {
  return (
    <main>
      <h1>내 보험, 받을 돈은<br />다 받고 계세요?</h1>
      <p className="muted">8가지 질문으로 놓친 보험금과 보장 공백을 30초 만에 점검해 드려요. 가입 없이 무료.</p>
      <div className="stat" style={{ margin: "20px 0" }}>
        <div><b>30초</b><span className="small">점검 시간</span></div>
        <div><b>3년</b><span className="small">지난 진료도 청구 가능</span></div>
        <div><b>0원</b><span className="small">점검·상담 비용</span></div>
      </div>
      <Link href="/check" className="btn btn-primary">30초 보험 점검 시작</Link>

      <h2>이런 것도 할 수 있어요</h2>
      <div className="grid">
        <Link href="/ask" className="card link">
          <h3>💬 AI에게 보험 물어보기</h3>
          <p className="muted">“용종 떼면 수술비 나와요?” 궁금한 걸 바로 물어보세요.</p>
        </Link>
        <Link href="/claim" className="card link">
          <h3>📄 보험금 청구 가이드</h3>
          <p className="muted">통원·입원·수술·골절·교통사고별 필요 서류와 절차.</p>
        </Link>
        <Link href="/consult" className="card link">
          <h3>🙋 전문가 무료 상담</h3>
          <p className="muted">내 증권을 직접 보고 청구·보장을 확인해 드려요.</p>
        </Link>
      </div>
    </main>
  );
}
