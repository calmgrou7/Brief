import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="card stack">
      <h1 style={{ fontSize: 20 }}>찾을 수 없습니다</h1>
      <p className="muted">삭제됐거나 주소가 잘못된 업체입니다.</p>
      <Link href="/companies" className="btn" style={{ justifySelf: 'start' }}>업체 목록으로</Link>
    </div>
  );
}
