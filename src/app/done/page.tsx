import Link from "next/link";

export default function Done() {
  return (
    <main>
      <h1>상담 신청이 접수됐어요 🙌</h1>
      <p className="muted">영업일 기준 24시간 안에 전문가가 연락드릴게요. 기다리는 동안 미리 준비하면 좋은 것:</p>
      <div className="card">
        <ul>
          <li>최근 3년 병원·약국 영수증 (사진도 OK)</li>
          <li>가입한 보험 목록 — 신용정보원 ‘내보험다보여’에서 무료 조회</li>
          <li>궁금한 점 메모</li>
        </ul>
      </div>
      <div className="grid">
        <Link href="/ask" className="btn btn-ghost">AI에게 먼저 물어보기</Link>
        <Link href="/claim" className="btn btn-ghost">청구 가이드 보기</Link>
      </div>
    </main>
  );
}
